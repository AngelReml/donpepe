import { NextRequest, NextResponse } from "next/server";
import { getMenu } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto la carta puede servir un menú viejo aunque el dueño
// acabe de cambiar un precio por WhatsApp.
export const fetchCache = "force-no-store";

export async function GET(_req: NextRequest) {
  const menu = await getMenu();
  return NextResponse.json(menu, {
    headers: { "cache-control": "no-store" },
  });
}
