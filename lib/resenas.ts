/**
 * ÚNICA constante con la URL de reseñas de Google del local. Se usa en el
 * bloque de reseñas de /carta y /local, y en el generador de cartelito
 * imprimible (app/api/qr/resenas/route.ts). Cámbiala aquí y cambia en todos
 * los sitios a la vez.
 *
 * FALTA_DATO a propósito: no se construye a partir del place_id ni de
 * ningún otro dato -eso podría generar un enlace que no es el corto real de
 * "escribir una reseña"-. Sustituye este literal por la URL corta real
 * (Google Business Profile -> Pedir reseñas -> copiar enlace) en cuanto la
 * tengas. Documentado también en el README.
 */
export const GOOGLE_REVIEWS_URL = "[FALTA DATO: URL corta de reseñas de Google]";
