import { NextRequest, NextResponse } from "next/server";
import {
  verificarSecretToken,
  isAllowedChatId,
  parseUpdate,
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  setMyCommands,
} from "@/lib/telegram";
import {
  mostrarMenuPrincipal,
  mostrarPantallaAgotados,
  manejarTextoAsistente,
  manejarCallback,
  tecladoConfirmar,
  claveBorrarTambienMenus,
} from "@/lib/telegram-wizard";
import {
  manejarCallbackMenus,
  manejarTextoMenus,
  limpiarEstadoMenus,
  aplicarCambio,
  menusQueLlevan,
} from "@/lib/telegram-menus";
import { menuConReactivacionAutomatica } from "@/lib/agotados";
import {
  mostrarSiguienteResena,
  mostrarEstadoResenas,
  reiniciarResenas,
  manejarCallbackResena,
  manejarTextoResena,
} from "@/lib/resenas-telegram";
import { handleOwnerMessage } from "@/lib/orchestrator";
import { getPending } from "@/lib/pending";
import { kvGet, kvSet, kvDel } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_AUTORIZADO_TEXT = "Este bot es privado, de uso exclusivo del dueño del local.";

/**
 * El menú que sale al pulsar "/" se registra solo, la primera vez que el
 * dueño escribe algo. Así no hace falta ni entrar en BotFather ni exponer el
 * token en ningún sitio. La marca en KV evita repetir la llamada; si algo
 * falla, se ignora: es un adorno, no puede tumbar un mensaje real.
 */
const CLAVE_COMANDOS = "telegram:comandos:v2";

async function asegurarMenuComandos(): Promise<void> {
  try {
    if (await kvGet<boolean>(CLAVE_COMANDOS)) return;
    await setMyCommands([
      { command: "plato", description: "Cambiar la carta y los menus: precios y platos" },
      { command: "agotados", description: "Marcar un plato como agotado" },
      { command: "resenas", description: "Responder las resenas de Google" },
    ]);
    await kvSet(CLAVE_COMANDOS, true);
  } catch (e) {
    console.warn("no se pudo registrar el menu de comandos", e);
  }
}
const TECLADO_VACIO = { inline_keyboard: [] as never[] };

export async function GET() {
  // Telegram no hace el hand-shake de verificación por GET que sí hace Meta:
  // el webhook se registra aparte, con una llamada a setWebhook. Esto es
  // solo un ping de salud para comprobar que la ruta está desplegada.
  return NextResponse.json({ ok: true, canal: "telegram" });
}

export async function POST(req: NextRequest) {
  if (!verificarSecretToken(req)) {
    console.warn("webhook de Telegram rechazado: secret_token ausente o incorrecto");
    return NextResponse.json({ error: "secret_token no válido" }, { status: 401 });
  }

  const cuerpo = await req.text();
  let update;
  try {
    update = parseUpdate(cuerpo);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    if (update.callback_query) {
      await procesarCallback(update.callback_query);
    } else if (update.message) {
      await procesarMensaje(update.message);
    }
  } catch (e) {
    console.error("telegram webhook: fallo procesando update", e);
  }

  return NextResponse.json({ ok: true });
}

async function procesarCallback(cq: NonNullable<Awaited<ReturnType<typeof parseUpdate>>["callback_query"]>) {
  const chatId = String(cq.message?.chat.id ?? cq.from.id);
  const messageId = cq.message?.message_id;
  const data = cq.data ?? "";

  if (!isAllowedChatId(chatId)) {
    await answerCallbackQuery(cq.id, "No autorizado.").catch(() => {});
    return;
  }

  // Telegram puede reenviar el mismo toque de botón si el primer intento no
  // le confirma rápido (o el dueño, con mala cobertura, toca dos veces). Sin
  // esto, un doble toque hacía que el segundo viera el estado del asistente
  // ya cambiado por el primero y respondiera "esto ya no está activo" -no
  // corrompía nada, pero confundía-. callback_query.id es único por toque:
  // si ya se procesó, se contesta el botón y no se hace nada más.
  const claveToqueVisto = `telegram:cb-visto:${cq.id}`;
  if (await kvGet<boolean>(claveToqueVisto)) {
    await answerCallbackQuery(cq.id).catch(() => {});
    return;
  }
  await kvSet(claveToqueVisto, true);

  // Solo quita el "reloj de carga" del botón: es cosmético. Si esta llamada
  // falla (Telegram raro, red, lo que sea) NO puede tirar abajo el resto del
  // procesamiento -confirmar o cancelar una acción real no puede depender de
  // un detalle de UI-, así que su error se ignora aposta.
  await answerCallbackQuery(cq.id).catch(() => {});

  // Borrar un plato de la carta Y de los menús donde sale con el mismo
  // nombre. Primero se confirma el borrado de la carta por el camino de
  // siempre (handleOwnerMessage, sin tocarlo); solo si el plato ya no está
  // en la carta se quita también de los menús.
  if (data === "w:rmboth") {
    const nombre = await kvGet<string>(claveBorrarTambienMenus(chatId));
    await kvDel(claveBorrarTambienMenus(chatId));
    const { reply } = await handleOwnerMessage("sí", chatId);
    let extra = "";
    if (nombre) {
      const menu = await menuConReactivacionAutomatica();
      const sigueEnCarta = [menu.entrantes, menu.arroces, menu.pescados, menu.carnes]
        .flat()
        .some((p) => p.nombre === nombre);
      if (!sigueEnCarta && menusQueLlevan(menu, nombre).length > 0) {
        extra = "\n\n" + (await aplicarCambio(chatId, { tipo: "quitar_de_todos", nombre }));
      }
    }
    if (messageId) await editMessageText(chatId, messageId, reply + extra, TECLADO_VACIO);
    else await sendMessage(chatId, reply + extra);
    return;
  }

  if (data === "conf:yes" || data === "conf:no") {
    await kvDel(claveBorrarTambienMenus(chatId));
    // Agotar/reactivar ya no pasa por aquí -es de un toque, sin confirmar,
    // ver lib/telegram-wizard.ts-. Esto solo confirma o cancela alta de
    // plato, cambio de precio o borrado definitivo.
    const { reply } = await handleOwnerMessage(data === "conf:yes" ? "sí" : "no", chatId);
    if (messageId) await editMessageText(chatId, messageId, reply, TECLADO_VACIO);
    else await sendMessage(chatId, reply);
    return;
  }

  // Reseñas primero: usan el prefijo "res:" y no pasan por el asistente
  // de la carta, que solo entiende "w:".
  const resena = await manejarCallbackResena(chatId, messageId, data);
  if (resena.consumido) return;

  // Menús del día: prefijo "m:".
  const menus = await manejarCallbackMenus(chatId, messageId, data, () => mostrarMenuPrincipal(chatId));
  if (menus.consumido) return;

  const { consumido } = await manejarCallback(chatId, messageId, data);
  if (!consumido) {
    // callback_data que no reconocemos: no hacemos nada silenciosamente raro.
    await sendMessage(chatId, "No he entendido ese botón. Escribe /plato para empezar de nuevo.");
  }
}

async function procesarMensaje(msg: NonNullable<Awaited<ReturnType<typeof parseUpdate>>["message"]>) {
  const chatId = String(msg.chat.id);

  if (!isAllowedChatId(chatId)) {
    try {
      await sendMessage(chatId, NO_AUTORIZADO_TEXT);
    } catch (e) {
      console.error("send blocked reply failed", e);
    }
    return;
  }

  await asegurarMenuComandos();

  const texto = msg.text;
  if (!texto) {
    await sendMessage(chatId, "Solo entiendo texto y los botones. Escribe /plato para empezar.");
    return;
  }

  if (/^\/(start|plato)(@\w+)?$/i.test(texto.trim())) {
    await limpiarEstadoMenus(chatId);
    await mostrarMenuPrincipal(chatId);
    return;
  }
  if (/^\/agotados?(@\w+)?$/i.test(texto.trim())) {
    await mostrarPantallaAgotados(chatId);
    return;
  }
  // Singular y plural, con ñ o sin ella, con barra o sin ella: Antonio no
  // tiene por qué acordarse de la forma exacta, y la ñ no se puede registrar
  // en BotFather aunque Telegram sí la deje escribir.
  if (/^\/?rese(n|ñ)as?(@\w+)?\s+reiniciar$/i.test(texto.trim())) {
    await reiniciarResenas(chatId);
    return;
  }
  if (/^\/?rese(n|ñ)as?(@\w+)?\s+estado$/i.test(texto.trim())) {
    await mostrarEstadoResenas(chatId);
    return;
  }
  if (/^\/?rese(n|ñ)as?(@\w+)?$/i.test(texto.trim())) {
    // Sin API de Google, las reseñas son las cargadas a mano (reales). Las de
    // ejemplo solo salen con RESENAS_DEMO=true. Ver modoResenas().
    await mostrarSiguienteResena(chatId);
    return;
  }

  // ¿Ha tocado "Escribo yo" en una reseña? Entonces este texto es su
  // respuesta, no una orden para la carta.
  if (await manejarTextoResena(chatId, texto)) return;

  // ¿Está el asistente de menús esperando un precio o un nombre de plato?
  if (await manejarTextoMenus(chatId, texto)) return;

  // ¿Está el asistente de botones esperando este texto (nombre, precio, nota)?
  const consumido = await manejarTextoAsistente(chatId, texto);
  if (consumido) return;

  // Si no, es texto libre: la MISMA función que usa WhatsApp, sin cambios.
  try {
    const { reply } = await handleOwnerMessage(texto, chatId);
    // Si handleOwnerMessage ha dejado una acción de menú pendiente (venga del
    // LLM o de lo que sea), añadimos los botones de confirmar/cancelar en vez
    // de obligar al dueño a teclear "sí"/"no". No tocamos handleOwnerMessage
    // para saberlo: solo miramos si ha quedado algo pendiente, con la misma
    // función que ya usa el propio orquestador.
    const pending = await getPending(chatId);
    const teclado = pending?.context === "menu" ? tecladoConfirmar() : undefined;
    await sendMessage(chatId, reply, teclado);
  } catch (e) {
    console.error("telegram owner message failed", e);
    try {
      await sendMessage(chatId, "Ups, ha fallado algo por mi parte. Inténtalo de nuevo en un minuto.");
    } catch {
      // ignore
    }
  }
}
