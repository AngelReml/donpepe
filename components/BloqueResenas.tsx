"use client";

import { useState } from "react";
import { GOOGLE_REVIEWS_URL } from "@/lib/resenas";

/**
 * Bloque de reseñas. Las CINCO estrellas llevan al MISMO sitio, siempre: no
 * hay ninguna lógica que distinga según cuál se toque -es un único <a> que
 * envuelve las cinco; el relleno progresivo al pasar el ratón o el dedo es
 * puramente visual (estado de React que solo cambia clases CSS), nunca
 * cambia el `href` ni añade un parámetro con la puntuación-. Enviar solo a
 * clientes contentos a dejar reseña ("review gating") lo prohíbe Google
 * expresamente y puede costarle al local la restricción de su ficha -así
 * que aquí no hay ningún "si" que lo permita ni por accidente-.
 *
 * Con presencia real: al final de la carta, cuando el cliente ya ha comido,
 * con aire y separación claros del contenido anterior -no un adorno
 * discreto que pasa desapercibido-.
 */
export function BloqueResenas({
  titulo,
  subtitulo,
  etiquetaGoogle,
}: {
  titulo: string;
  subtitulo: string;
  /** "Déjanos tu reseña en Google": deja claro, antes de tocar, a dónde va. */
  etiquetaGoogle: string;
}) {
  const [resaltadas, setResaltadas] = useState(0);

  return (
    <section
      aria-label={titulo}
      className="mt-14 rounded-xl border border-carbon-800 bg-carbon-900/40 px-6 py-10 text-center sm:mt-16"
    >
      <p className="font-display text-2xl text-white sm:text-3xl">{titulo}</p>

      <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-carbon-200">
        <LogoGoogle className="h-5 w-5" />
        {etiquetaGoogle}
      </p>

      <a
        href={GOOGLE_REVIEWS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={titulo}
        className="mt-5 inline-flex gap-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brasa-500"
        onMouseLeave={() => setResaltadas(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            viewBox="0 0 24 24"
            aria-hidden="true"
            onMouseEnter={() => setResaltadas(n)}
            onTouchStart={() => setResaltadas(n)}
            className={
              "h-11 w-11 transition-colors duration-150 sm:h-12 sm:w-12 " +
              (n <= resaltadas ? "fill-brasa-300" : "fill-brasa-500/70")
            }
          >
            <path d="M12 2.5l2.9 6.32 6.85.72-5.12 4.7 1.45 6.86L12 17.68l-6.08 3.42 1.45-6.86-5.12-4.7 6.85-.72L12 2.5z" />
          </svg>
        ))}
      </a>

      <p className="mt-4 text-sm text-carbon-400">{subtitulo}</p>
    </section>
  );
}

/** Logotipo oficial de Google ("G" de cuatro colores), para dejar claro que el enlace va a Google antes de tocarlo. */
function LogoGoogle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.348 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}
