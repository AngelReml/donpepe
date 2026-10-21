/**
 * Cola de reseñas pendientes de responder, guardada en KV.
 *
 * Dos modos, un solo motor:
 *  - Backlog: las reseñas históricas sin responder, de la peor a la mejor.
 *  - Guardia: las nuevas que trae el cron diario.
 *
 * No hay base de datos aparte: KV ya está en el proyecto y esto son tres
 * claves. Todo lo que se publica queda además en el log de KV.
 */
import { kvGet, kvSet, appendLog, KV_KEYS } from "./kv";
import { listReviews, type GbpReview } from "./google";

const CLAVE_COLA = "resenas:cola";
const CLAVE_HECHAS = "resenas:hechas";
const CLAVE_BORRADOR = "resenas:borrador";

/** Una cola de más de una hora se considera vieja y se vuelve a pedir. */
const COLA_TTL_MS = 60 * 60 * 1000;

/**
 * publicada: ya está en Google. aprobada: el dueño la ha dado por buena pero
 * aún hay que pasarla a la ficha (modo manual). saltada: no se contesta.
 */
export type EstadoResena = "publicada" | "aprobada" | "saltada";

/** Lo justo de la reseña para encontrarla luego en la ficha y publicarla. */
export interface ReferenciaResena {
  author?: string;
  rating: number;
  time: string;
  text: string;
}

export interface Cola {
  items: GbpReview[];
  generadaEn: number;
}

export interface Hechas {
  /** id de recurso -> qué se hizo con ella */
  registro: Record<
    string,
    { estado: EstadoResena; ts: string; texto?: string; textoEs?: string; resena?: ReferenciaResena }
  >;
}

export interface Borrador {
  review: GbpReview;
  texto: string;
  /** cuántas versiones se han generado ya, para no repetir la misma */
  versiones: number;
  /** textos ya propuestos, para pedirle al modelo algo distinto */
  previos: string[];
  /** true si el dueño está escribiendo su propia versión */
  esperandoTexto?: boolean;
  /** Idioma de la reseña (código ISO de 2 letras). "es" o vacío = castellano. */
  idioma?: string;
  /** Si la reseña no está en castellano: su traducción, para el dueño. */
  resenaEs?: string;
  /** Si la respuesta no va en castellano: su traducción, para el dueño. */
  textoEs?: string;
}

async function getHechas(): Promise<Hechas> {
  return (await kvGet<Hechas>(CLAVE_HECHAS)) ?? { registro: {} };
}

/**
 * Ids que no deben volver a proponerse. Une las de esta cola con la clave
 * `reviews:seen` que ya usaba el cron, para que las dos vías compartan
 * memoria y una reseña saltada por el cron no reaparezca en /resenas.
 */
export async function idsVistos(): Promise<Set<string>> {
  const hechas = await getHechas();
  const legado = (await kvGet<{ ids: string[] }>(KV_KEYS.reviewsSeen)) ?? { ids: [] };
  return new Set<string>([...Object.keys(hechas.registro), ...legado.ids]);
}

/**
 * Orden de trabajo: primero las que más daño hacen. A igualdad de estrellas,
 * la más antigua primero — una queja de hace un año sin contestar es la que
 * lleva más tiempo leyéndose sin respuesta debajo.
 */
function ordenar(items: GbpReview[]): GbpReview[] {
  return [...items].sort((a, b) => {
    if (a.rating !== b.rating) return a.rating - b.rating;
    return String(a.time).localeCompare(String(b.time));
  });
}

export async function refrescarCola(forzar = false): Promise<Cola> {
  const actual = await kvGet<Cola>(CLAVE_COLA);
  if (!forzar && actual && Date.now() - actual.generadaEn < COLA_TTL_MS) {
    return actual;
  }
  const vistos = await idsVistos();
  const items = ordenar(await listReviews(vistos));
  const cola: Cola = { items, generadaEn: Date.now() };
  await kvSet(CLAVE_COLA, cola);
  return cola;
}

/** Quita de la cola en memoria los ids ya resueltos, sin volver a llamar a Google. */
async function colaViva(): Promise<GbpReview[]> {
  const cola = await refrescarCola();
  const vistos = await idsVistos();
  return cola.items.filter((r) => !vistos.has(r.id));
}

export async function siguientePendiente(excluir?: Set<string>): Promise<GbpReview | null> {
  const items = await colaViva();
  return items.find((r) => !excluir?.has(r.id)) ?? null;
}

// ─── Modo prueba ─────────────────────────────────────────────────────────
//
// Solo el dueño decide. El dueño es el PRIMER chat de TELEGRAM_ALLOWED_CHAT_IDS
// (el mismo al que avisa el cron). Cualquier otro chat autorizado ve las
// mismas reseñas y usa los mismos botones, pero lo que toca NO se guarda:
// solo se apunta, para ese chat, que ya la ha visto, y así puede seguir con
// la siguiente. A la cola real del dueño no le pasa nada.

function idsAutorizados(): string[] {
  return (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);
}

export function esDueno(chatId: string): boolean {
  return idsAutorizados()[0] === String(chatId).replace(/\D/g, "");
}

const clavePrueba = (chatId: string) => `resenas:prueba:${chatId}`;

export async function vistasEnPrueba(chatId: string): Promise<Set<string>> {
  return new Set((await kvGet<string[]>(clavePrueba(chatId))) ?? []);
}

export async function apuntarVistaEnPrueba(chatId: string, id: string): Promise<void> {
  const v = await vistasEnPrueba(chatId);
  v.add(id);
  await kvSet(clavePrueba(chatId), [...v]);
}

export async function reiniciarPrueba(chatId: string): Promise<void> {
  await kvSet(clavePrueba(chatId), []);
}

export async function contarPendientes(): Promise<number> {
  return (await colaViva()).length;
}

export async function marcarHecha(
  id: string,
  estado: EstadoResena,
  texto?: string,
  extra: { textoEs?: string; resena?: ReferenciaResena } = {},
): Promise<void> {
  const hechas = await getHechas();
  hechas.registro[id] = { estado, ts: new Date().toISOString(), texto, ...extra };
  await kvSet(CLAVE_HECHAS, hechas);
  await appendLog({
    ts: new Date().toISOString(),
    kind: "review",
    action: estado,
    reviewId: id,
    text: texto,
  });
}

export interface ResumenCola {
  pendientes: number;
  publicadas: number;
  /** aprobadas por el dueño, aún sin pasar a Google (modo manual) */
  aprobadas: number;
  saltadas: number;
}

export interface Aprobada {
  id: string;
  ts: string;
  respuesta: string;
  respuestaEs?: string;
  resena?: ReferenciaResena;
}

/** Las que el dueño aprobó y faltan por publicar en la ficha. */
export async function listarAprobadas(): Promise<Aprobada[]> {
  const hechas = await getHechas();
  return Object.entries(hechas.registro)
    .filter(([, v]) => v.estado === "aprobada")
    .map(([id, v]) => ({ id, ts: v.ts, respuesta: v.texto ?? "", respuestaEs: v.textoEs, resena: v.resena }));
}

/** Tras pegarlas en la ficha: pasan de "aprobada" a "publicada", con el mismo texto. */
export async function marcarPublicadas(ids: string[]): Promise<{ marcadas: number; ignoradas: string[] }> {
  const hechas = await getHechas();
  let marcadas = 0;
  const ignoradas: string[] = [];
  for (const id of ids) {
    const r = hechas.registro[id];
    if (!r || r.estado !== "aprobada") {
      ignoradas.push(id);
      continue;
    }
    hechas.registro[id] = { ...r, estado: "publicada", ts: new Date().toISOString() };
    marcadas++;
  }
  await kvSet(CLAVE_HECHAS, hechas);
  if (marcadas) {
    await appendLog({ ts: new Date().toISOString(), kind: "review", action: "publicadas_a_mano", ids });
  }
  return { marcadas, ignoradas };
}

/** Borra las decisiones tomadas sobre reseñas manuales (para repetir una prueba). */
export async function olvidarDecisionesManuales(): Promise<number> {
  const hechas = await getHechas();
  let n = 0;
  for (const id of Object.keys(hechas.registro)) {
    if (id.startsWith("manual:") && hechas.registro[id].estado !== "publicada") {
      delete hechas.registro[id];
      n++;
    }
  }
  await kvSet(CLAVE_HECHAS, hechas);
  await kvSet(CLAVE_COLA, null);
  return n;
}

export async function resumen(): Promise<ResumenCola> {
  const hechas = await getHechas();
  const valores = Object.values(hechas.registro);
  return {
    pendientes: await contarPendientes(),
    publicadas: valores.filter((v) => v.estado === "publicada").length,
    aprobadas: valores.filter((v) => v.estado === "aprobada").length,
    saltadas: valores.filter((v) => v.estado === "saltada").length,
  };
}

/**
 * Vacía el registro de resueltas y la cola. Solo tiene sentido con las
 * reseñas de ejemplo: sirve para dejar una demostración limpia. En modo real
 * no se usa nunca — borrar el registro haría que se volvieran a proponer
 * reseñas ya respondidas en Google.
 */
export async function reiniciarCola(): Promise<void> {
  await kvSet(CLAVE_HECHAS, { registro: {} } satisfies Hechas);
  await kvSet(KV_KEYS.reviewsSeen, { ids: [] });
  await kvSet(CLAVE_COLA, null);
}

// ─── Borrador en curso, por chat ─────────────────────────────────────────

function claveBorrador(chatId: string): string {
  return `${CLAVE_BORRADOR}:${chatId}`;
}

export async function setBorrador(chatId: string, b: Borrador): Promise<void> {
  await kvSet(claveBorrador(chatId), b);
}

export async function getBorrador(chatId: string): Promise<Borrador | null> {
  return await kvGet<Borrador>(claveBorrador(chatId));
}

export async function clearBorrador(chatId: string): Promise<void> {
  await kvSet(claveBorrador(chatId), null);
}
