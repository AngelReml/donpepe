import { NextRequest, NextResponse } from "next/server";
import { getMenu } from "@/lib/kv";
import { traducirDescripciones } from "@/lib/traducir";
import { IDIOMAS, IDIOMA_POR_DEFECTO, type Idioma } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto la carta puede servir un menú viejo aunque el dueño
// acabe de cambiar un precio por WhatsApp.
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/**
 * Rellena la caché de traducciones. La carta nunca traduce: solo lee de aquí.
 *
 * Un idioma por llamada, para no agotar el tiempo de la función. Protegido con
 * la misma contraseña que el panel de QR: cada llamada que no acierte en caché
 * cuesta dinero al dueño.
 */
function autorizado(req: NextRequest): boolean {
  const pass = process.env.QR_ADMIN_PASS;
  if (!pass) return false;
  const cabecera = req.headers.get("authorization") ?? "";
  if (!cabecera.startsWith("Basic ")) return false;
  try {
    const [, suministrada] = Buffer.from(cabecera.slice(6), "base64").toString("utf-8").split(":");
    return suministrada === pass;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="traducciones"' },
    });
  }

  const pedido = new URL(req.url).searchParams.get("lang");
  const idiomas: Idioma[] =
    pedido && (IDIOMAS as readonly string[]).includes(pedido)
      ? [pedido as Idioma]
      : IDIOMAS.filter((i) => i !== IDIOMA_POR_DEFECTO);

  const menu = await getMenu();
  const frases = [
    ...menu.entrantes, ...menu.arroces, ...menu.pescados, ...menu.carnes,
  ]
    .map((p) => p.descripcion ?? "")
    .filter(Boolean);

  const resumen: Record<string, { total: number; traducidas: number }> = {};
  for (const idioma of idiomas) {
    const mapa = await traducirDescripciones(frases, idioma);
    const traducidas = frases.filter((f) => (mapa.get(f) ?? f) !== f).length;
    resumen[idioma] = { total: frases.length, traducidas };
  }

  return NextResponse.json({ ok: true, frases: frases.length, resumen });
}
