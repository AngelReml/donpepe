import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { modoResenas } from "@/lib/google";
import { cargarManuales } from "@/lib/resenas-manuales";
import {
  listarAprobadas,
  marcarPublicadas,
  olvidarDecisionesManuales,
  refrescarCola,
  resumen,
} from "@/lib/resenas-cola";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Puente para las reseñas mientras Google no abra su API de reseñas.
 *
 *  GET  → estado + respuestas aprobadas por el dueño pendientes de publicar.
 *  POST {accion:"cargar", resenas:[{author, rating, text, time}]}
 *       → mete reseñas (copiadas de la ficha) en la cola del bot. Sin duplicados.
 *  POST {accion:"publicadas", ids:[…]}
 *       → tras pegarlas en la ficha: pasan de "aprobada" a "publicada".
 *  POST {accion:"olvidar_decisiones"}
 *       → borra aprobaciones/saltos de reseñas manuales (para repetir una prueba).
 *
 * Autenticación: Authorization: Bearer $RESENAS_ADMIN_TOKEN. Falla cerrada:
 * sin la variable configurada no responde a nadie.
 */
function autorizado(req: NextRequest): boolean {
  const token = process.env.RESENAS_ADMIN_TOKEN;
  if (!token || token.length < 24) return false;
  const recibido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recibido);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const Entrada = z.object({
  author: z.string().max(120).optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(5000).default(""),
  time: z.string().max(60).optional(),
});

const Cuerpo = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("cargar"), resenas: z.array(Entrada).min(1).max(500) }),
  z.object({ accion: z.literal("publicadas"), ids: z.array(z.string().max(80)).min(1).max(500) }),
  z.object({ accion: z.literal("olvidar_decisiones") }),
]);

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return new NextResponse("Forbidden", { status: 403 });
  return NextResponse.json({
    modo: modoResenas(),
    resumen: await resumen(),
    aprobadas: await listarAprobadas(),
  });
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return new NextResponse("Forbidden", { status: 403 });
  if (modoResenas() !== "manual") {
    return NextResponse.json({ error: `modo ${modoResenas()}: esta ruta solo sirve en modo manual` }, { status: 409 });
  }
  const parsed = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "cuerpo no válido", detalle: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const c = parsed.data;
  if (c.accion === "cargar") {
    const r = await cargarManuales(c.resenas);
    await refrescarCola(true);
    return NextResponse.json({ ok: true, ...r, resumen: await resumen() });
  }
  if (c.accion === "publicadas") {
    const r = await marcarPublicadas(c.ids);
    return NextResponse.json({ ok: true, ...r, resumen: await resumen() });
  }
  const n = await olvidarDecisionesManuales();
  await refrescarCola(true);
  return NextResponse.json({ ok: true, olvidadas: n, resumen: await resumen() });
}
