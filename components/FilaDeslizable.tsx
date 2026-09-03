"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fila de botones/enlaces (categorías, idiomas...) que en escritorio con
 * ratón simplemente SE REPARTE en varias filas -no hay nada que deslizar,
 * ni falta- y en pantalla táctil (hover:none, pointer:coarse, el criterio
 * real de "es un móvil", no un ancho de pantalla) se convierte en una tira
 * horizontal con:
 *  - deslizado táctil nativo (gratis, por ser overflow-x:auto)
 *  - rueda del ratón (traducida a horizontal)
 *  - arrastrar con el puntero
 *  - flechas de teclado con foco itinerante + flechas visibles a los lados
 *  - un desvanecido en los bordes cuando queda contenido oculto
 *
 * Por qué repartir en filas en vez de deslizar en escritorio: esta fila
 * vive dentro de contenedores de ancho fijo/acotado (el panel flotante de
 * /local, max-w-3xl en /carta) -nunca "todo el ancho de un monitor"-, así
 * que envolver en varias filas no descoloca nada y evita necesitar
 * deslizado en el dispositivo donde es menos natural (con un ratón, sin
 * rueda horizontal ni gesto de arrastre esperado).
 */
export function FilaDeslizable({
  children,
  className = "",
  itemClassName = "",
  label,
  as = "div",
  role,
}: {
  children: ReactNode;
  /** clases del contenedor de la fila (gap, padding...); el comportamiento de desliz/envoltura ya lo pone este componente */
  className?: string;
  itemClassName?: string;
  label: string;
  /** "nav" cuando la fila YA es una navegación semántica (p. ej. el selector de idioma); por defecto un div sin más rol */
  as?: "div" | "nav";
  /** rol ARIA de la fila; se deja explícito porque no todas las filas son pestañas (el selector de idioma es navegación, no tablist) */
  role?: string;
}) {
  const filaRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  function medir() {
    const el = filaRef.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > 4);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    medir();
    const el = filaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  function desplazar(dx: number) {
    filaRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  // Rueda vertical del ratón -> desplazamiento horizontal, solo cuando de
  // verdad hay algo que desplazar (en modo "reparto en filas" no hace nada).
  function alRueda(e: React.WheelEvent<HTMLDivElement>) {
    const el = filaRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  }

  // Arrastrar con el puntero (ratón o lápiz; el dedo ya desliza nativo).
  const arrastre = useRef<{ x: number; scroll: number } | null>(null);
  function alPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = filaRef.current;
    if (!el || el.scrollWidth <= el.clientWidth || e.pointerType === "touch") return;
    arrastre.current = { x: e.clientX, scroll: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
    el.classList.add("cursor-grabbing");
  }
  function alPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = filaRef.current;
    if (!el || !arrastre.current) return;
    el.scrollLeft = arrastre.current.scroll - (e.clientX - arrastre.current.x);
  }
  function soltarPointer(e: React.PointerEvent<HTMLDivElement>) {
    filaRef.current?.classList.remove("cursor-grabbing");
    arrastre.current = null;
  }

  // Flecha izquierda/derecha del teclado: mueve el foco al botón/enlace
  // anterior o siguiente de la fila y lo trae a la vista.
  function alTeclado(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const el = filaRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(":scope > a, :scope > button"));
    const actual = items.indexOf(document.activeElement as HTMLElement);
    if (actual === -1) return;
    const siguiente = e.key === "ArrowRight" ? Math.min(actual + 1, items.length - 1) : Math.max(actual - 1, 0);
    if (siguiente === actual) return;
    e.preventDefault();
    items[siguiente].focus();
    items[siguiente].scrollIntoView({ inline: "nearest", block: "nearest" });
  }

  const Envoltura = as === "nav" ? "nav" : "div";

  return (
    <Envoltura className="relative" aria-label={as === "nav" ? label : undefined}>
      {puedeDer || puedeIzq ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => desplazar(-160)}
            className={
              "absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-carbon-700 bg-carbon-900/90 p-1 text-carbon-200 shadow [@media(hover:none)]:flex " +
              (puedeIzq ? "" : "pointer-events-none opacity-0")
            }
          >
            <FlechaIzq />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => desplazar(160)}
            className={
              "absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-carbon-700 bg-carbon-900/90 p-1 text-carbon-200 shadow [@media(hover:none)]:flex " +
              (puedeDer ? "" : "pointer-events-none opacity-0")
            }
          >
            <FlechaDer />
          </button>
        </>
      ) : null}
      <div
        ref={filaRef}
        role={role}
        aria-label={as === "nav" ? undefined : label}
        onWheel={alRueda}
        onPointerDown={alPointerDown}
        onPointerMove={alPointerMove}
        onPointerUp={soltarPointer}
        onPointerCancel={soltarPointer}
        onKeyDown={alTeclado}
        className={
          "flex min-w-0 flex-wrap [@media(hover:none)]:flex-nowrap [@media(hover:none)]:overflow-x-auto [@media(hover:none)]:[scrollbar-width:none] [@media(hover:none)]:[-ms-overflow-style:none] [@media(hover:none)]:[&::-webkit-scrollbar]:hidden [@media(hover:none)]:cursor-grab " +
          className +
          " " +
          itemClassName
        }
        style={{
          // contain:layout, SIEMPRE, no solo en táctil: sin esto, Chrome en
          // móvil puede calcular el "viewport de layout" a partir del
          // contenido interno de una fila con overflow-x-auto -aunque esté
          // bien recortada visualmente- y desplazar fuera de la pantalla
          // real cualquier cosa posicionada con inset-x-0/fixed, como la
          // barra de Reservar/WhatsApp. Ver commit 3a76244.
          contain: "layout",
          ...(puedeIzq || puedeDer
            ? {
                maskImage: `linear-gradient(to right, ${puedeIzq ? "transparent, black 24px" : "black"} , black ${puedeDer ? "calc(100% - 24px)" : "100%"}, ${puedeDer ? "transparent" : "black"})`,
                WebkitMaskImage: `linear-gradient(to right, ${puedeIzq ? "transparent, black 24px" : "black"} , black ${puedeDer ? "calc(100% - 24px)" : "100%"}, ${puedeDer ? "transparent" : "black"})`,
              }
            : {}),
        }}
      >
        {children}
      </div>
    </Envoltura>
  );
}

function FlechaIzq() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FlechaDer() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
