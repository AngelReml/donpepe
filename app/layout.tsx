import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { COOKIE_IDIOMA, ETIQUETA_HTML, elegirIdioma } from "@/lib/i18n";
import { SITE_URL } from "@/lib/sitio";

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
        {children}
      </body>
    </html>
  );
}
