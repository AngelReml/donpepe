/**
 * Cliente Google Business Profile (GBP).
 *
 * Hasta que Google aprueba el acceso a la API, el sistema corre en
 * "modo simulación" usando /data/sample-reviews.json — el cron sigue
 * ejecutándose y el dueño puede practicar el flujo end-to-end.
 *
 * Cuando llegue la aprobación:
 *  1. Rellenar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.
 *  2. Poner GOOGLE_REVIEWS_ENABLED=true.
 *  3. La implementación real usa el endpoint
 *     https://mybusiness.googleapis.com/v4/{name=accounts/<id>/locations/<id>}/reviews
 *     (v4.9 sigue siendo la vigente para replies en 2026).
 */
import fs from "node:fs";
import path from "node:path";

export interface GbpReview {
  id: string;
  author?: string;
  rating: number;
  text: string;
  time: string;
}

const SIMULATED = (process.env.GOOGLE_REVIEWS_ENABLED ?? "false").toLowerCase() !== "true";

export function isSimulated(): boolean {
  return SIMULATED;
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

/** Lista reseñas nuevas. En simulación devuelve las que aún no están en "seen". */
export async function listReviews(seen: Set<string>): Promise<GbpReview[]> {
  if (SIMULATED) {
    const file = path.join(process.cwd(), "data", "sample-reviews.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as { reviews: GbpReview[] };
    return raw.reviews.filter((r) => !seen.has(r.id));
  }
  const accessToken = await getAccessToken();
  const locationId = process.env.GOOGLE_LOCATION_ID;
  if (!locationId) throw new Error("Falta GOOGLE_LOCATION_ID.");
  const url = `https://mybusiness.googleapis.com/v4/${locationId}/reviews`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GBP list ${res.status}: ${t}`);
  }
  const json = (await res.json()) as { reviews?: any[] };
  return (json.reviews ?? []).map((r) => ({
    id: String(r.name ?? r.reviewId),
    author: r.reviewer?.displayName,
    rating: Number(r.starRating ?? r.rating ?? 0),
    text: String(r.comment ?? r.reviewReply?.comment ?? ""),
    time: String(r.createTime ?? r.updateTime ?? new Date().toISOString()),
  }));
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  if (SIMULATED) {
    // En simulación, sólo logueamos.
    console.log(`[sim] reply to ${reviewId}: ${reply}`);
    return;
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
    throw new Error(`GBP reply ${res.status}: ${t}`);
  }
}
