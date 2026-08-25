import Link from "next/link";
import {
  ENLACES_LEGALES,
  ETIQUETAS_TITULAR,
  FALTA_DATO,
  REGIMEN,
  TITULAR,
  type PaginaLegal,
} from "@/lib/legal";
import type { Idioma } from "@/lib/i18n";

const ORDEN_TITULAR = [
  "titular",
  "nombreComercial",
  "nif",
  "regimen",
  "domicilio",
  "telefonos",
  "email",
] as const;

/**
 * Presentación común del aviso legal y la política de privacidad. Misma retícula
 * y misma tipografía que /carta: son páginas de la misma casa, no un anexo.
 */
export function VistaLegal({
  pagina,
  idioma,
  otra,
}: {
  pagina: PaginaLegal;
  idioma: Idioma;
  /** La otra página legal, para poder saltar de una a otra. */
  otra: { href: string; texto: string };
}) {
  const etiquetas = ETIQUETAS_TITULAR[idioma];
  const enlaces = ENLACES_LEGALES[idioma];

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brasa-300">
          Don Pepe Original
        </p>
        <h1 className="font-display text-3xl text-white sm:text-4xl">{pagina.titulo}</h1>
        <p className="max-w-prose text-sm leading-relaxed text-carbon-300">
          {pagina.entradilla}
        </p>
      </header>

      <div className="space-y-8">
        {pagina.bloques.map((bloque) => (
          <section key={bloque.h} className="space-y-3">
            <h2 className="font-display text-xl text-white sm:text-2xl">{bloque.h}</h2>

            {bloque.titular ? (
              <dl className="divide-y divide-carbon-800 rounded-lg border border-carbon-800 bg-carbon-900/40 text-sm">
                {ORDEN_TITULAR.map((clave) => {
                  const valor = clave === "regimen" ? REGIMEN[idioma] : TITULAR[clave];
                  const pendiente = valor === FALTA_DATO;
                  return (
                    <div
                      key={clave}
                      className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                    >
                      <dt className="shrink-0 text-carbon-400 sm:w-48">{etiquetas[clave]}</dt>
                      <dd
                        className={
                          pendiente
                            ? "font-mono text-xs uppercase tracking-wide text-brasa-300"
                            : "text-carbon-100"
                        }
                      >
                        {clave === "email" && !pendiente ? (
                          <a href={`mailto:${valor}`} className="underline-offset-4 hover:underline">
                            {valor}
                          </a>
                        ) : (
                          valor
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}

            {bloque.p?.map((parrafo) => (
              <p key={parrafo.slice(0, 40)} className="max-w-prose text-sm leading-relaxed text-carbon-300">
                {parrafo}
              </p>
            ))}
          </section>
        ))}
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-carbon-800 pt-6 text-xs text-carbon-500">
        <span>
          {enlaces.actualizado}: {pagina.actualizado}
        </span>
        <Link href={otra.href} className="text-brasa-300 underline-offset-4 hover:underline">
          {otra.texto}
        </Link>
        <Link href="/carta" className="text-brasa-300 underline-offset-4 hover:underline">
          {enlaces.volver}
        </Link>
      </footer>
    </main>
  );
}
