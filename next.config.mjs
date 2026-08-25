/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * La portada es la página estática de diseño (public/inicio.html).
   * `beforeFiles` se evalúa antes que las rutas del App Router, así que
   * intercepta "/" sin borrar app/page.tsx: para volver a la portada
   * anterior basta con eliminar este bloque rewrites.
   */
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/inicio.html" }],
    };
  },
};

export default nextConfig;
