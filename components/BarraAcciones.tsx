/**
 * Barra fija de acciones al pie de la carta: Reservar y WhatsApp, a la misma
 * altura y con el mismo peso visual (mismo tamaño, mismo grosor de texto,
 * ambos rellenos). Se distinguen solo por el color —el de marca y el verde de
 * WhatsApp, que el ojo reconoce al instante— nunca por el tamaño.
 *
 * Va fija abajo del todo, nunca por delante de la carta: no tapa platos, solo
 * ocupa el borde inferior. Por eso <main> en app/carta/page.tsx lleva un
 * padding-bottom de sobra, para que la última fila de la carta no quede
 * escondida detrás.
 */
export function BarraAcciones({
  telefonoReserva,
  whatsapp,
  mensajeWhatsapp,
  etiquetaReservar,
}: {
  /** Sin "+", formato E.164 sin espacios (ej. "34881829728"). */
  telefonoReserva: string;
  whatsapp: string;
  mensajeWhatsapp: string;
  etiquetaReservar: string;
}) {
  const hrefWhatsapp = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensajeWhatsapp)}`;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-carbon-800 bg-carbon-900/95 px-3 pt-2.5 backdrop-blur supports-[backdrop-filter]:bg-carbon-900/85"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-3xl gap-3">
        <a
          href={`tel:+${telefonoReserva}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brasa-500 px-4 py-3 text-sm font-semibold text-white shadow-brasa transition hover:bg-brasa-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-300"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current">
            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
          </svg>
          {etiquetaReservar}
        </a>
        <a
          href={hrefWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-carbon-900 shadow-brasa transition hover:bg-[#1fbd5a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current">
            <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.22-9.4 9.41-9.4 2.51 0 4.87.98 6.64 2.76a9.34 9.34 0 0 1 2.75 6.65c0 5.18-4.22 9.41-9.39 9.41zm8-17.4A11.32 11.32 0 0 0 12.05.8C5.8.8.72 5.88.72 12.12c0 1.99.52 3.94 1.51 5.66L.63 23.7l6.06-1.59a11.3 11.3 0 0 0 5.36 1.37h.01c6.24 0 11.32-5.08 11.33-11.32 0-3.03-1.18-5.87-3.32-8.01z" />
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  );
}
