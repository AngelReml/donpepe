import { IDIOMAS, CODIGO_IDIOMA, NOMBRE_IDIOMA, ETIQUETA_HTML, type Idioma } from "@/lib/i18n";
import { FilaDeslizable } from "./FilaDeslizable";

/**
 * Enlaces de idioma. Sin estado propio: cada uno pasa por /api/idioma, que
 * guarda la cookie y devuelve aquí. Son 18 -en escritorio se reparten en
 * varias filas dentro de FilaDeslizable, nunca hace falta deslizar-.
 */
export function SelectorIdioma({
  actual,
  volver,
  etiqueta,
}: {
  actual: Idioma;
  volver: string;
  etiqueta: string;
}) {
  return (
    <FilaDeslizable as="nav" label={etiqueta} className="-mx-4 gap-1.5 px-4 sm:mx-0 sm:px-0">
      {IDIOMAS.map((idioma) => {
        const activo = idioma === actual;
        return (
          <a
            key={idioma}
            href={`/api/idioma?lang=${idioma}&volver=${encodeURIComponent(volver)}`}
            hrefLang={ETIQUETA_HTML[idioma]}
            lang={ETIQUETA_HTML[idioma]}
            aria-current={activo ? "true" : undefined}
            title={NOMBRE_IDIOMA[idioma]}
            className={
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide transition-colors " +
              (activo
                ? "border-brasa-500 bg-brasa-500 text-white"
                : "border-carbon-700 bg-carbon-800 text-carbon-300 hover:border-brasa-700/60 hover:text-white")
            }
          >
            <span aria-hidden="true">{CODIGO_IDIOMA[idioma]}</span>
            <span className="sr-only">{NOMBRE_IDIOMA[idioma]}</span>
          </a>
        );
      })}
    </FilaDeslizable>
  );
}
