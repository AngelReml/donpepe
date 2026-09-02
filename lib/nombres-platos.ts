/**
 * Traducción del NOMBRE de cada plato (no la descripción, que ya traduce
 * lib/traducir.ts). Es SOLO una línea secundaria, nunca sustituye al nombre
 * real: el nombre real -el de data/menu.json- es siempre el principal, en
 * todos los idiomas, para que el cliente pueda señalar y pedir por él.
 *
 * Fichero estático (data/nombres-platos.i18n.json), generado a mano una vez:
 * la carta nunca llama a un traductor en vivo para esto, igual que ya hace
 * el resto del sistema de idiomas.
 */
import fs from "node:fs";
import path from "node:path";
import type { Idioma } from "./i18n";

type Tabla = Record<string, Partial<Record<Idioma, string>>>;

let cache: Tabla | null = null;

function tabla(): Tabla {
  if (cache) return cache;
  try {
    const ruta = path.join(process.cwd(), "data", "nombres-platos.i18n.json");
    const crudo = JSON.parse(fs.readFileSync(ruta, "utf-8")) as Tabla;
    delete (crudo as Record<string, unknown>)._comentario;
    cache = crudo;
  } catch {
    cache = {};
  }
  return cache;
}

/** undefined = no hay traducción buena para ese plato en ese idioma: no se muestra segunda línea. */
export function nombreSecundario(platoId: string, idioma: Idioma): string | undefined {
  if (idioma === "es" || idioma === "gl") return undefined; // el nombre real ya está en es/gl
  return tabla()[platoId]?.[idioma];
}
