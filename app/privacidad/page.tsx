import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { VistaLegal } from "@/components/VistaLegal";
import { PRIVACIDAD, ENLACES_LEGALES } from "@/lib/legal";
import { COOKIE_IDIOMA, ETIQUETA_HTML, IDIOMAS, elegirIdioma } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface SearchParams {
  lang?: string;
}

function idiomaDePeticion(searchParams: SearchParams) {
  return elegirIdioma({
    parametro: headers().get("x-idioma") ?? searchParams?.lang,
    cookie: cookies().get(COOKIE_IDIOMA)?.value,
    cabecera: headers().get("accept-language"),
  });
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const idioma = idiomaDePeticion(searchParams);
  return {
    title: PRIVACIDAD[idioma].titulo,
    description: PRIVACIDAD[idioma].entradilla,
    alternates: {
      canonical: "/privacidad",
      languages: Object.fromEntries(
        IDIOMAS.map((i) => [ETIQUETA_HTML[i], `/privacidad?lang=${i}`]),
      ),
    },
    robots: { index: true, follow: true },
  };
}

export default function PrivacidadPage({ searchParams }: { searchParams: SearchParams }) {
  const idioma = idiomaDePeticion(searchParams);
  return (
    <VistaLegal
      pagina={PRIVACIDAD[idioma]}
      idioma={idioma}
      otra={{ href: "/aviso-legal", texto: ENLACES_LEGALES[idioma].aviso }}
    />
  );
}
