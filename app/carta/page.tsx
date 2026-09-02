import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { MenuView, MenusView } from "@/components/MenuView";
import { SelectorIdioma } from "@/components/SelectorIdioma";
import { BarraAcciones } from "@/components/BarraAcciones";
import { ENLACES_LEGALES } from "@/lib/legal";
import { kvListAppend } from "@/lib/kv";
import { menuConReactivacionAutomatica } from "@/lib/agotados";
import type { Menu, PlatoBase } from "@/lib/types";
import { traducirDescripciones } from "@/lib/traducir";
import {
  COOKIE_IDIOMA,
  ETIQUETA_HTML,
  IDIOMAS,
  conMesa,
  elegirIdioma,
  textos,
} from "@/lib/i18n";

export const dynamic = "force-dynamic";
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto la carta puede servir un menú viejo aunque el dueño
// acabe de cambiar un precio por WhatsApp.
export const fetchCache = "force-no-store";

interface SearchParams {
  mesa?: string;
  lang?: string;
}

/** El idioma sale de la petición, así que los metadatos también. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const idioma = idiomaDePeticion(searchParams);
  const t = textos(idioma);
  return {
    title: t.metaTitulo,
    description: t.metaDescripcion,
    alternates: {
      canonical: "/carta",
      languages: Object.fromEntries(
        IDIOMAS.map((i) => [ETIQUETA_HTML[i], `/carta?lang=${i}`]),
      ),
    },
  };
}

function idiomaDePeticion(searchParams: SearchParams) {
  return elegirIdioma({
    // x-idioma lo fija el middleware; ?lang= sigue valiendo si aquél no corrió
    parametro: headers().get("x-idioma") ?? searchParams?.lang,
    cookie: cookies().get(COOKIE_IDIOMA)?.value,
    cabecera: headers().get("accept-language"),
  });
}

export default async function CartaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Reconcilia contra el registro de "agotado con caducidad" (lib/agotados.ts)
  // antes de servir la carta: si algo caducó, vuelve solo, sin esperar a que
  // el dueño toque el bot.
  const menu: Menu = await menuConReactivacionAutomatica();
  const idioma = idiomaDePeticion(searchParams);
  const t = textos(idioma);

  // Mismos teléfonos que usa el resto del sitio (Horario, JSON-LD): el fijo
  // llama, el móvil recibe el WhatsApp con el mensaje ya escrito.
  const telefonoReserva = process.env.NEXT_PUBLIC_PHONE ?? "34881829728";
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? process.env.NEXT_PUBLIC_PHONE_MOBILE ?? "34696434042";

  // Solo lecturas de caché: la carta no llama nunca al traductor. Lo que no
  // esté traducido sale en español, y /api/traducciones lo rellena aparte.
  const platos: PlatoBase[] = [
    ...menu.entrantes, ...menu.arroces, ...menu.pescados, ...menu.carnes,
  ];
  // Las tarjetas de menú también llevan frases de sala —cuándo está disponible,
  // qué incluye— que no son nombres de plato. Se pintaban en crudo, así que un
  // alemán leía "Inbegriffen: Pan, postre, agua, copa de vino de la casa":
  // rótulo traducido pegado a una frase española.
  const frasesMenu = menu.menus
    .filter((m) => !m.disabled)
    .flatMap((m) => [m.disponibilidad, m.incluye, m.no_incluye])
    .filter((f): f is string => Boolean(f && f.trim()));

  const descripciones: Record<string, string> = {};
  const origen = platos.map((p) => p.descripcion ?? "").filter(Boolean);
  const traducidas = await traducirDescripciones(
    [...origen, ...frasesMenu],
    idioma,
    { soloCache: true },
  );
  for (const p of platos) {
    const d = p.descripcion;
    if (d) descripciones[p.id] = traducidas.get(d) ?? d;
  }
  const frases: Record<string, string> = {};
  for (const f of frasesMenu) frases[f] = traducidas.get(f) ?? f;

  const mesa = searchParams?.mesa
    ? String(searchParams.mesa).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24)
    : "";

  // log anónimo de escaneo QR (sin PII)
  if (mesa) {
    await kvListAppend("qr:scans", { mesa, ts: new Date().toISOString(), idioma });
  }

  // volver a esta misma carta tras cambiar de idioma, conservando la mesa
  const volver = mesa ? `/carta?mesa=${encodeURIComponent(mesa)}` : "/carta";

  return (
    <main className="mx-auto max-w-3xl space-y-12 px-4 pb-28 pt-10 sm:px-6 sm:pb-32 sm:pt-14">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brasa-300">
            {t.marca}
          </p>
          <h1 className="font-display text-3xl text-white sm:text-4xl">{t.tituloCarta}</h1>
          {mesa ? (
            <p className="text-sm text-carbon-300">{conMesa(t.mesaBienvenida, mesa)}</p>
          ) : null}
        </div>
        <SelectorIdioma actual={idioma} volver={volver} etiqueta={t.selectorIdioma} />
      </header>

      <MenuView menu={menu} t={t} descripciones={descripciones} />

      <section className="space-y-6">
        <h2 className="font-display text-2xl text-white sm:text-3xl">{t.seccionMenus}</h2>
        <MenusView menus={menu.menus} t={t} frases={frases} />
      </section>

      <footer className="space-y-3 border-t border-carbon-800 pt-6 text-xs text-carbon-500">
        <p>{t.pieCartaViva}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a href="/local" className="text-brasa-300 underline-offset-4 hover:underline">
            {t.descubreLocal}
          </a>
          <a href="/aviso-legal" className="text-brasa-300 underline-offset-4 hover:underline">
            {ENLACES_LEGALES[idioma].aviso}
          </a>
          <a href="/privacidad" className="text-brasa-300 underline-offset-4 hover:underline">
            {ENLACES_LEGALES[idioma].privacidad}
          </a>
        </p>
      </footer>

      <BarraAcciones
        telefonoReserva={telefonoReserva}
        whatsapp={whatsapp}
        mensajeWhatsapp={t.whatsappMensaje}
        etiquetaReservar={t.reservar}
      />
    </main>
  );
}
