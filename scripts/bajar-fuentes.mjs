/**
 * Descarga a /public/fonts los ficheros woff2 que la portada usa de verdad.
 *
 * Se autoalojan por tres motivos: un CDN externo se cae —jsDelivr llevaba
 * tiempo devolviendo 400 y la web se veía con las fuentes de respaldo—, cada
 * dominio de terceros es un argumento a favor de necesitar banner de cookies,
 * y desde el propio dominio cargan antes.
 *
 * Los pesos NO se eligen a ojo: son los que se midieron sobre la página
 * renderizada, contando solo elementos con texto propio visible.
 *
 * Ambas familias son SIL OFL 1.1, que permite copiar, incrustar y redistribuir.
 * La licencia se descarga junto a los ficheros, como exige la propia OFL.
 *
 *   node scripts/bajar-fuentes.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DESTINO = path.join(process.cwd(), "public", "fonts");
mkdirSync(DESTINO, { recursive: true });

/* Pesos y estilos realmente dibujados en la portada. */
const PEDIDO = [
  { familia: "Cormorant Garamond", css: "Cormorant+Garamond", pesos: [400, 600, 700], italica: [400] },
  { familia: "Inter", css: "Inter", pesos: [400, 500, 600, 700], italica: [] },
];

/* Solo el subconjunto "latin": cubre español, gallego, portugués, alemán,
   francés e italiano. Los símbolos sueltos (★ ☎ ✓) nunca estuvieron en estas
   fuentes y siguen saliendo de la del sistema, igual que antes. */
const SUBCONJUNTO = "latin";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function consulta({ css, pesos, italica }) {
  if (italica.length) {
    const pares = [
      ...pesos.map((p) => `0,${p}`),
      ...italica.map((p) => `1,${p}`),
    ].sort();
    return `${css}:ital,wght@${pares.join(";")}`;
  }
  return `${css}:wght@${pesos.join(";")}`;
}

const url =
  "https://fonts.googleapis.com/css2?family=" +
  PEDIDO.map(consulta).join("&family=") +
  "&display=swap";

console.log("pidiendo el CSS a Google Fonts…\n" + url + "\n");
const css = await fetch(url, { headers: { "user-agent": UA } }).then((r) => {
  if (!r.ok) throw new Error(`Google Fonts respondió ${r.status}`);
  return r.text();
});

/* El CSS trae un @font-face por familia/peso/estilo y subconjunto, precedido
   de un comentario con el nombre del subconjunto. */
const bloques = css.split("/*").slice(1);
const caras = [];
for (const bruto of bloques) {
  const nombreSub = bruto.slice(0, bruto.indexOf("*/")).trim();
  if (nombreSub !== SUBCONJUNTO) continue;
  const familia = bruto.match(/font-family:\s*'([^']+)'/)?.[1];
  const peso = bruto.match(/font-weight:\s*(\d+)/)?.[1];
  const estilo = bruto.match(/font-style:\s*(\w+)/)?.[1] ?? "normal";
  const fuente = bruto.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  const rango = bruto.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
  if (familia && peso && fuente) caras.push({ familia, peso, estilo, fuente, rango });
}

if (!caras.length) {
  console.error("No se encontró ninguna cara en el subconjunto " + SUBCONJUNTO);
  process.exit(1);
}

const esperadas = PEDIDO.reduce((n, f) => n + f.pesos.length + f.italica.length, 0);
if (caras.length !== esperadas) {
  console.error(`Esperaba ${esperadas} caras y encontré ${caras.length}. Abortado.`);
  caras.forEach((c) => console.error(`   ${c.familia} ${c.peso} ${c.estilo}`));
  process.exit(1);
}

const nombreFichero = (c) =>
  `${c.familia.toLowerCase().replace(/\s+/g, "-")}-${c.peso}-${c.estilo}.woff2`;

let total = 0;
for (const cara of caras) {
  const bytes = Buffer.from(
    await fetch(cara.fuente, { headers: { "user-agent": UA } }).then((r) => {
      if (!r.ok) throw new Error(`${cara.fuente} respondió ${r.status}`);
      return r.arrayBuffer();
    }),
  );
  const nombre = nombreFichero(cara);
  writeFileSync(path.join(DESTINO, nombre), bytes);
  total += bytes.length;
  console.log(`  ${nombre.padEnd(38)} ${(bytes.length / 1024).toFixed(1)} kB`);
}
console.log(`\n  ${caras.length} ficheros · ${(total / 1024).toFixed(1)} kB en total`);

/* La OFL obliga a distribuir la licencia con los ficheros. */
const LICENCIAS = {
  "OFL-Cormorant-Garamond.txt":
    "https://raw.githubusercontent.com/CatharsisFonts/Cormorant/master/OFL.txt",
  "OFL-Inter.txt": "https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt",
};
for (const [nombre, origen] of Object.entries(LICENCIAS)) {
  const txt = await fetch(origen).then((r) => r.text());
  writeFileSync(path.join(DESTINO, nombre), txt, "utf-8");
  console.log(`  ${nombre}`);
}

/* El @font-face listo para pegar, con el unicode-range que dio Google. */
const reglas = caras
  .map((c) =>
    [
      "@font-face{",
      `font-family:'${c.familia}';`,
      `font-style:${c.estilo};`,
      `font-weight:${c.peso};`,
      "font-display:swap;",
      `src:url('/fonts/${nombreFichero(c)}') format('woff2');`,
      c.rango ? `unicode-range:${c.rango};` : "",
      "}",
    ].join(""),
  )
  .join("\n");
writeFileSync(path.join(DESTINO, "_font-face.css"), reglas + "\n", "utf-8");
console.log(`\n  reglas @font-face escritas en public/fonts/_font-face.css`);
