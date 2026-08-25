import { NextRequest, NextResponse } from "next/server";
import { getLog } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto la carta puede servir un menú viejo aunque el dueño
// acabe de cambiar un precio por WhatsApp.
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pass = url.searchParams.get("pass") ?? req.headers.get("x-admin-pass") ?? "";
  if (!process.env.QR_ADMIN_PASS || pass !== process.env.QR_ADMIN_PASS) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const log = await getLog();
  return NextResponse.json({ log }, { headers: { "cache-control": "no-store" } });
}
