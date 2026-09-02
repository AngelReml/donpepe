import { NextRequest, NextResponse } from "next/server";
import {
  verificarSecretToken,
  isAllowedChatId,
  parseUpdate,
  sendMessage,
  editMessageText,
  answerCallbackQuery,
} from "@/lib/telegram";
import {
  mostrarMenuPrincipal,
  mostrarPantallaAgotados,
  manejarTextoAsistente,
  manejarCallback,
  tecladoConfirmar,
} from "@/lib/telegram-wizard";
import { handleOwnerMessage } from "@/lib/orchestrator";
import { getPending } from "@/lib/pending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_AUTORIZADO_TEXT = "Este bot es privado, de uso exclusivo del dueño del local.";
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
  // Solo quita el "reloj de carga" del botón: es cosmético. Si esta llamada
  // falla (Telegram raro, red, lo que sea) NO puede tirar abajo el resto del
  // procesamiento -confirmar o cancelar una acción real no puede depender de
  // un detalle de UI-, así que su error se ignora aposta.
  await answerCallbackQuery(cq.id).catch(() => {});

  if (data === "conf:yes" || data === "conf:no") {
    // Agotar/reactivar ya no pasa por aquí -es de un toque, sin confirmar,
    // ver lib/telegram-wizard.ts-. Esto solo confirma o cancela alta de
    // plato, cambio de precio o borrado definitivo.
    const { reply } = await handleOwnerMessage(data === "conf:yes" ? "sí" : "no", chatId);
    if (messageId) await editMessageText(chatId, messageId, reply, TECLADO_VACIO);
    else await sendMessage(chatId, reply);
    return;
  }

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

  const texto = msg.text;
  if (!texto) {
    await sendMessage(chatId, "Solo entiendo texto y los botones. Escribe /plato para empezar.");
    return;
  }

  if (/^\/(start|plato)(@\w+)?$/i.test(texto.trim())) {
    await mostrarMenuPrincipal(chatId);
    return;
  }
  if (/^\/agotados?(@\w+)?$/i.test(texto.trim())) {
    await mostrarPantallaAgotados(chatId);
    return;
  }

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
