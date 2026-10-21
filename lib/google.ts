/**
 * Cliente Google Business Profile (GBP).
 *
 * Hasta que Google aprueba el acceso a la API, el sistema corre en
 * "modo simulación" usando /data/sample-reviews.json — el cron sigue
 * ejecutándose y el dueño puede practicar el flujo end-to-end.
 *
 * Solicitud de acceso enviada el 4-sep-2026 (caso 6-5498000041620), proyecto
 * de Google Cloud `zapweave-resenas` (número 2608613113). Cuando llegue la
 * aprobación:
 *  1. Rellenar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.
 *  2. Poner GOOGLE_REVIEWS_ENABLED=true.
 *  3. GOOGLE_LOCATION_ID con el formato accounts/<id>/locations/<id>.
 *
 * El endpoint de reseñas sigue siendo el v4 (es el único que las expone):
 *   GET https://mybusiness.googleapis.com/v4/{location}/reviews
 *   PUT https://mybusiness.googleapis.com/v4/{review}/reply
 */
import fs from "node:fs";
import path from "node:path";

export interface GbpReview {
  /** Nombre completo del recurso: accounts/x/locations/y/reviews/z. Es lo que
   *  hay que pasarle a replyToReview: el id corto NO sirve para responder. */
  id: string;
  author?: string;
  rating: number;
  text: string;
  time: string;
  /** true si el local ya respondió. Estas nunca entran en la cola. */
  yaRespondida?: boolean;
}

const SIMULADO = (process.env.GOOGLE_REVIEWS_ENABLED ?? "false").toLowerCase() !== "true";

export function isSimulated(): boolean {
  return SIMULADO;
}

/**
 * De dónde salen las reseñas y qué pasa al aprobar una:
 *  - "real":   API de Google. Aprobar = publicar en Google al momento.
 *  - "manual": cargadas a mano (lib/resenas-manuales.ts). Aprobar = queda
 *              guardada como "aprobada" para publicarla luego en la ficha.
 *  - "demo":   reseñas de ejemplo (data/sample-reviews.json), para enseñar
 *              el flujo. Se activa con RESENAS_DEMO=true.
 * Se lee en cada llamada (no al importar) para que los tests puedan elegir.
 */
export type ModoResenas = "real" | "manual" | "demo";
export function modoResenas(): ModoResenas {
  if (!SIMULADO) return "real";
  return process.env.RESENAS_DEMO === "true" ? "demo" : "manual";
}

/**
 * Google devuelve la puntuación como palabra ("FIVE"), no como número.
 * Number("FIVE") es NaN, y con NaN la reseña entra en la cola con 0 estrellas
 * y el borrador se redacta como si fuera una queja. De ahí este mapa.
 */
const ESTRELLAS: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export function parseStarRating(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const porNombre = ESTRELLAS[valor.trim().toUpperCase()];
    if (porNombre) return porNombre;
    const n = Number(valor);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return n;
  }
  return 0;
}

async function getAccessToken(): Promise<string> {
  const refresh = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!refresh || !clientId || !clientSecret) {
    throw new Error("Faltan credenciales de Google Business Profile.");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google token ${res.status}: ${t}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

function normalizar(raw: any, locationId: string): GbpReview {
  // `name` ya viene completo en v4; si faltara, lo componemos, porque sin el
  // nombre completo del recurso no se puede publicar la respuesta.
  const nombre =
    typeof raw?.name === "string" && raw.name.includes("/reviews/")
      ? raw.name
      : `${locationId}/reviews/${raw?.reviewId ?? ""}`;

  // OJO: reviewReply.comment es NUESTRA propia respuesta, no la reseña. Usarlo
  // como texto de la reseña hacía que el borrador se redactara sobre lo que ya
  // habíamos contestado nosotros.
  const texto = typeof raw?.comment === "string" ? raw.comment : "";

  return {
    id: nombre,
    author: raw?.reviewer?.displayName ?? undefined,
    rating: parseStarRating(raw?.starRating ?? raw?.rating),
    text: texto,
    time: String(raw?.updateTime ?? raw?.createTime ?? new Date().toISOString()),
    yaRespondida: Boolean(raw?.reviewReply?.comment),
  };
}

/**
 * Trae TODAS las reseñas del local, paginando. Descarta las que ya tienen
 * respuesta publicada y las que están en `vistas`.
 *
 * En modo real la versión anterior devolvía la lista entera sin filtrar por
 * `vistas`: el cron cogía las 20 primeras y volvía a proponer las mismas 20
 * cada día, indefinidamente.
 */
export async function listReviews(vistas: Set<string>): Promise<GbpReview[]> {
  if (modoResenas() === "manual") {
    const { listarManuales } = await import("./resenas-manuales");
    return (await listarManuales()).filter((r) => !vistas.has(r.id) && !r.yaRespondida);
  }
  if (SIMULADO) {
    const file = path.join(process.cwd(), "data", "sample-reviews.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as { reviews: GbpReview[] };
    return raw.reviews.filter((r) => !vistas.has(r.id) && !r.yaRespondida);
  }

  const locationId = process.env.GOOGLE_LOCATION_ID;
  if (!locationId) throw new Error("Falta GOOGLE_LOCATION_ID.");
  const accessToken = await getAccessToken();

  const todas: GbpReview[] = [];
  let pageToken: string | undefined;
  // Tope de seguridad: 20 páginas de 50 son 1.000 reseñas. Suficiente de sobra
  // y evita un bucle infinito si la API devolviera siempre el mismo token.
  for (let pagina = 0; pagina < 20; pagina++) {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${locationId}/reviews`);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GBP list ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { reviews?: any[]; nextPageToken?: string };
    for (const r of json.reviews ?? []) todas.push(normalizar(r, locationId));

    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }

  return todas.filter((r) => !r.yaRespondida && !vistas.has(r.id));
}

/** Igual que listReviews pero sin filtrar: para el recuento del dashboard. */
export async function listAllReviews(): Promise<GbpReview[]> {
  if (modoResenas() === "manual") {
    const { listarManuales } = await import("./resenas-manuales");
    return listarManuales();
  }
  if (SIMULADO) {
    const file = path.join(process.cwd(), "data", "sample-reviews.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as { reviews: GbpReview[] };
    return raw.reviews;
  }
  return listReviews(new Set<string>());
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  if (SIMULADO) {
    console.log(`[sim] reply to ${reviewId}: ${reply}`);
    return;
  }
  if (!reviewId.includes("/reviews/")) {
    throw new Error(
      `Nombre de reseña inválido: "${reviewId}". Hace falta el recurso completo accounts/x/locations/y/reviews/z.`,
    );
  }
  const accessToken = await getAccessToken();
  const url = `https://mybusiness.googleapis.com/v4/${reviewId}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ comment: reply }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GBP reply ${res.status}: ${t.slice(0, 300)}`);
  }
}
