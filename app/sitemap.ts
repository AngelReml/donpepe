import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/sitio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // "/" reescribe a "/carta" (ver middleware.ts): la carta es la home.
    { url: `${SITE_URL}/carta`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/local`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/aviso-legal`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];
}
