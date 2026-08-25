"use client";

import { useMemo, useState } from "react";

interface Table {
  number: number;
  url: string;
  png: string;
  svg: string;
}

function buildUrl(site: string, mesa?: number) {
  const base = site.replace(/\/+$/, "");
  if (!mesa) return `${base}/carta`;
  return `${base}/carta?mesa=${encodeURIComponent(String(mesa))}`;
}

export function QRAdmin({ siteBase }: { siteBase: string }) {
  const [site, setSite] = useState(siteBase);
  const [count, setCount] = useState(12);
  const [copied, setCopied] = useState<string | null>(null);

  const general = useMemo(() => buildUrl(site), [site]);
  const tables: Table[] = useMemo(() => {
    return Array.from({ length: Math.max(1, Math.min(count, 60)) }, (_, i) => {
      const n = i + 1;
      const url = buildUrl(site, n);
      return {
        number: n,
        url,
        png: `/api/qr?format=png&size=1024&data=${encodeURIComponent(url)}`,
        svg: `/api/qr?format=svg&data=${encodeURIComponent(url)}`,
      };
    });
  }, [site, count]);

  const pdfHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("site", site);
    params.set("count", String(count));
    return `/api/qr/pdf?${params.toString()}`;
  }, [site, count]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-white">QRs para las mesas</h1>
        <p className="text-sm text-carbon-300">
          Genera un QR general o uno por mesa. Descárgalo en PNG, SVG (vectorial)
          o imprime un A4 con 6 QRs por hoja.
        </p>
      </header>

      <section className="grid gap-4 rounded-xl border border-carbon-800 bg-carbon-900/60 p-5 sm:grid-cols-2">
        <label className="block text-sm text-carbon-200">
          Dominio del sitio
          <input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="mt-1 w-full rounded-md border border-carbon-700 bg-carbon-800 px-3 py-2 text-white"
            spellCheck={false}
          />
        </label>
        <label className="block text-sm text-carbon-200">
          Número de mesas
          <input
            type="number"
            min={1}
            max={60}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-carbon-700 bg-carbon-800 px-3 py-2 text-white"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">QR general</h2>
        <div className="rounded-xl border border-carbon-800 bg-carbon-900/60 p-4">
          <p className="break-all text-xs text-carbon-300">{general}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="rounded-md bg-brasa-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brasa-600"
              href={`/api/qr?format=png&size=1024&data=${encodeURIComponent(general)}`}
              download="don-pepe-carta.png"
            >
              PNG 1024
            </a>
            <a
              className="rounded-md border border-carbon-600 px-3 py-1.5 text-sm text-white hover:border-brasa-700"
              href={`/api/qr?format=svg&data=${encodeURIComponent(general)}`}
              download="don-pepe-carta.svg"
            >
              SVG
            </a>
            <button
              type="button"
              onClick={() => copy(general)}
              className="rounded-md border border-carbon-600 px-3 py-1.5 text-sm text-white hover:border-brasa-700"
            >
              {copied === general ? "Copiado" : "Copiar URL"}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">QRs por mesa</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t) => (
            <article
              key={t.number}
              className="rounded-xl border border-carbon-800 bg-carbon-900/60 p-3 text-center"
            >
              <p className="mb-2 text-sm font-semibold text-white">Mesa {t.number}</p>
              <div className="aspect-square w-full overflow-hidden rounded-md bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.png}
                  alt={`QR mesa ${t.number}`}
                  className="h-full w-full"
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs">
                <a
                  className="rounded bg-brasa-500 px-2 py-1 font-semibold text-white hover:bg-brasa-600"
                  href={t.png}
                  download={`don-pepe-mesa-${t.number}.png`}
                >
                  PNG
                </a>
                <a
                  className="rounded border border-carbon-600 px-2 py-1 text-white hover:border-brasa-700"
                  href={t.svg}
                  download={`don-pepe-mesa-${t.number}.svg`}
                >
                  SVG
                </a>
                <button
                  type="button"
                  onClick={() => copy(t.url)}
                  className="rounded border border-carbon-600 px-2 py-1 text-white hover:border-brasa-700"
                >
                  {copied === t.url ? "Copiado" : "URL"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Imprimir</h2>
        <a
          className="inline-block rounded-md border border-carbon-600 bg-carbon-800 px-4 py-2 text-sm font-semibold text-white hover:border-brasa-700"
          href={pdfHref}
          download="don-pepe-qrs.pdf"
        >
          Descargar PDF A4 (6 por hoja)
        </a>
      </section>
    </main>
  );
}
