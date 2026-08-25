import { IDIOMAS, CODIGO_IDIOMA, NOMBRE_IDIOMA, ETIQUETA_HTML, type Idioma } from "@/lib/i18n";

/**
 * Enlaces de idioma. Sin estado ni JavaScript: cada uno pasa por
 * /api/idioma, que guarda la cookie y devuelve aquí.
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
    <nav aria-label={etiqueta} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
    </nav>
  );
}
