import { NextRequest, NextResponse } from "next/server";
import { getLog } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto la carta puede servir un menú viejo aunque el dueño
// acabe de cambiar un precio por WhatsApp.
export const fetchCache = "force-no-store";

// Mismo patrón que /api/qr, /api/qr/pdf, /api/qr/resenas y /api/qr/cartel:
// la contraseña viaje solo por cabecera (Basic Auth, que el navegador pide
// solo y recuerda) o por la cookie de sesión de /qr. Antes iba también como
// ?pass= en la URL, y una URL con la contraseña dentro queda escrita en los
// logs del servidor, en el historial del navegador y en la cabecera Referer
// de cualquier enlace que se siga desde ahí.
function authOk(req: NextRequest): boolean {
  const pass = process.env.QR_ADMIN_PASS;
  if (!pass) return false;
  if (req.cookies.get("qr_admin")?.value === "1") return true;
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [, p] = Buffer.from(header.slice(6), "base64").toString("utf-8").split(":");
      if (p === pass) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="qr-admin"' },
    });
  }
  const log = await getLog();
  return NextResponse.json({ log }, { headers: { "cache-control": "no-store" } });
}
