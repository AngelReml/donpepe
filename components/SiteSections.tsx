export function Horario({
  phone,
  phoneDisplay,
  mobile,
  mobileDisplay,
  whatsapp,
}: {
  phone: string;
  phoneDisplay: string;
  mobile: string;
  mobileDisplay: string;
  whatsapp: string;
}) {
  return (
    <section
      id="horario"
      aria-labelledby="horario-title"
      className="rounded-2xl border border-carbon-800 bg-carbon-900/60 p-6 sm:p-8"
    >
      <h2 id="horario-title" className="font-display text-2xl text-white sm:text-3xl">
        Horario y contacto
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm text-carbon-300">Horario</p>
          <p className="mt-1 text-base text-carbon-100">13:00 – 16:00</p>
          <p className="text-base text-carbon-100">19:00 – 23:00</p>
          <p className="mt-2 text-sm text-carbon-400">Todos los días.</p>
          <p className="mt-1 text-sm text-carbon-400">1 cuenta por mesa.</p>
        </div>
        <div>
          <p className="text-sm text-carbon-300">Reservas y consultas</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a
              href={`tel:+${phone}`}
              className="inline-flex items-center justify-center rounded-full bg-brasa-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brasa transition hover:bg-brasa-600"
            >
              Llamar {phoneDisplay}
            </a>
            <a
              href={`tel:+${mobile}`}
              className="inline-flex items-center justify-center rounded-full border border-carbon-600 bg-carbon-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-brasa-700 hover:text-brasa-200"
            >
              Móvil {mobileDisplay}
            </a>
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                "Hola, quería reservar mesa.",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brasa-500 bg-brasa-500/15 px-5 py-2.5 text-sm font-semibold text-brasa-200 transition hover:bg-brasa-500 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4 fill-current"
              >
                <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.22-9.4 9.41-9.4 2.51 0 4.87.98 6.64 2.76a9.34 9.34 0 0 1 2.75 6.65c0 5.18-4.22 9.41-9.39 9.41zm8-17.4A11.32 11.32 0 0 0 12.05.8C5.8.8.72 5.88.72 12.12c0 1.99.52 3.94 1.51 5.66L.63 23.7l6.06-1.59a11.3 11.3 0 0 0 5.36 1.37h.01c6.24 0 11.32-5.08 11.33-11.32 0-3.03-1.18-5.87-3.32-8.01z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ComoLlegar({
  address,
  lat,
  lng,
}: {
  address: string;
  lat: string;
  lng: string;
}) {
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.01}%2C${Number(lat) - 0.005}%2C${Number(lng) + 0.01}%2C${Number(lat) + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`;
  const externalHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  return (
    <section
      id="como-llegar"
      aria-labelledby="como-title"
      className="space-y-4"
    >
      <h2 id="como-title" className="font-display text-2xl text-white sm:text-3xl">
        Cómo llegar
      </h2>
      <p className="text-carbon-200">{address}</p>
      <div className="overflow-hidden rounded-xl border border-carbon-800">
        <iframe
          title="Mapa de ubicación"
          src={mapSrc}
          className="h-72 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <a
        href={externalHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-brasa-300 underline-offset-4 hover:underline"
      >
        Abrir en mapa a pantalla completa
      </a>
    </section>
  );
}

export function Footer({
  name,
  phoneDisplay,
  mobileDisplay,
}: {
  name: string;
  phoneDisplay: string;
  mobileDisplay: string;
}) {
  return (
    <footer className="border-t border-carbon-800 bg-carbon-900/80 py-8 text-sm text-carbon-300">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium text-carbon-100">{name}</p>
        <p>
          Tel. {phoneDisplay} · Móvil {mobileDisplay}
        </p>
      </div>
      <div className="mx-auto mt-4 max-w-5xl px-4 text-xs text-carbon-500 sm:px-6">
        <p>
          © {new Date().getFullYear()} {name}. Todos los derechos reservados.
        </p>
        <p className="mt-1">
          Estrella Galicia recomienda el consumo responsable. Prohibida la venta de
          bebidas alcohólicas a menores de 18 años.
        </p>
      </div>
    </footer>
  );
}
