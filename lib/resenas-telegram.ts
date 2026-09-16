/**
 * Reseñas dentro del MISMO bot de Telegram que ya usa el dueño para la carta.
 *
 * Un gesto y cuatro botones:
 *   ✅ Publicar · 🔄 Otra versión · ✏️ Escribo yo · ⏭️ Saltar
 *
 * Reglas duras:
 *  - Nada se publica sin que el dueño toque "Publicar". Cero automático.
 *  - Una reseña ya respondida en Google no entra en la cola (lo filtra
 *    lib/google.ts) y nunca se pisa una respuesta existente.
 *  - Todo lo publicado queda registrado en el log de KV con fecha y texto.
 */
import { sendMessage, editMessageText, type TecladoInline } from "./telegram";
import { redactarRespuestaResena } from "./resenas-draft";
import { replyToReview, isSimulated, type GbpReview } from "./google";
import {
  siguientePendiente,
  marcarHecha,
  resumen,
  getBorrador,
  setBorrador,
  clearBorrador,
  refrescarCola,
  reiniciarCola,
  type Borrador,
} from "./resenas-cola";

const MAX_TEXTO_RESENA = 600;
const MAX_VERSIONES = 5;

function teclado(): TecladoInline {
  return {
    inline_keyboard: [
      [
        { text: "✅ Publicar", callback_data: "res:pub" },
        { text: "🔄 Otra versión", callback_data: "res:otra" },
      ],
      [
        { text: "✏️ Escribo yo", callback_data: "res:edit" },
        { text: "⏭️ Saltar", callback_data: "res:skip" },
      ],
    ],
  };
}

const TECLADO_VACIO: TecladoInline = { inline_keyboard: [] };

function estrellas(n: number): string {
  const enteras = Math.max(0, Math.min(5, Math.round(n)));
  return "★".repeat(enteras) + "☆".repeat(5 - enteras);
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function recortar(texto: string, max: number): string {
  const t = texto.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function pintar(review: GbpReview, borrador: string, nota?: string): string {
  const cabecera = `${estrellas(review.rating)}  ${review.rating}/5`;
  const quien = review.author ? ` · ${review.author}` : "";
  const cuando = review.time ? ` · ${fechaCorta(review.time)}` : "";
  const cuerpo = review.text
    ? `\n\n"${recortar(review.text, MAX_TEXTO_RESENA)}"`
    : "\n\n(sin texto, solo puntuación)";
  const aviso = isSimulated()
    ? "\n\n· Modo prueba: Google está revisando el permiso para publicar. Al aprobarlo, este mismo botón la publica de verdad."
    : "";
  const extra = nota ? `\n\n${nota}` : "";
  return `${cabecera}${quien}${cuando}${cuerpo}\n\n— Respuesta propuesta —\n${borrador}${extra}${aviso}`;
}

/** Genera el borrador de una reseña y lo deja guardado como borrador en curso. */
async function prepararBorrador(
  chatId: string,
  review: GbpReview,
  previos: string[] = [],
): Promise<Borrador> {
  const draft = await redactarRespuestaResena(review, { evitar: previos });
  const b: Borrador = {
    review,
    texto: draft,
    versiones: previos.length + 1,
    previos: [...previos, draft],
  };
  await setBorrador(chatId, b);
  return b;
}

/** Pantalla principal: la siguiente reseña pendiente, con su borrador. */
export async function mostrarSiguienteResena(chatId: string): Promise<void> {
  const review = await siguientePendiente();
  if (!review) {
    const r = await resumen();
    await sendMessage(
      chatId,
      `No queda ninguna reseña pendiente. 🎉\n\nRespondidas: ${r.publicadas} · Saltadas: ${r.saltadas}`,
    );
    return;
  }
  await sendMessage(chatId, "Preparando la respuesta…");
  try {
    const b = await prepararBorrador(chatId, review);
    await sendMessage(chatId, pintar(review, b.texto), teclado());
  } catch (e) {
    await sendMessage(
      chatId,
      `No he podido redactar la respuesta: ${(e as Error).message}\n\nPrueba otra vez en un minuto con /resenas.`,
    );
  }
}

export async function mostrarEstadoResenas(chatId: string): Promise<void> {
  try {
    await refrescarCola(true);
    const r = await resumen();
    await sendMessage(
      chatId,
      `Reseñas\n\nPendientes: ${r.pendientes}\nRespondidas: ${r.publicadas}\nSaltadas: ${r.saltadas}\n\nEscribe /resenas para seguir.`,
    );
  } catch (e) {
    await sendMessage(chatId, `No he podido consultar las reseñas: ${(e as Error).message}`);
  }
}

/**
 * Deja la cola de ejemplo como recién sacada de la caja. Solo funciona
 * mientras Google no haya aprobado el acceso: con reseñas reales, olvidar lo
 * ya respondido sería volver a proponer respuestas encima de las publicadas.
 */
export async function reiniciarResenas(chatId: string): Promise<void> {
  if (!isSimulated()) {
    await sendMessage(
      chatId,
      "Eso solo se puede hacer en modo prueba. Con las reseñas reales no se borra el historial.",
    );
    return;
  }
  await reiniciarCola();
  await clearBorrador(chatId);
  await sendMessage(chatId, "Cola de prueba reiniciada. Escribe /resenas para empezar de cero.");
}

/** Callbacks "res:*". Devuelve {consumido:false} si el botón no es de aquí. */
export async function manejarCallbackResena(
  chatId: string,
  messageId: number | undefined,
  data: string,
): Promise<{ consumido: boolean }> {
  if (!data.startsWith("res:")) return { consumido: false };

  const b = await getBorrador(chatId);
  if (!b) {
    if (messageId) {
      await editMessageText(
        chatId,
        messageId,
        "Esta reseña ya no está activa. Escribe /resenas para seguir por la siguiente.",
        TECLADO_VACIO,
      );
    }
    return { consumido: true };
  }

  if (data === "res:pub") {
    try {
      await replyToReview(b.review.id, b.texto);
      await marcarHecha(b.review.id, "publicada", b.texto);
      await clearBorrador(chatId);
      if (messageId) {
        await editMessageText(
          chatId,
          messageId,
          `✅ Publicada${isSimulated() ? " (modo prueba)" : ""}\n\n${b.texto}`,
          TECLADO_VACIO,
        );
      }
      await mostrarSiguienteResena(chatId);
    } catch (e) {
      await sendMessage(
        chatId,
        `No he podido publicarla: ${(e as Error).message}\n\nSigue pendiente, no se ha perdido nada.`,
      );
    }
    return { consumido: true };
  }

  if (data === "res:otra") {
    if (b.versiones >= MAX_VERSIONES) {
      await sendMessage(
        chatId,
        "Ya van cinco versiones. Toca ✏️ Escribo yo y dímelo con tus palabras, que sale antes.",
      );
      return { consumido: true };
    }
    try {
      const nuevo = await prepararBorrador(chatId, b.review, b.previos);
      if (messageId) {
        await editMessageText(
          chatId,
          messageId,
          pintar(b.review, nuevo.texto, `Versión ${nuevo.versiones}.`),
          teclado(),
        );
      }
    } catch (e) {
      await sendMessage(chatId, `No he podido generar otra versión: ${(e as Error).message}`);
    }
    return { consumido: true };
  }

  if (data === "res:edit") {
    await setBorrador(chatId, { ...b, esperandoTexto: true });
    await sendMessage(
      chatId,
      "Escríbeme la respuesta tal cual quieres que salga y te la dejo lista para publicar.",
    );
    return { consumido: true };
  }

  if (data === "res:skip") {
    await marcarHecha(b.review.id, "saltada");
    await clearBorrador(chatId);
    if (messageId) {
      await editMessageText(chatId, messageId, "⏭️ Saltada, sin responder.", TECLADO_VACIO);
    }
    await mostrarSiguienteResena(chatId);
    return { consumido: true };
  }

  return { consumido: true };
}

/**
 * Si el dueño ha tocado "Escribo yo", el siguiente mensaje de texto es su
 * respuesta. Devuelve true si lo ha consumido (y entonces el webhook no debe
 * pasárselo al agente de la carta).
 */
export async function manejarTextoResena(chatId: string, texto: string): Promise<boolean> {
  const b = await getBorrador(chatId);
  if (!b?.esperandoTexto) return false;

  const propio = texto.trim();
  if (!propio) {
    await sendMessage(chatId, "No me ha llegado texto. Escríbeme la respuesta.");
    return true;
  }

  await setBorrador(chatId, { ...b, texto: propio, esperandoTexto: false });
  await sendMessage(chatId, pintar(b.review, propio, "Tu versión."), teclado());
  return true;
}
