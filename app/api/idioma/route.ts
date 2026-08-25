import { NextRequest, NextResponse } from "next/server";
import { IDIOMAS, COOKIE_IDIOMA } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guarda el idioma elegido a mano y devuelve al visitante a donde estaba.
 * Es un enlace normal, así que funciona sin JavaScript.
 */
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const idioma = url.searchParams.get("lang");

  // El destino no se "valida": se reconstruye. Comprobar prefijos no basta
  // ("//evil.com" pasaba el filtro y acababa fuera del sitio), así que de lo
  // que llega solo se conservan dos cosas, ambas saneadas: a cuál de las dos
  // páginas con selector se vuelve, y el número de mesa.
  const RUTAS_CON_SELECTOR = new Set(["/", "/carta"]);
  let destino = new URL("/carta", url.origin);
  try {
    const pedido = new URL(url.searchParams.get("volver") ?? "/carta", url.origin);
    // Solo el nombre de la ruta, y solo si está en la lista. La URL se vuelve
    // a construir desde nuestro propio origen, así que "//evil.com" acaba en
    // "https://donpepeoriginal.es/" y no fuera del sitio.
    const ruta = RUTAS_CON_SELECTOR.has(pedido.pathname) ? pedido.pathname : "/carta";
    destino = new URL(ruta, url.origin);
    const mesa = (pedido.searchParams.get("mesa") ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
    if (mesa && ruta === "/carta") destino.searchParams.set("mesa", mesa);
  } catch {
    // destino se queda en /carta
  }

  const res = NextResponse.redirect(destino, 303);
  if (idioma && (IDIOMAS as readonly string[]).includes(idioma)) {
    res.cookies.set(COOKIE_IDIOMA, idioma, {
      path: "/",
      // 30 días, no un año: si alguien pulsa un idioma sin querer, el error se
      // corrige solo en un mes en vez de quedarse pegado toda una temporada.
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  return res;
}
