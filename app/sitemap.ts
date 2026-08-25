import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/sitio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/carta`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/aviso-legal`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];
}
