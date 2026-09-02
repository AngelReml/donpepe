import { GOOGLE_REVIEWS_URL } from "@/lib/resenas";

/**
 * Bloque de reseñas. Las CINCO estrellas llevan al MISMO sitio, siempre: no
 * hay ninguna lógica que distinga según cuál se toque. Enviar solo a
 * clientes contentos a dejar reseña ("review gating") lo prohíbe Google
 * expresamente y puede costarle al local la restricción de su ficha -así
 * que aquí no hay ningún "si" que lo permita ni por accidente-.
 *
 * Nada de ventanas emergentes: un bloque quieto, en su sitio, discreto.
 */
export function BloqueResenas({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <section
      aria-label={titulo}
      className="rounded-lg border border-carbon-800 bg-carbon-900/40 px-4 py-5 text-center"
    >
      <p className="font-display text-lg text-white">{titulo}</p>
      <a
        href={GOOGLE_REVIEWS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={titulo}
        className="mt-3 inline-flex gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brasa-500"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-7 w-7 fill-brasa-400 transition hover:fill-brasa-300"
          >
            <path d="M12 2.5l2.9 6.32 6.85.72-5.12 4.7 1.45 6.86L12 17.68l-6.08 3.42 1.45-6.86-5.12-4.7 6.85-.72L12 2.5z" />
          </svg>
        ))}
      </a>
      <p className="mt-2 text-xs text-carbon-400">{subtitulo}</p>
    </section>
  );
}
