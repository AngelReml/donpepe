"use client";

import { useState } from "react";
import type { Menu, CategoriaMenu } from "@/lib/types";
import type { Textos } from "@/lib/i18n";
import { formatPrice, formatPlatoPrecio } from "@/lib/format";
import { FotoPlato } from "./FotoPlato";
import { FilaDeslizable } from "./FilaDeslizable";

const TABS: CategoriaMenu[] = ["entrantes", "arroces", "pescados", "carnes"];

export function MenuView({
  menu,
  t,
  descripciones = {},
  nombresSecundarios = {},
}: {
  menu: Menu;
  t: Textos;
  /** id de plato -> descripción ya en el idioma del visitante */
  descripciones?: Record<string, string>;
  /** id de plato -> traducción del NOMBRE (solo si existe una buena); el nombre real sigue siendo el principal */
  nombresSecundarios?: Record<string, string>;
}) {
  const [tab, setTab] = useState<CategoriaMenu>("entrantes");
  const list = (menu[tab] ?? []).filter((p) => !p.disabled);

  return (
    <section aria-label={t.etiquetaCarta} className="space-y-6">
      {menu.aviso ? (
        <div
          role="status"
          className="rounded-md border border-brasa-700/60 bg-brasa-900/40 px-4 py-3 text-sm text-brasa-100"
        >
          {menu.aviso}
        </div>
      ) : null}

      <FilaDeslizable
        role="tablist"
        label={t.etiquetaCategorias}
        className="-mx-4 gap-2 px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {TABS.map((cat) => {
          const active = cat === tab;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(cat)}
              className={
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-brasa-500 bg-brasa-500 text-white shadow-brasa"
                  : "border-carbon-700 bg-carbon-800 text-carbon-200 hover:border-brasa-700/60 hover:text-white")
              }
            >
              {t.categorias[cat]}
            </button>
          );
        })}
      </FilaDeslizable>

      <ul
        role="tabpanel"
        aria-label={t.categorias[tab]}
        className="divide-y divide-carbon-800 rounded-lg border border-carbon-800 bg-carbon-900/40"
      >
        {list.length === 0 ? (
          <li className="px-4 py-6 text-sm text-carbon-300">{t.sinPlatos}</li>
        ) : (
          list.map((p) => {
            const secundario = nombresSecundarios[p.id];
            return (
              <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                {p.imagen ? <FotoPlato src={p.imagen} alt={p.nombre} /> : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="flex-1">
                      <span className="block text-base text-carbon-50">{p.nombre}</span>
                      {secundario ? (
                        <span className="block text-xs text-carbon-400">{secundario}</span>
                      ) : null}
                    </span>
                    {p.nota ? (
                      <span className="hidden text-xs uppercase tracking-wide text-carbon-400 sm:inline">
                        {p.nota}
                      </span>
                    ) : null}
                    <span className="shrink-0 font-mono text-base tabular-nums text-brasa-300">
                      {formatPlatoPrecio(p)}
                    </span>
                  </div>
                  {descripciones[p.id] ? (
                    <p className="mt-1 text-sm leading-snug text-carbon-400">
                      {descripciones[p.id]}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>

      <p className="text-xs text-carbon-400">
        {t.notaPrecios}
      </p>
    </section>
  );
}

export function MenusView({
  menus,
  t,
  frases = {},
}: {
  menus: Menu["menus"];
  t: Textos;
  /**
   * Frase en español -> la misma en el idioma del visitante. Solo las frases
   * de sala (disponibilidad, qué incluye). Los nombres de plato de las listas
   * NO se traducen: "Raxo" es el nombre, como "paella".
   */
  frases?: Record<string, string>;
}) {
  const tr = (s: string) => frases[s] ?? s;
  const visibles = menus.filter((m) => !m.disabled);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibles.map((m) => (
        <article
          key={m.id}
          className="flex flex-col rounded-xl border border-carbon-800 bg-carbon-900/60 p-5 shadow-sm"
        >
          <header className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg text-white">{m.nombre}</h3>
            <span className="font-mono text-base tabular-nums text-brasa-300">
              {formatPrice(m.precio)}
            </span>
          </header>
          <p className="mb-3 text-xs uppercase tracking-wide text-carbon-400">
            {tr(m.disponibilidad)}
          </p>
          {m.primeros ? (
            <div className="mb-2">
              <p className="text-xs font-semibold uppercase text-carbon-300">{t.aElegirPrimero}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-carbon-100">
                {m.primeros.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {m.segundos ? (
            <div className="mb-2">
              <p className="text-xs font-semibold uppercase text-carbon-300">{t.aElegirSegundo}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-carbon-100">
                {m.segundos.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {m.platos ? (
            <div className="mb-2">
              <p className="text-xs font-semibold uppercase text-carbon-300">{t.incluyeLista}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-carbon-100">
                {m.platos.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {m.incluye ? (
            <p className="mt-auto pt-3 text-xs text-carbon-300">
              <span className="font-semibold text-carbon-100">{t.incluye}</span>{" "}
              {tr(m.incluye)}
              {m.no_incluye ? (
                <>
                  {" "}
                  <span className="font-semibold text-carbon-100">{t.noIncluye}</span>{" "}
                  {tr(m.no_incluye)}
                </>
              ) : null}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
