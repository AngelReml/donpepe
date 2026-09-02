/**
 * Validación estricta del precio que teclea el dueño en el asistente de
 * Telegram (alta de plato nuevo, cambio de precio). No es lo mismo que
 * `z.number().positive()` en ActionSchema: eso valida un *número* una vez
 * parseado, esto valida la *cadena de texto* que llega de un teclado móvil,
 * donde "20..50", "-5", "veinte" o "12,5,0" son errores de dedo reales.
 *
 * Un precio mal guardado es la queja que ya tiene el bar en Google: por eso
 * esto rechaza en vez de intentar adivinar, y el asistente vuelve a
 * preguntar en vez de guardar algo dudoso.
 */

/** Número positivo, coma o punto decimal, máximo dos decimales. Nada más. */
const FORMA_VALIDA = /^\d+(?:[.,]\d{1,2})?$/;

export interface ResultadoPrecio {
  ok: boolean;
  valor?: number;
  motivo?: string;
}

export function parsePrecioEstricto(textoCrudo: string): ResultadoPrecio {
  const texto = textoCrudo.trim();
  if (!texto) return { ok: false, motivo: "No has escrito ningún precio." };
  if (!FORMA_VALIDA.test(texto)) {
    return {
      ok: false,
      motivo:
        "Ese precio no vale. Escribe solo el número, con como mucho dos decimales " +
        '(coma o punto): por ejemplo "12" o "12,50" o "12.5". Nada de € ni letras.',
    };
  }
  const normalizado = texto.replace(",", ".");
  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, motivo: "El precio tiene que ser un número mayor que cero." };
  }
  // Cinturón y tirantes: el regex ya limita a dos decimales, pero si algún
  // día cambia, esto sigue impidiendo que se cuele un precio con más
  // precisión de la que tiene sentido para euros.
  const centimos = Math.round(valor * 100);
  if (Math.abs(centimos - valor * 100) > 1e-9) {
    return { ok: false, motivo: "El precio no puede tener más de dos decimales." };
  }
  return { ok: true, valor: centimos / 100 };
}
