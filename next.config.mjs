/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * La home es la carta (ver middleware.ts, que ya reescribe "/" a "/carta"
   * con el idioma resuelto). El middleware corre siempre antes que esto, así
   * que esta regla no debería llegar a aplicarse nunca en producción — se deja
   * como red de seguridad por si algún día el matcher del middleware deja de
   * cubrir "/". Antes apuntaba a la portada de diseño (public/inicio.html);
   * esa portada sigue viva en /local.
   */
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/carta" }],
    };
  },
};

export default nextConfig;
