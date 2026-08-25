/**
 * El dominio público, en un único sitio.
 *
 * Estaba copiado a mano en cinco ficheros y todos apuntaban todavía al dominio
 * de Vercel: el canonical, el sitemap, robots.txt y los QR que se imprimen para
 * las mesas mandaban a buscadores y clientes a don-pepe-original.vercel.app en
 * vez de al dominio real.
 *
 * El valor por defecto es ya el dominio bueno, así que la web sale correcta
 * aunque nadie defina NEXT_PUBLIC_SITE_URL en Vercel. La variable sigue
 * existiendo para los despliegues de vista previa, donde el dominio cambia.
 *
 * Sin barra final: todo lo que cuelga de aquí la añade.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://donpepeoriginal.es"
).replace(/\/+$/, "");
