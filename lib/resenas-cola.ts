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

export type EstadoResena = "publicada" | "saltada";

export interface Cola {
  items: GbpReview[];
  generadaEn: number;
}

export interface Hechas {
  /** id de recurso -> qué se hizo con ella */
  registro: Record<string, { estado: EstadoResena; ts: string; texto?: string }>;
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

export async function siguientePendiente(): Promise<GbpReview | null> {
  const items = await colaViva();
  return items[0] ?? null;
}

export async function contarPendientes(): Promise<number> {
  return (await colaViva()).length;
}

export async function marcarHecha(
  id: string,
  estado: EstadoResena,
  texto?: string,
): Promise<void> {
  const hechas = await getHechas();
  hechas.registro[id] = { estado, ts: new Date().toISOString(), texto };
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
  saltadas: number;
}

export async function resumen(): Promise<ResumenCola> {
  const hechas = await getHechas();
  const valores = Object.values(hechas.registro);
  return {
    pendientes: await contarPendientes(),
    publicadas: valores.filter((v) => v.estado === "publicada").length,
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
