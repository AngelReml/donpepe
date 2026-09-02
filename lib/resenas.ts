/**
 * ÚNICA constante con la URL de reseñas de Google del local. Se usa en el
 * bloque de reseñas de /carta y /local, y en el generador de cartelito
 * imprimible (app/api/qr/resenas/route.ts). Cámbiala aquí y cambia en todos
 * los sitios a la vez.
 *
 * URL real confirmada por el dueño (2026-09-02). Formato oficial de Google
 * para "escribir una reseña" directamente sobre una ficha de Google Business
 * Profile: https://search.google.com/local/writereview?placeid=<place_id>.
 * A diferencia de un enlace construido a mano, este SÍ abre el formulario
 * de reseña real -no una búsqueda genérica- porque usa el place_id exacto
 * del local (ChIJ5bsZXwAbLw0RXQuMcWz4AwM).
 */
export const GOOGLE_REVIEWS_URL =
  "https://search.google.com/local/writereview?placeid=ChIJ5bsZXwAbLw0RXQuMcWz4AwM";
