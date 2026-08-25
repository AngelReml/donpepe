/**
 * Genera public/inicio.<idioma>.html a partir del español.
 *
 * Sustituye fragmentos EXACTOS del HTML. Si uno no aparece, aborta: es la única
 * forma de enterarse de que alguien tocó la portada y dejó una versión a medias.
 *
 *   node scripts/generar-portada.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const IDIOMAS = ["gl", "en", "pt", "de", "fr", "it"];
const ETIQUETA_HTML = { es: "es", gl: "gl", en: "en", pt: "pt", de: "de", fr: "fr", it: "it" };

const leerJson = (p) => JSON.parse(readFileSync(path.join(RAIZ, p), "utf-8"));
const sinComentario = (o) => {
  const { _comentario, ...resto } = o;
  return resto;
};

const fuente = readFileSync(path.join(RAIZ, "public", "inicio.html"), "utf-8");
const textos = sinComentario(leerJson("data/portada.i18n.json"));
const textosJs = sinComentario(leerJson("data/portada.js.i18n.json"));
const descripciones = sinComentario(leerJson("data/traducciones.json"));

// Las descripciones de plato ya están traducidas para la carta: se reutilizan.
const desdeDescripciones = {};
for (const [español, porIdioma] of Object.entries(descripciones)) {
  desdeDescripciones[`d:"${español}"`] = Object.fromEntries(
    IDIOMAS.map((i) => [i, `d:"${(porIdioma[i] ?? español).replace(/"/g, "&quot;")}"`]),
  );
}

const todas = { ...textos, ...textosJs, ...desdeDescripciones };
// De mayor a menor: si no, una clave corta puede romper una larga que la contiene.
const claves = Object.keys(todas).sort((a, b) => b.length - a.length);

// Las descripciones de plato salen de la carta, no de la portada: que una no
// aparezca aquí es normal —hay frases que solo existen en /carta— y no puede
// tumbar el build. Los fragmentos de portada*.i18n.json sí siguen siendo
// obligatorios: son el aviso de que alguien tocó el HTML y dejó traducciones
// a medias, que es justo para lo que existe esta comprobación.
const OPCIONALES = new Set(Object.keys(desdeDescripciones));

let fallos = 0;
for (const idioma of IDIOMAS) {
  let salida = fuente;
  let aplicadas = 0;
  const ausentes = [];
  let soloCarta = 0;

  for (const clave of claves) {
    const reemplazo = todas[clave][idioma];
    if (!reemplazo) continue;
    const trozos = salida.split(clave);
    if (trozos.length === 1) {
      if (OPCIONALES.has(clave)) soloCarta += 1;
      else ausentes.push(clave);
      continue;
    }
    salida = trozos.join(reemplazo);
    aplicadas += trozos.length - 1;
  }

  // El idioma del documento. El canonical y los hreflang ya vienen en el
  // <head> de public/inicio.html: son los mismos en las siete versiones, y ahí
  // los tiene también la española, que antes se quedaba sin ellos. Si algún día
  // se añade un idioma hay que tocar ese <head> además de IDIOMAS.
  salida = salida.replace('<html lang="es">', `<html lang="${ETIQUETA_HTML[idioma]}">`);

  writeFileSync(path.join(RAIZ, "public", `inicio.${idioma}.html`), salida, "utf-8");

  const marca = ausentes.length ? "FALTAN" : "ok";
  const nota = soloCarta ? `  (${soloCarta} frases solo de /carta)` : "";
  console.log(`  ${idioma}: ${aplicadas} sustituciones  ${marca}${nota}`);
  for (const a of ausentes.slice(0, 6)) console.log(`      no encontrado: ${a.slice(0, 74)}`);
  fallos += ausentes.length;
}

if (fallos) {
  console.error(`\n${fallos} fragmentos no encontrados — revisa data/portada*.i18n.json`);
  process.exit(1);
}
console.log("\n  6 idiomas generados");
