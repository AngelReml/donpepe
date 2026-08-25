export function Hero({
  name,
  tagline,
  phone,
  phoneDisplay,
  ctaHref,
}: {
  name: string;
  tagline: string;
  phone: string;
  phoneDisplay: string;
  ctaHref: string;
}) {
  return (
    <header
      className="hero-bg noise relative isolate overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-16 pt-12 sm:px-6 sm:pt-20 md:pb-24 md:pt-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brasa-300">
          Padrón · Galicia
        </p>
        <h1
          id="hero-title"
          className="font-display text-4xl leading-tight text-white sm:text-5xl md:text-6xl"
        >
          {name}
        </h1>
        <p className="max-w-xl text-lg text-carbon-200 sm:text-xl">{tagline}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-full bg-brasa-500 px-6 py-3 text-sm font-semibold text-white shadow-brasa transition hover:bg-brasa-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-300"
          >
            Ver carta
          </a>
          <a
            href={`tel:+${phone}`}
            className="inline-flex items-center justify-center rounded-full border border-carbon-600 bg-carbon-800/60 px-6 py-3 text-sm font-semibold text-white transition hover:border-brasa-700 hover:text-brasa-200"
          >
            Llamar {phoneDisplay}
          </a>
        </div>
        <p className="mt-6 text-xs text-carbon-400">
          Brasa, arroces y pescado del día. 1 cuenta por mesa.
        </p>
      </div>
    </header>
  );
}
