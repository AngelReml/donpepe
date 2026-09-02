"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Miniatura de un plato con foto: visible siempre junto al plato (no un
 * desplegable escondido -eso es justo lo que falló: nadie encontraba la foto
 * porque nada indicaba que existiera-), carga diferida y en formato moderno
 * (WebP/AVIF vía la optimización de imágenes de Vercel, automática sobre
 * `next/image`) para no penalizar a un móvil con mala cobertura con las
 * ~34 fotos de la carta cargando de golpe.
 *
 * Al tocarla, se abre grande en una capa superpuesta. La foto ampliada es un
 * <img> normal a propósito: solo se pide cuando el cliente la toca -una sola
 * foto, no las 34-, así que no hace falta optimizarla con la misma urgencia,
 * y evita tener que inventar un "aspect ratio" fijo para fotos que no lo
 * tienen todas igual (hay cuadradas y 3:2 en la carta real).
 *
 * Si el plato no tiene foto, quien use este componente simplemente no lo
 * renderiza: no hay hueco ni marcador de posición por diseño.
 */
export function FotoPlato({ src, alt }: { src: string; alt: string }) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!abierta) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierta(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierta]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={alt}
        className="block shrink-0 overflow-hidden rounded-md border border-carbon-700 transition-colors hover:border-brasa-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brasa-500"
      >
        <Image
          src={src}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          sizes="64px"
          className="h-16 w-16 object-cover"
        />
      </button>

      {abierta ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setAbierta(false)}
        >
          <button
            type="button"
            onClick={() => setAbierta(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-carbon-900/80 text-2xl leading-none text-white"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- una sola foto bajo demanda, no las 34 de golpe; ver comentario del componente */}
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
