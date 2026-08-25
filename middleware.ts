import { NextRequest, NextResponse } from "next/server";
import { COOKIE_IDIOMA, IDIOMA_POR_DEFECTO, elegirIdioma } from "@/lib/i18n";

/**
 * Decide el idioma una sola vez por petición.
 *
 * En "/" sirve la portada estática que toca (public/inicio.<idioma>.html), que
 * se genera con scripts/generar-portada.mjs.
 *
 * En "/carta" pasa el idioma en una cabecera, porque el layout raíz —donde vive
 * <html lang> — no recibe los parámetros de la URL: sin esto, /carta?lang=de
 * servía el cuerpo en alemán con lang="es-ES", justo lo que rompe el hreflang.
 */
export const config = { matcher: ["/", "/carta", "/aviso-legal", "/privacidad"] };

export function middleware(req: NextRequest) {
  const idioma = elegirIdioma({
    parametro: req.nextUrl.searchParams.get("lang"),
    cookie: req.cookies.get(COOKIE_IDIOMA)?.value,
    cabecera: req.headers.get("accept-language"),
  });

  if (req.nextUrl.pathname === "/") {
    const fichero = idioma === IDIOMA_POR_DEFECTO ? "/inicio.html" : `/inicio.${idioma}.html`;
    const res = NextResponse.rewrite(new URL(fichero, req.url));
    // Sin esto el CDN guarda la primera respuesta de "/" y se la sirve a todo
    // el mundo: un italiano recibía la portada en español porque un español
    // había entrado antes.
    res.headers.set("Vary", "Accept-Language, Cookie");
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  }

  const cabeceras = new Headers(req.headers);
  cabeceras.set("x-idioma", idioma);
  return NextResponse.next({ request: { headers: cabeceras } });
}
