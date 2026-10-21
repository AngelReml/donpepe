/**
 * Reseñas cargadas a mano, mientras Google no abra la API de reseñas (v4).
 *
 * Quien las carga (con el navegador, desde la ficha del local) las manda a
 * /api/reviews/manual. Aquí solo se guardan, sin duplicados. El resto del
 * sistema (cola, Telegram, cron) las trata igual que las que vendrían de
 * Google: mismo orden, mismos botones.
 *
 * El id se calcula del autor, la fecha y el texto, así que cargar dos veces
 * la misma reseña no la duplica.
 */
import { createHash } from "node:crypto";
import { kvGet, kvSet } from "./kv";
import type { GbpReview } from "./google";

const CLAVE = "resenas:manuales";

export interface EntradaManual {
  author?: string;
  rating: number;
  text: string;
  /** Fecha tal como la sepamos (ISO, o texto tipo "hace 2 semanas"). */
  time?: string;
}

export function idManual(r: EntradaManual): string {
  const base = [r.author ?? "", r.time ?? "", (r.text ?? "").trim()].join("|");
  return `manual:${createHash("sha1").update(base).digest("hex").slice(0, 16)}`;
}

export async function listarManuales(): Promise<GbpReview[]> {
  return (await kvGet<GbpReview[]>(CLAVE)) ?? [];
}

export async function cargarManuales(
  entradas: EntradaManual[],
): Promise<{ nuevas: number; yaEstaban: number; total: number }> {
  const actuales = await listarManuales();
  const ids = new Set(actuales.map((r) => r.id));
  let nuevas = 0;
  let yaEstaban = 0;
  for (const e of entradas) {
    const id = idManual(e);
    if (ids.has(id)) {
      yaEstaban++;
      continue;
    }
    ids.add(id);
    actuales.push({
      id,
      author: e.author,
      rating: e.rating,
      text: (e.text ?? "").trim(),
      time: e.time ?? new Date().toISOString(),
    });
    nuevas++;
  }
  await kvSet(CLAVE, actuales);
  return { nuevas, yaEstaban, total: actuales.length };
}
