import type { PlatoBase } from "@/lib/types";
import type { Textos } from "@/lib/i18n";
import { formatPlatoPrecio } from "@/lib/format";
import { FotoPlato } from "./FotoPlato";

/**
 * Los arroces, arriba del todo y en su propia sección destacada: es la
 * especialidad de la casa, y hay reseñas de peregrinos que dicen buscar
 * arroz por Galicia y no encontrarlo -el mayor diferenciador del local-.
 * Siguen apareciendo también dentro de las pestañas normales de MenuView;
 * esto es un adelanto, no un reemplazo.
 */
export function SeccionArroces({
  arroces,
  t,
  descripciones = {},
  nombresSecundarios = {},
}: {
  arroces: PlatoBase[];
  t: Textos;
  descripciones?: Record<string, string>;
  nombresSecundarios?: Record<string, string>;
}) {
  const list = arroces.filter((p) => !p.disabled);
  if (list.length === 0) return null;

  return (
    <section
      aria-labelledby="arroces-destacado-title"
      className="rounded-xl border border-brasa-500/50 bg-gradient-to-b from-brasa-900/30 to-carbon-900/20 p-5 sm:p-6"
    >
      <span className="inline-block rounded-full bg-brasa-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {t.especialidadArroces}
      </span>
      <h2 id="arroces-destacado-title" className="mt-2 font-display text-2xl text-white sm:text-3xl">
        {t.categorias.arroces}
      </h2>
      <ul className="mt-4 divide-y divide-carbon-800/60">
        {list.map((p) => (
          <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            {p.imagen ? <FotoPlato src={p.imagen} alt={p.nombre} /> : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <span className="flex-1">
                  <span className="block text-base text-carbon-50">{p.nombre}</span>
                  {nombresSecundarios[p.id] ? (
                    <span className="block text-xs text-carbon-400">{nombresSecundarios[p.id]}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-base tabular-nums text-brasa-300">
                  {formatPlatoPrecio(p)}
                </span>
              </div>
              {descripciones[p.id] ? (
                <p className="mt-1 text-sm leading-snug text-carbon-400">{descripciones[p.id]}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
