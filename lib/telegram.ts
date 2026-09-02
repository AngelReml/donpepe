/**
 * Adaptador de transporte para Telegram. Hermano de lib/whatsapp.ts, mismo
 * papel (verificar que la petición es de verdad del proveedor, traducir su
 * formato a algo que el resto del sistema entienda, mandar la respuesta),
 * pero fichero aparte: lib/whatsapp.ts no se toca.
 *
 * Igual que allí, el token y el secreto del webhook salen del entorno y no
 * se imprimen ni se registran nunca.
 */
import crypto from "node:crypto";

const API_BASE = "https://api.telegram.org/bot";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Falta TELEGRAM_BOT_TOKEN en el entorno.");
  return t;
}

function apiUrl(metodo: string): string {
  return `${API_BASE}${token()}/${metodo}`;
}

/** Compara sin filtrar por tiempo y sin reventar si las longitudes difieren. */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Telegram manda este secreto en cada petición al webhook, tal como se lo
 * diste al llamar a setWebhook. Si no coincide, o si no está configurado, la
 * petición no viene de Telegram (o el webhook no está bien registrado):
 * en ambos casos, se rechaza. Sin esto, cualquiera que acierte la URL del
 * webhook podría hacerse pasar por el dueño y reescribir la carta — el mismo
 * riesgo que documenta lib/whatsapp.ts para su propia firma.
 */
export function verificarSecretToken(req: Request): boolean {
  const esperado = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!esperado) return false;
  const recibido = req.headers.get("x-telegram-bot-api-secret-token");
  if (!recibido) return false;
  return igualesEnTiempoConstante(recibido, esperado);
}

/**
 * Lista cerrada de chat_id autorizados. Mismo patrón que
 * lib/whatsapp.ts:isAllowedNumber -> si la variable falta o está vacía, la
 * lista queda vacía y CUALQUIER chat_id da "no autorizado". Nunca abierto
 * por defecto.
 */
export function isAllowedChatId(chatId: string): boolean {
  const permitidos = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);
  const normalizado = chatId.replace(/\D/g, "");
  return normalizado.length > 0 && permitidos.includes(normalizado);
}

export interface BotonInline {
  text: string;
  callback_data: string;
}
export type TecladoInline = { inline_keyboard: BotonInline[][] };

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
}
export interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: TelegramMessage;
  from: { id: number };
}
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export function parseUpdate(cuerpo: string): TelegramUpdate {
  return JSON.parse(cuerpo) as TelegramUpdate;
}

async function llamar(metodo: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(apiUrl(metodo), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // El cuerpo de error de Telegram no lleva secretos, es seguro registrarlo.
    const detalle = await res.text().catch(() => "");
    throw new Error(`Telegram API ${metodo} falló (${res.status}): ${detalle.slice(0, 300)}`);
  }
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  teclado?: TecladoInline,
): Promise<void> {
  await llamar("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: teclado,
  });
}

export async function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  teclado?: TecladoInline,
): Promise<void> {
  await llamar("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: teclado,
  });
}

/** Quita el "reloj de carga" del botón que se acaba de tocar. */
export async function answerCallbackQuery(callbackQueryId: string, texto?: string): Promise<void> {
  await llamar("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(texto ? { text: texto } : {}),
  });
}

/** Sanity check de conectividad/token: no expone el token, solo confirma que responde. */
export async function getMe(): Promise<{ ok: boolean; username?: string }> {
  const res = await fetch(apiUrl("getMe"));
  const json = (await res.json()) as { ok: boolean; result?: { username?: string } };
  return { ok: json.ok === true, username: json.result?.username };
}
