import { NextRequest, NextResponse } from "next/server";
import { isKvLive, kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import { listReviews, isSimulated } from "@/lib/google";
import { buildReviewDraft } from "@/lib/orchestrator";
import { getProvider } from "@/lib/whatsapp";
import { setPending } from "@/lib/pending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto la carta puede servir un menú viejo aunque el dueño
// acabe de cambiar un precio por WhatsApp.
export const fetchCache = "force-no-store";
// Vercel cron: 15 min
export const maxDuration = 60;

const ALLOWED_PROCESSED_PER_HOUR = 20;

interface RateState {
  hour: string; // "2026-08-11T09"
  count: number;
}

async function getRateState(): Promise<RateState> {
  const hour = new Date().toISOString().slice(0, 13);
  const cur = (await kvGet<RateState>(`reviews:rate`)) ?? { hour, count: 0 };
  if (cur.hour !== hour) return { hour, count: 0 };
  return cur;
}

async function bumpRate(): Promise<RateState> {
  const next = await getRateState();
  next.count += 1;
  await kvSet(`reviews:rate`, next);
  return next;
}

async function getOwnerNumber(): Promise<string | null> {
  const allowed = (process.env.WHATSAPP_ALLOWED_NUMBERS ?? "")
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean);
  return allowed[0] ?? null;
}

export async function GET(req: NextRequest) {
  // Vercel añade `Authorization: Bearer $CRON_SECRET` a las llamadas del cron.
  // Falla cerrada: esta ruta gasta LLM y, con Google activado, publica
  // respuestas publicas en las reseñas del local. Si el secreto no está
  // configurado no se ejecuta, en lugar de quedar abierta a cualquiera.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("/api/reviews/poll sin CRON_SECRET: petición rechazada");
    return new NextResponse("Forbidden", { status: 403 });
  }
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${cronSecret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const owner = await getOwnerNumber();
  if (!owner) {
    return NextResponse.json(
      { ok: false, reason: "WHATSAPP_ALLOWED_NUMBERS vacío" },
      { status: 400 },
    );
  }

  const rate = await getRateState();
  const remaining = ALLOWED_PROCESSED_PER_HOUR - rate.count;
  if (remaining <= 0) {
    return NextResponse.json({ ok: true, skipped: "rate-limit", rate });
  }

  const seenRecord =
    (await kvGet<{ ids: string[] }>(KV_KEYS.reviewsSeen)) ?? { ids: [] };
  const seenIds = new Set<string>(seenRecord.ids);

  const all = await listReviews(seenIds);
  const fresh = all.slice(0, remaining);
  const provider = getProvider();
  const summary = {
    simulated: isSimulated(),
    kvLive: isKvLive(),
    total: all.length,
    processed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  for (const r of fresh) {
    try {
      const draft = await buildReviewDraft(r);
      const stars = "⭐".repeat(Math.max(0, Math.min(5, r.rating)));
      const header = `Nueva reseña de Google ${stars} (${r.rating}/5)`;
      const body =
        `${r.author ? `Autor: ${r.author}\n` : ""}` +
        `Texto: "${r.text}"\n\n` +
        `Borrador propuesto:\n"${draft.draft}"\n\n` +
        `Responde PUBLICAR, EDITAR: <tu texto>, o NO para saltar.`;
      await provider.sendText(owner, `${header}\n\n${body}`);
      await setPending(owner, {
        action: { action: "clarify", question: "" },
        summary: draft.draft,
        context: "review",
        reviewId: r.id,
      });
      seenRecord.ids.push(r.id);
      await bumpRate();
      summary.processed += 1;
    } catch (e) {
      summary.errors.push({ id: r.id, error: (e as Error).message });
    }
  }
  await kvSet(KV_KEYS.reviewsSeen, seenRecord);
  return NextResponse.json({ ok: true, ...summary });
}
