import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Horario, ComoLlegar, Footer } from "@/components/SiteSections";
import { MenuView, MenusView } from "@/components/MenuView";
import { getMenu } from "@/lib/kv";
import { SITE_URL } from "@/lib/sitio";
import type { Menu } from "@/lib/types";
// Esta portada quedó como respaldo (la sirve public/inicio.html) y es solo en español.
import { textos } from "@/lib/i18n";

export const revalidate = 60;
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto la carta puede servir un menú viejo aunque el dueño
// acabe de cambiar un precio por WhatsApp.
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Don Pepe Original — Cocina gallega, brasa y arroces en Padrón",
  description:
    "Restaurante de cocina gallega en Padrón: brasa, arroces, pescado y marisco. Carta actualizada, reserva por WhatsApp o llamada.",
  alternates: { canonical: "/" },
};

function buildJsonLd() {
  const name = process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? "Don Pepe Original";
  // los dos números son públicos: el fijo del local y el móvil de reservas
  const phone = process.env.NEXT_PUBLIC_PHONE ?? "34881829728";
  const phoneDisplay = process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? "881 82 97 28";
  const mobile = process.env.NEXT_PUBLIC_PHONE_MOBILE ?? "34696434042";
  const mobileDisplay =
    process.env.NEXT_PUBLIC_PHONE_MOBILE_DISPLAY ?? "696 43 40 42";
  const address = process.env.NEXT_PUBLIC_ADDRESS ?? "Rúa Longa, 21, 15900 Padrón, A Coruña";
  const lat = Number(process.env.NEXT_PUBLIC_LAT ?? "42.7386883");
  const lng = Number(process.env.NEXT_PUBLIC_LNG ?? "-8.6604218");
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
    image: `${SITE_URL}/og.jpg`,
    telephone: `+${phone}`,
    servesCuisine: ["Galician", "Spanish", "Seafood"],
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: "Padrón",
      addressRegion: "A Coruña",
      postalCode: "15900",
      addressCountry: "ES",
    },
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
        opens: "13:00",
        closes: "16:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
        opens: "19:00",
        closes: "23:00",
      },
    ],
    acceptsReservations: "True",
    url: SITE_URL,
    hasMenu: `${SITE_URL}/carta`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: `+${phone}`,
        contactType: "reservations",
        areaServed: "ES",
        availableLanguage: ["es"],
      },
      {
        "@type": "ContactPoint",
        telephone: `+${mobile}`,
        contactType: "reservations",
        areaServed: "ES",
        availableLanguage: ["es"],
      },
    ],
    description: `Restaurante de cocina gallega en Padrón. Brasa, arroces, pescado. Tel. ${phoneDisplay} y ${mobileDisplay}.`,
  };
}

export default async function HomePage() {
  const menu: Menu = await getMenu();
  const name = process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? "Don Pepe Original";
  // los dos números son públicos: el fijo del local y el móvil de reservas
  const phone = process.env.NEXT_PUBLIC_PHONE ?? "34881829728";
  const phoneDisplay = process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? "881 82 97 28";
  const mobile = process.env.NEXT_PUBLIC_PHONE_MOBILE ?? "34696434042";
  const mobileDisplay =
    process.env.NEXT_PUBLIC_PHONE_MOBILE_DISPLAY ?? "696 43 40 42";
  // el enlace de WhatsApp va al móvil, que es el que atiende reservas
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? mobile;
  const address = process.env.NEXT_PUBLIC_ADDRESS ?? "Rúa Longa, 21, 15900 Padrón, A Coruña";
  const lat = process.env.NEXT_PUBLIC_LAT ?? "42.7386883";
  const lng = process.env.NEXT_PUBLIC_LNG ?? "-8.6604218";

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()) }}
      />
      <Hero
        name={name}
        tagline="Cocina gallega, brasa y arroces en Padrón"
        phone={phone}
        phoneDisplay={phoneDisplay}
        ctaHref="/carta"
      />
      <div className="mx-auto max-w-5xl space-y-16 px-4 py-12 sm:px-6 sm:py-16">
        <section id="carta" aria-labelledby="carta-title" className="space-y-6">
          <h2
            id="carta-title"
            className="font-display text-3xl text-white sm:text-4xl"
          >
            Carta
          </h2>
          <MenuView menu={menu} t={textos("es")} />
        </section>

        <section id="menus" aria-labelledby="menus-title" className="space-y-6">
          <h2
            id="menus-title"
            className="font-display text-3xl text-white sm:text-4xl"
          >
            Menús
          </h2>
          <MenusView menus={menu.menus} t={textos("es")} />
        </section>

        <Horario
          phone={phone}
          phoneDisplay={phoneDisplay}
          mobile={mobile}
          mobileDisplay={mobileDisplay}
          whatsapp={whatsapp}
        />

        <ComoLlegar address={address} lat={lat} lng={lng} />
      </div>
      <Footer
        name={name}
        phoneDisplay={phoneDisplay}
        mobileDisplay={mobileDisplay}
      />
    </main>
  );
}
