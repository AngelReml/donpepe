import { KV_KEYS, kvGet, kvSet, kvDel } from "./kv";
import type { Action } from "./actions";

export interface PendingEntry {
  from: string;
  action: Action;
  summary: string;
  createdAt: number;
  /** qué keyword del tipo SÍ/NO se matching */
  context: "menu" | "review" | "info";
  /** si context=review, aquí va el id de la reseña en juego */
  reviewId?: string;
}

const TEN_MIN = 10 * 60 * 1000;

export async function setPending(from: string, entry: Omit<PendingEntry, "from" | "createdAt">): Promise<void> {
  const key = `${KV_KEYS.pendingActions}:${from}`;
  const value: PendingEntry = { ...entry, from, createdAt: Date.now() };
  await kvSet(key, value);
}

export async function getPending(from: string): Promise<PendingEntry | null> {
  const key = `${KV_KEYS.pendingActions}:${from}`;
  const v = await kvGet<PendingEntry>(key);
  if (!v) return null;
  if (Date.now() - v.createdAt > TEN_MIN) {
    await kvDel(key);
    return null;
  }
  return v;
}

export async function clearPending(from: string): Promise<void> {
  const key = `${KV_KEYS.pendingActions}:${from}`;
  await kvDel(key);
}

export const CONFIRM_TTL_MS = TEN_MIN;

const POSITIVE = ["si", "sí", "s", "vale", "ok", "okay", "confirma", "confirmar", "confirmo", "adelante", "procede", "proceder", "aplica", "aplicar", "hazlo", "hecho", "ok", "okay"];
const NEGATIVE = ["no", "n", "cancelar", "cancela", "espera", "para", "stop", "nope", "anular", "anula"];

export function classifyReply(text: string): "yes" | "no" | "edit" | "other" {
  const t = text.trim().toLowerCase();
  if (/^editar[:\s]/i.test(text)) return "edit";
  if (POSITIVE.includes(t) || /^s(i|í)?[\s.,!]?$/.test(t)) return "yes";
  if (NEGATIVE.includes(t)) return "no";
  return "other";
}
