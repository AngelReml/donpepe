import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { COOKIE_IDIOMA, ETIQUETA_HTML, elegirIdioma } from "@/lib/i18n";
import { SITE_URL } from "@/lib/sitio";
import { ANCLAS_HEREDADAS } from "@/lib/anclas-heredadas";

export const metadata: Metadata = {
  // Sin esto, Next.js no sabe contra qué dominio resolver los canonical y los
  // hreflang relativos de abajo: en producción los emitía contra la URL de
  // Vercel, no contra el dominio del local.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Don Pepe Original — Cocina gallega, brasa y arroces en Padrón",
    template: "%s · Don Pepe Original",
  },
  description:
    "Restaurante de cocina gallega en Padrón: brasa, arroces, pescado y marisco. Carta actualizada, reserva por WhatsApp o llamada.",
  applicationName: "Don Pepe Original",
  authors: [{ name: "Don Pepe Original" }],
  generator: "Next.js",
  keywords: [
    "restaurante Padrón",
    "cocina gallega",
    "brasa",
    "arroces",
    "pulpo a la gallega",
    "Padrón A Coruña",
    "Don Pepe",
  ],
  alternates: {
    canonical: "/",
    languages: { "es-ES": "/" },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Don Pepe Original",
    title: "Don Pepe Original — Cocina gallega, brasa y arroces en Padrón",
    description:
      "Brasa, arroces, pescado y marisco en Padrón. Mira la carta y reserva por WhatsApp.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  // Los iconos viven en /public para que también los use la portada estática,
  // que no pasa por el App Router y no hereda estos metadatos.
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1817",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // El idioma del documento acompaña al de la carta: sin esto, un lector de
  // pantalla leería el inglés con fonética española y Google la indexaría mal.
  const idioma = elegirIdioma({
    // el middleware ya resolvió el idioma para /carta, incluido ?lang=
    parametro: headers().get("x-idioma"),
    cookie: cookies().get(COOKIE_IDIOMA)?.value,
    cabecera: headers().get("accept-language"),
  });

  return (
    <html lang={ETIQUETA_HTML[idioma]}>
      <body className="min-h-screen bg-carbon-900 text-carbon-50 antialiased">
        {/*
          Carteles con QR ya plastificados en las mesas codifican
          "https://donpepeoriginal.es/#carta": un ancla de una versión
          anterior de la web, de cuando la carta era una sección de la home
          en vez de una ruta propia. El fragmento nunca llega al servidor
          -el navegador se lo queda para sí-, así que ningún middleware ni
          redirect del lado del servidor puede verlo. Se resuelve aquí, con
          "beforeInteractive": Next.js lo ejecuta antes de hidratar React, y
          al quedar primero dentro de <body> -antes que cualquier otro
          contenido- el navegador lo corre en cuanto lo parsea, sin haber
          pintado nada del escaparate todavía. Verificado con Chrome real, no
          solo con curl (el fragmento no llega al servidor: curl no lo ve).
          El mapa de anclas vive en lib/anclas-heredadas.ts -no lo dupliques,
          amplíalo ahí-.
        */}
        <Script id="anclas-heredadas" strategy="beforeInteractive">
          {`(function () {
            var ANCLAS = ${JSON.stringify(ANCLAS_HEREDADAS)};
            function resolver() {
              var crudo = window.location.hash.slice(1);
              if (!crudo) return;
              var clave = decodeURIComponent(crudo).trim().toLowerCase();
              var destino = ANCLAS[clave];
              if (!destino) return;
              var partes = destino.split("#");
              var final = partes[0] + window.location.search + (partes[1] ? "#" + partes[1] : "");
              window.location.replace(final);
            }
            resolver();
            window.addEventListener("hashchange", resolver);
          })();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
