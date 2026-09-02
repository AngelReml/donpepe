/**
 * Ningún QR que generemos puede llevar un fragmento ("#..."). Es la causa
 * confirmada de que los carteles ya plastificados en las mesas manden al
 * escaparate en vez de a la carta: el navegador nunca envía el fragmento al
 * servidor, así que un QR con "#" queda apuntando a una sección que puede
 * dejar de existir sin que nada ni nadie se entere hasta la próxima queja en
 * sala. Ver lib/anclas-heredadas.ts para el parche del lado del cliente que
 * arregla los carteles viejos -esto es lo que evita que se generen más-.
 *
 * Se usa en los tres sitios que codifican una URL en un QR: /api/qr,
 * /api/qr/pdf y /api/qr/cartel.
 */
export function sinFragmento(url: string): string {
  if (url.includes("#")) {
    throw new Error(`URL de QR con fragmento ("#"), no permitido: "${url}"`);
  }
  return url;
}
