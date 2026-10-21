/**
 * Modo manual de reseñas (sin API de Google), sin red ni LLM: cargar sin
 * duplicar, cola en orden, aprobar ≠ publicar, y paso a publicada.
 */
delete process.env.RESENAS_DEMO;
import { modoResenas, listReviews } from "../lib/google";
import { cargarManuales, idManual } from "../lib/resenas-manuales";
import {
  refrescarCola,
  siguientePendiente,
  marcarHecha,
  listarAprobadas,
  marcarPublicadas,
  olvidarDecisionesManuales,
  resumen,
  esDueno,
  apuntarVistaEnPrueba,
  vistasEnPrueba,
  reiniciarPrueba,
} from "../lib/resenas-cola";
import { conFirma, redactarRespuestaResena, detectarYTraducir } from "../lib/resenas-draft";

// LLM simulado: así se prueba el circuito de idiomas sin red.
process.env.OPENROUTER_API_KEY = "test";
const llamadas: string[] = [];
globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
  const body = JSON.parse(String(init?.body ?? "{}"));
  const sys: string = body.messages?.[0]?.content ?? "";
  const user: string = body.messages?.[body.messages.length - 1]?.content ?? "";
  let content = "";
  if (sys.includes("detector de idioma")) {
    content = user.includes("Pior comida") ? '{"idioma":"pt","es":"La peor comida de Galicia"}' : '{"idioma":"es","es":""}';
    llamadas.push("detectar");
  } else if (sys.includes("traductor")) {
    content = `[PT] ${user.split("\n\n").slice(1).join("\n\n")}`;
    llamadas.push("traducir");
  } else {
    content = "Sentimos que no te gustase. El churrasco gallego lleva hueso.";
    llamadas.push(user.includes("Escribe SIEMPRE en español") ? "redactar-es" : "redactar-otro");
  }
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}) as typeof fetch;

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  if (ok) console.log(`  ok   ${nombre}`);
  else {
    fallos++;
    console.error(`  FALLA ${nombre} ${detalle}`);
  }
}

async function main() {
  comprobar("sin API y sin demo = modo manual", modoResenas() === "manual");
  comprobar("sin cargar, no hay reseñas", (await listReviews(new Set())).length === 0);

  const lote = [
    { author: "Ana", rating: 5, text: "Arroz buenísimo", time: "hace 1 semana" },
    { author: "John", rating: 2, text: "Cold fish, slow service", time: "hace 2 semanas" },
    { author: "Luis", rating: 4, text: "", time: "hace 3 días" },
  ];
  const r1 = await cargarManuales(lote);
  comprobar("carga 3 nuevas", r1.nuevas === 3 && r1.total === 3, JSON.stringify(r1));
  const r2 = await cargarManuales([lote[0], { author: "Eva", rating: 3, text: "Normal" }]);
  comprobar("no duplica al recargar", r2.nuevas === 1 && r2.yaEstaban === 1 && r2.total === 4, JSON.stringify(r2));
  comprobar("id estable", idManual(lote[0]) === idManual({ ...lote[0] }));

  await refrescarCola(true);
  const primera = await siguientePendiente();
  comprobar("la cola empieza por la peor", primera?.author === "John", primera?.author);

  await marcarHecha(primera!.id, "aprobada", "Sorry… Don Pepe", {
    textoEs: "Lo sentimos… Don Pepe",
    resena: { author: primera!.author, rating: primera!.rating, time: primera!.time, text: primera!.text },
  });
  const ap = await listarAprobadas();
  comprobar("aprobada queda en la lista para publicar", ap.length === 1 && ap[0].respuesta.startsWith("Sorry"));
  comprobar("aprobada guarda la reseña para encontrarla", ap[0].resena?.author === "John");
  comprobar("aprobada sale de la cola", (await siguientePendiente())?.id !== primera!.id);
  let res = await resumen();
  comprobar("resumen: 1 aprobada, 0 publicadas", res.aprobadas === 1 && res.publicadas === 0, JSON.stringify(res));

  const m = await marcarPublicadas([primera!.id, "manual:inexistente"]);
  comprobar("marca publicada solo la aprobada", m.marcadas === 1 && m.ignoradas.length === 1);
  res = await resumen();
  comprobar("resumen: 0 aprobadas, 1 publicada", res.aprobadas === 0 && res.publicadas === 1, JSON.stringify(res));

  const otra = await siguientePendiente();
  await marcarHecha(otra!.id, "saltada");
  const olvidadas = await olvidarDecisionesManuales();
  comprobar("olvidar no toca las publicadas", olvidadas === 1 && (await resumen()).publicadas === 1);

  console.log("\nIdiomas (LLM simulado)");
  const det = await detectarYTraducir("Pior comida da Galicia!");
  comprobar("detecta portugués", det.idioma === "pt" && det.traduccionEs === "La peor comida de Galicia");
  const r = await redactarRespuestaResena(
    { id: "x", author: "F", rating: 1, text: "Pior comida da Galicia!" },
    { idioma: "pt", traduccionEs: det.traduccionEs },
  );
  comprobar("redacta en español con las reglas de la casa", llamadas.includes("redactar-es"));
  comprobar("lo que ve el dueño está en español", r.textoEs.startsWith("Sentimos") && r.textoEs.endsWith("Don Pepe"));
  comprobar("lo que se publica es la traducción", r.texto.startsWith("[PT]") && r.texto.includes("Sentimos"));
  const es = await redactarRespuestaResena({ id: "y", rating: 5, text: "Muy rico" }, { idioma: "es" });
  comprobar("en español no traduce", es.texto === es.textoEs);

  console.log("\nModo prueba (solo el dueño decide)");
  process.env.TELEGRAM_ALLOWED_CHAT_IDS = "8667886664,12345";
  comprobar("el primero es el dueño", esDueno("8667886664") && !esDueno("12345"));
  await refrescarCola(true);
  const p1 = await siguientePendiente(await vistasEnPrueba("12345"));
  await apuntarVistaEnPrueba("12345", p1!.id);
  const p2 = await siguientePendiente(await vistasEnPrueba("12345"));
  comprobar("en prueba avanza a la siguiente", p2 !== null && p2.id !== p1!.id);
  comprobar("la cola del dueño no cambia", (await siguientePendiente())?.id === p1!.id);
  await reiniciarPrueba("12345");
  comprobar("reiniciar la prueba vuelve a la primera", (await siguientePendiente(await vistasEnPrueba("12345")))?.id === p1!.id);

  comprobar("firma añadida si falta", conFirma("Gracias por venir.").endsWith("\n\nDon Pepe"));
  comprobar("firma no duplicada", conFirma("Gracias.\n\nDon Pepe") === "Gracias.\n\nDon Pepe");

  console.log(fallos === 0 ? "\nTodo correcto.\n" : `\n${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
