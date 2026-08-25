/**
 * KV adapter — wraps @vercel/kv but degrades to a local in-memory + JSON file
 * fallback so the project still runs in dev and on any Vercel-less preview.
 *
 * In production, set KV_REST_API_URL and KV_REST_API_TOKEN (auto-injected when
 * you link the Vercel KV integration). In dev or when env vars are missing,
 * we fall back to /data/menu.json and an in-memory map that lives for the
 * lifetime of the server process.
 */
import fs from "node:fs";
import path from "node:path";
import { Menu } from "./types";

const MENU_KEY = "menu:current";
const LOG_KEY = "menu:log";
const REVIEWS_SEEN_KEY = "reviews:seen";
const PENDING_ACTIONS_KEY = "whatsapp:pending";

const memoryStore = new Map<string, unknown>();
let kvClient: typeof import("@vercel/kv").kv | null = null;

function hasKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getKv(): Promise<typeof import("@vercel/kv").kv | null> {
  if (!hasKvEnv()) return null;
  if (kvClient) return kvClient;
  try {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv;
    return kvClient;
  } catch {
    return null;
  }
}

export function isKvLive(): boolean {
  return hasKvEnv();
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const kv = await getKv();
  if (kv) {
    const v = (await kv.get<T>(key)) ?? null;
    return v;
  }
  return (memoryStore.get(key) as T) ?? null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const kv = await getKv();
  if (kv) {
    await kv.set(key, value);
    return;
  }
  memoryStore.set(key, value);
}

export async function kvDel(key: string): Promise<void> {
  const kv = await getKv();
  if (kv) {
    await kv.del(key);
    return;
  }
  memoryStore.delete(key);
}

/** LIST semantics: array push/get with cap. */
export async function kvListAppend<T>(key: string, item: T, max = 200): Promise<T[]> {
  const kv = await getKv();
  if (kv) {
    const current = ((await kv.get<T[]>(key)) ?? []) as T[];
    const next = [item, ...current].slice(0, max);
    await kv.set(key, next);
    return next;
  }
  const current = ((memoryStore.get(key) as T[] | undefined) ?? []) as T[];
  const next = [item, ...current].slice(0, max);
  memoryStore.set(key, next);
  return next;
}

export async function kvListGet<T>(key: string): Promise<T[]> {
  return ((await kvGet<T[]>(key)) ?? []) as T[];
}

// ─── Menu specific ───────────────────────────────────────────

function readSeedMenu(): Menu {
  const file = path.join(process.cwd(), "data", "menu.json");
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as Menu;
}

export async function getMenu(): Promise<Menu> {
  const cached = await kvGet<Menu>(MENU_KEY);
  if (cached) return cached;
  const seed = readSeedMenu();
  await kvSet(MENU_KEY, seed);
  return seed;
}

export async function setMenu(menu: Menu): Promise<void> {
  await kvSet(MENU_KEY, menu);
}

export async function appendLog(entry: unknown): Promise<void> {
  await kvListAppend(LOG_KEY, entry, 200);
}

export async function getLog<T = unknown>(): Promise<T[]> {
  return kvListGet<T>(LOG_KEY);
}

export async function getLastLog<T = unknown>(): Promise<T | null> {
  const list = await kvListGet<T>(LOG_KEY);
  return list[0] ?? null;
}

export const KV_KEYS = {
  menu: MENU_KEY,
  log: LOG_KEY,
  reviewsSeen: REVIEWS_SEEN_KEY,
  pendingActions: PENDING_ACTIONS_KEY,
} as const;
