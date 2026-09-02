import { NextRequest, NextResponse } from "next/server";
import { COOKIE_IDIOMA, IDIOMA_POR_DEFECTO, elegirIdioma } from "@/lib/i18n";

/**
 * Decide el idioma una sola vez por petición, y decide qué ve cada ruta.
 *
 * La home es la carta. Quien entra por el dominio raíz, o por un QR ya
 * plastificado que apunte a quién sabe qué URL, tiene que caer en la carta:
 * es lo único que quiere alguien sentado a la mesa. El escaparate (la portada
 * de diseño, public/inicio.<idioma>.html) no se borra, sigue vivo en /local,
 * enlazado al pie de la carta.
 *
 * Cualquier ruta que no reconocemos —una antigua, una adivinada, la que sea
 * que lleve el QR ya impreso si algún día apuntó a otro sitio— redirige
 * también a la carta. Así el QR funciona apunte a donde apunte, sin
 * reimprimir nada.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};

/** Rutas reales de la app, servidas tal cual (con el idioma ya resuelto). */
const RUTAS_CONOCIDAS = new Set(["/carta", "/aviso-legal", "/privacidad"]);

/**
 * La carta ya tiene 18 idiomas (lib/i18n.ts), pero el escaparate estático de
 * /local (scripts/generar-portada.mjs) todavía solo genera estos 6 -ampliarlo
 * a los 18 es trabajo aparte, pendiente-. Sin esta lista, pedir /local en un
 * idioma nuevo (ej. coreano) intentaría servir public/inicio.ko.html, que no
 * existe: 404 en vez de escaparate. Con ella, cae a español, que sí existe.
 */
const IDIOMAS_CON_PORTADA_ESTATICA = new Set(["gl", "en", "pt", "de", "fr", "it"]);

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // El panel de administración de QR no depende del idioma del visitante y no
  // debe redirigirse nunca: es una herramienta del dueño, no una página del
  // menú público.
  if (pathname === "/qr" || pathname.startsWith("/qr/")) {
    return NextResponse.next();
  }

  const idioma = elegirIdioma({
    parametro: req.nextUrl.searchParams.get("lang"),
    cookie: req.cookies.get(COOKIE_IDIOMA)?.value,
    cabecera: req.headers.get("accept-language"),
  });

  // "/" → la carta. Se reescribe (no se redirige) para que el dominio raíz
  // siga mostrándose limpio en la barra de direcciones; el <link rel=canonical>
  // que ya pone /carta en su metadata apunta a la URL real igualmente.
  if (pathname === "/") {
    const cabeceras = new Headers(req.headers);
    cabeceras.set("x-idioma", idioma);
    const res = NextResponse.rewrite(new URL(`/carta${search}`, req.url), {
      request: { headers: cabeceras },
    });
    res.headers.set("Vary", "Accept-Language, Cookie");
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  }

  // "/local" → el escaparate de siempre, la portada de diseño estática.
  // Mismo mecanismo que tenía "/" antes de este cambio.
  if (pathname === "/local") {
    const idiomaConPortada = IDIOMAS_CON_PORTADA_ESTATICA.has(idioma) ? idioma : IDIOMA_POR_DEFECTO;
    const fichero = idiomaConPortada === IDIOMA_POR_DEFECTO ? "/inicio.html" : `/inicio.${idiomaConPortada}.html`;
    const res = NextResponse.rewrite(new URL(fichero, req.url));
    res.headers.set("Vary", "Accept-Language, Cookie");
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  }

  if (RUTAS_CONOCIDAS.has(pathname)) {
    const cabeceras = new Headers(req.headers);
    cabeceras.set("x-idioma", idioma);
    return NextResponse.next({ request: { headers: cabeceras } });
  }

  // Cualquier otra ruta: no la servimos, así que en vez de un 404 mandamos a
  // la carta. Cubre tanto URLs antiguas como cualquier variante que lleve
  // grabada un QR ya impreso.
  return NextResponse.redirect(new URL(`/carta${search}`, req.url), 307);
}
