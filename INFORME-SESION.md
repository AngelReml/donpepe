# Informe de sesión desatendida

**Resumen:** las 7 tareas (0 a 6, con la Tarea 1 corregida a mitad de
sesión) están hechas, comiteadas y subidas a `carta-home`. Ni un byte
tocado en `lib/orchestrator.ts`, `lib/pending.ts`, `lib/actions.ts`,
`lib/prompts.ts`, `lib/kv.ts`, `lib/whatsapp.ts` ni
`app/api/whatsapp/webhook/route.ts` en toda la sesión -verificado con
`git diff` justo antes de escribir esto-. Nada en `main`, nada en
producción. Preview actualizado y funcionando:
https://don-pepe-original-71qg5o8g0-ivan-carbonells-projects.vercel.app
(webhook de Telegram re-registrado contra esta URL, probado sin errores).

**Lo que necesito de ti, en orden de lo más a lo menos urgente:**
1. **Rota el secreto de bypass de Vercel** antes de pasar esto a producción
   (se compartió en el chat, ver nota junto a la de alérgenos en el README).
   *(En espera: pedido expresamente que no se vuelva a mencionar hasta que
   tú digas que has terminado de probar.)*
2. ~~URL de reseñas de Google~~ — **resuelta el 2026-09-02**, ver "Segunda
   ronda posterior" más abajo.
3. **Año de fundación**: para el "Desde [FALTA DATO...]" de la carta. No lo
   he inventado, como se pidió.
4. Decide si merece la pena, en una sesión futura: descripciones de plato
   para los **7 idiomas** que aún faltan (eu, nl, pl, cs, hu, ru, ro — el
   catalán ya está hecho, ver más abajo), traducción legal nativa de los 11
   idiomas que hoy caen a inglés, y ampliar `/local` a los 18 idiomas (hoy
   en 6). Todo documentado con detalle en la Tarea 2 más abajo, nada roto
   mientras tanto.
5. Cuando tengas la carta de postres real, hay un hueco preparado
   (`Menu.postres` en `lib/types.ts`) — dime y lo conecto.
6. Los 4 fallos reales que reportaste tras probar en el navegador (portada
   ilegible, fotos de plato escondidas, bloque de reseñas discreto/sin
   marca de Google, y el fallback silencioso de precios en `/local`)
   están **arreglados y verificados con capturas y medición real** — ver
   "Tercera ronda" más abajo. Nada pendiente de tu parte en estos cuatro.
7. Los 2 fallos del último commit (botón de WhatsApp invisible en móvil, y
   el oscurecimiento pasado de rosca en `/local`) también **arreglados y
   verificados** — ver "Cuarta ronda" más abajo.
8. Los 2 bugs siguientes (pestañas de `/local` inalcanzables en
   escritorio -accesibilidad real- y la mancha del parche de texto)
   también **arreglados y verificados, incluida tu hipótesis del
   `overflow-x:hidden` -comprobada y descartada con pruebas, no de
   oídas-** — ver "Quinta ronda" más abajo.
9. **Foto de plato por Telegram**: propuesta detallada en "Segunda ronda
   posterior", sin construir. Decide y te la implemento.

---

## Ronda posterior (con Telegram real ya probado)

- **Bug encontrado y corregido**: un toque duplicado de botón (doble-toque,
  o Telegram reenviando el toque) podía chocar con el cambio de estado del
  asistente y mostrar "Esto ya no está activo" a mitad de un alta de plato.
  No corrompía nada -la confirmación previa se sigue exigiendo siempre,
  verificado que "Listo, hecho" solo puede aparecer tras un toque real en
  Confirmar-, pero confundía. Corregido con deduplicación por
  `callback_query.id` en `app/api/telegram/webhook/route.ts`.
- Plato de prueba ("arroz con caldo marinero", creado durante la prueba
  real) **borrado** de la carta real tras confirmarlo contigo.
- Bloque de reseñas: "¿Qué tal ha ido?" mantiene, subtítulo cambiado a
  "Dos líneas nos ayudan mucho." (y su adaptación natural en los 18
  idiomas, no traducción literal) — en `/carta`, en `/local` y en el
  cartelito imprimible.
- README: protocolo PAS anotado como plan futuro, con la regla en negrita
  de que ninguna respuesta puede afirmar una acción correctiva que el
  dueño no haya confirmado que es real; y la gramática visual del futuro
  panel de Antonio, también solo anotada, sin implementar.
- Pendiente, no implementado ahora (se propone aparte): que el dueño pueda
  adjuntar una foto por Telegram al dar de alta un plato. La categoría del
  plato **ya se pregunta con botones** desde el primer toque de "Añadir
  plato nuevo" -lo que no se ve en una conversación copiada como texto es
  que los toques de botón no salen como mensajes, así que parece que falta
  el paso y en realidad ya está-.

### Qué revisar tú, desde el móvil, antes de fusionar a `main`

1. **`/carta`**: arroces arriba del todo y destacados; en inglés (u otro
   idioma), que los nombres de plato lleven la segunda línea pequeña
   traducida; el aviso de horario y "comida casera gallega"; el bloque de
   reseñas al final (las 5 estrellas hoy no llevan a ningún sitio real
   todavía, falta la URL).
2. **Selector de idioma**: que aparezcan los 18, y que coreano/japonés/chino
   se vean legibles en tu móvil.
3. **`/local`**: los Mandamientos (pizarra), la historia, el marquee de
   reseñas de siempre, y el nuevo bloque de reseñas con el subtítulo nuevo.
4. **Telegram**: `/plato` (alta de plato, cambio de precio, borrar) y
   `/agotado` (activar/desactivar de un toque, con Deshacer y los botones
   de "Vuelve mañana"/"Vuelve en 2 horas"). Prueba también un doble-toque a
   propósito en algún botón, para confirmar que ya no da el mensaje raro.
5. Confirma que "arroz con caldo marinero" ya no aparece en ningún sitio.
6. Los dos datos que aún faltan de tu parte: **año de fundación** (para el
   "Desde [FALTA DATO...]" de la carta) y **URL de reseñas de Google**
   (para que las estrellas funcionen de verdad). Sin ellos no rompe nada,
   pero tampoco están completos.


Rama: `carta-home`. Ningún push a `main`, ningún despliegue a producción.
Ficheros protegidos (`lib/orchestrator.ts`, `lib/pending.ts`, `lib/actions.ts`,
`lib/prompts.ts`, `lib/kv.ts`, `lib/whatsapp.ts`, `app/api/whatsapp/webhook/route.ts`)
sin tocar en toda la sesión — verificado con `git diff --stat` antes de cada commit.

Este documento se actualiza según avanza cada tarea. Si algo queda a medias,
está anotado explícitamente en su sección, no oculto.

---

## Segunda ronda posterior (2026-09-02) — catalán, URL de reseñas, propuesta de fotos

**1. Catalán en las 39 descripciones — hecho.** `data/traducciones.json`
gana la clave `ca` en las 39 frases, al mismo nivel de cobertura que
ko/ja/zh (motivo dado por el dueño: "es el idioma que señaló personalmente
como ofensivo por su ausencia"). Los otros 7 (eu, nl, pl, cs, hu, ru, ro)
siguen exactamente como estaban, sin tocar. `npm run build` (que corre la
protección de alérgenos primero) pasa limpio.

**2. URL real de reseñas — hecha y verificada de verdad, no solo compilada.**
`lib/resenas.ts` ya no tiene el literal `FALTA_DATO`:

```
GOOGLE_REVIEWS_URL = "https://search.google.com/local/writereview?placeid=ChIJ5bsZXwAbLw0RXQuMcWz4AwM"
```

Verificación realizada (no solo "compila"):
- Un script generó el PNG con el mismo código exacto de
  `app/api/qr/resenas/route.ts` (`QRCode.toBuffer`, mismas opciones) y lo
  decodificó con `jsQR`: el texto decodificado coincide **carácter a
  carácter** con la URL de arriba.
- Petición HTTP real a esa URL decodificada: responde `302` hacia
  `accounts.google.com/ServiceLogin?continue=...writereview?placeid=...` —
  es decir, pide iniciar sesión y luego continúa exactamente al formulario
  de reseña de esa ficha. No es un 404 ni una búsqueda genérica.
- Se montó el servidor de producción real (`npm run build && npm run
  start`) y se pidió `/api/qr/resenas` (A5 y A6) con la contraseña de
  `QR_ADMIN_PASS` por Basic Auth: **200, `content-type: application/pdf`**,
  PDF válido de verdad (antes daba 400 por la URL sin rellenar). Sin
  contraseña, sigue dando 401 — la protección no se ha tocado.
- Nota para quien retome esto: `QR_ADMIN_PASS` **no está en `.env.local`**;
  para volver a probar el cartelito en local hay que exportarla a mano al
  arrancar el servidor.

**3. Foto de plato por Telegram — SOLO PROPUESTA, no construida.** El dueño
pidió expresamente no implementar esto todavía y decidir después de ver la
propuesta. Resumen (versión completa se dio en el chat):

- **Dónde se guardan**: Vercel Blob (integración nativa del mismo
  ecosistema que ya usa KV; no hace falta infraestructura nueva). Requiere
  provisionar el almacén desde el dashboard de Vercel -paso que no puede
  hacer el agente solo, igual que pasó con KV/Upstash-.
- **Coste**: Blob tiene un nivel gratuito con cargo por uso a partir de
  ahí; para el volumen de un restaurante (unas pocas fotos nuevas al mes)
  se espera que quede dentro de lo gratuito, pero el precio exacto vigente
  hay que confirmarlo en el propio dashboard antes de decidir, no de
  memoria.
- **Peso en la carta con mala cobertura**: las 38 fotos actuales de
  `public/img` pesan de media **119 KB** (ya optimizadas por el proceso de
  diseño antes de llegar al repo). Una foto de móvil sin optimizar puede
  pesar varios MB. Sin un paso de compresión/redimensionado en el propio
  flujo de Telegram (antes de subir a Blob), cada plato nuevo con foto
  pesaría 10-40× más que los actuales para un cliente con mala señal — hay
  que redimensionar y recomprimir en el servidor al recibir la foto, no
  subir el original de Telegram tal cual.
- **Viable sin tocar los 7 ficheros protegidos**: sí. `ActionSchema.add_item`
  no tiene (ni tendría que ganar) un campo `imagen` — tocar
  `lib/actions.ts` está prohibido. El mismo patrón ya usado para la
  caducidad de `agotados.ts` sirve aquí: tras confirmar el alta del plato
  (acción protegida, sin modificar), un paso posterior **fuera** del
  sistema de acciones escribe la URL de la foto directamente vía
  `getMenu`/`setMenu` (ya exportadas de `lib/kv.ts`, reutilizables). Todo
  el código nuevo iría en `lib/telegram.ts` (descargar la foto vía
  `getFile` de la API de Telegram), `lib/telegram-wizard.ts` (paso nuevo
  del asistente) y un módulo nuevo, p. ej. `lib/fotos.ts`, para subir a
  Blob y comprimir.

**Pendiente de tu decisión**, con esos cuatro puntos ya sobre la mesa. No se
ha escrito ni una línea de la funcionalidad en sí.

---

## Tercera ronda (2026-09-02) — 4 fallos reales encontrados en el preview

Reportados por ti tras probar de verdad en el navegador. Los cuatro
arreglados, en el orden pedido, cada uno con commit propio, verificados con
capturas y medición real (no a ojo) antes de darlos por buenos.

**1. Legibilidad de la portada de `/local` — hecho.** Ver commit
`74b92b9`. Medido con un script que renderiza la página real en Chrome,
oculta el texto para leer el fondo puro, y calcula el contraste WCAG con
los colores reales. Antes: el eyebrow dorado llegaba a 1.7:1 (necesita
4.5:1). Después, en 390px y 1440px, con la foto recortada distinto en
cada uno: 5.2–8.8:1 en el eyebrow, 15–18.5:1 en el título, 6.1–7.2:1 en
el subtítulo — mirando tanto el promedio como el píxel más claro
encontrado dentro de cada caja de texto. La foto no se tocó: se añadió
una segunda capa que oscurece el centro (donde vive el texto siempre) y
deja respirar los bordes, más una sombra de texto reforzada.

**2. Fotos de los platos en `/carta` — diagnosticado y corregido.** Ver
commit `0dec6f7`. Diagnóstico real, no supuesto: el desplegable SÍ
funcionaba (verificado con un clic real en Playwright). El problema de
verdad era doble: (a) la sección destacada de arroces, lo primero que se
ve al entrar en `/carta`, nunca implementó fotos — quien probara ahí
primero veía solo texto; (b) incluso donde funcionaba, era un
desplegable sin ninguna pista visual, invisible de puro escondido. Fix:
miniatura siempre visible junto a cada plato con foto (ninguna si no la
tiene), con `next/image` — lazy real y formato moderno automático.
Medido con red real, no supuesto: 18 miniaturas visibles pesan 17,7 KB
en total. Tocarla abre la foto grande.

**3. Bloque de reseñas — los 4 puntos, hecho, en `/carta` y `/local`.**
Ver commit `6efa5f1`. (a) Logo de Google + "Déjanos tu reseña en
Google", en los 18 idiomas. (b) Relleno progresivo de verdad al pasar
el ratón o el dedo, verificado con Playwright estrella por estrella.
(c) Verificado explícitamente que sigue habiendo un único `<a>` con el
mismo `href` de siempre, antes y después del hover — nada condicional.
(d) Estrellas de 44px (antes 28px), más aire, separación clara del
contenido anterior. **Bug real encontrado de paso**: el bloque de
`/local` seguía con el literal `[FALTA DATO...]` como enlace — nunca se
sincronizó cuando se resolvió la URL real en `lib/resenas.ts`, porque
`/local` es HTML estático y no puede importar ese módulo. Corregido con
la URL real y un comentario explicando que hay que mantener las dos
copias sincronizadas a mano si cambia algún día.

**4. Las dos cartas — aclaración inicial, y luego arreglado a petición
tuya.** `/local` NO tiene precios propios de verdad: trae un `TABS`
estático (respaldo de diseño, con descripciones/alérgenos/fotos) y en
cuanto carga hace `fetch` al mismo `/api/menu` (misma KV) que usa
`/carta`, y **sobrescribe** precio, nombre, disponibilidad y el aviso
con los datos en vivo. El riesgo real que señalé — que si ese `fetch`
fallaba, `/local` se quedaba en silencio mostrando el precio ESTÁTICO de
cuando se compiló la web, sin avisar — lo pediste arreglar. Hecho, ver
commit `716286b`:

- Un intento con límite de 4s (`AbortController`) y **un** reintento
  antes de rendirse — no cuelga la carta en un móvil con mala señal, pero
  tampoco se rinde a la primera petición que puede ser un simple parpadeo
  de red.
- Si tras el reintento sigue sin llegar: se ocultan TODOS los precios
  (platos sueltos, puntos guía, y los menús del día de precio fijo) y
  aparece un aviso sobrio y traducido a los 6 idiomas estáticos: "No
  hemos podido cargar los precios actualizados. Consulta la carta con el
  personal." Nombre, descripción, alérgenos y foto siguen mostrándose —
  no dicen nada sobre lo que se cobra.
- Verificado simulando el fallo de verdad con Playwright (no a ojo, dos
  escenarios distintos): con un fallo inmediato de red, cae al aviso en
  ~3,7 s con **0 precios visibles en pantalla** (medido con
  `getComputedStyle`/`getBoundingClientRect`, no solo mirando el DOM); con
  una API que se queda COLGADA sin contestar nunca —para probar el
  límite de tiempo de verdad, no solo el camino del error inmediato—,
  cae al aviso en ~8,3 s, sin quedarse esperando indefinidamente. Con la
  API funcionando normal, sin interceptar nada: el aviso no aparece y los
  37 precios de la página se ven con normalidad — el camino feliz sigue
  intacto. Captura real guardada con el aviso y varios platos sin precio
  a la vez, uno junto al otro.

---

## Cuarta ronda (2026-09-03) — dos fallos reales del último commit

**1. Botón de WhatsApp invisible en móvil real — encontrado y arreglado.**
Causa real (no supuesta): probar solo redimensionando la ventana del
navegador no reproducía nada -código y capturas correctos a cualquier
ancho-; hubo que emular Android/Chrome de verdad (`isMobile`+`hasTouch`,
no solo el viewport) para reproducirlo. El selector de 18 idiomas (`nav`
con `overflow-x-auto` y 18 pastillas `shrink-0`) hacía que Chrome en
móvil calculase un "viewport de layout" de 774px sobre una pantalla real
de 412px -confirmado quitando elemento a elemento del DOM hasta ver cuál
lo causaba-. La barra fija de Reservar/WhatsApp heredaba ese viewport
inflado: Reservar coincidía por casualidad con casi toda la pantalla
real, y WhatsApp quedaba fuera de los 412px visibles del todo, sin
ningún indicio de que hiciera falta scroll horizontal. El propio
`overflow-x-auto` del selector SÍ recortaba bien su contenido en el
layout final -comprobado aparte-, pero eso no evitaba que Chrome, en
móvil, calculara el viewport a partir del contenido interno antes de
aplicar ese recorte. Arreglado con `contain:layout` en el `nav` -aísla
su contenido para que no cuente en ese cálculo- más `overflow-x:hidden`
en `html,body` como red de seguridad general. Verificado con Chrome real
emulando Android a 360px, 390px y 430px: `window.innerWidth` coincide
con el ancho real en los tres, Reservar y WhatsApp con el mismo ancho y
la misma altura, WhatsApp dentro de los límites reales de la pantalla.
El selector de idioma sigue siendo desplazable igual que antes.

**2. Oscurecimiento de `/local` — corregido tras pasarse de la raya.**
La corrección de la ronda anterior sí pasaba WCAG AA pero oscurecía
casi toda la pantalla y apagaba la foto -la queja concreta: "la piedra
iluminada, la ventana y el plato de vieiras se ven apagados y turbios",
título en un gris percibido en vez de blanco puro-. Rehecho con recursos
LOCALES: el velo global casi se ha quitado (pico de opacidad de .97 a
.32, ya no sostiene el contraste); nuevo `.cap::before`, un parche
oscuro con blur() pegado justo al bloque de texto -se ajusta solo al
contenido real de cada escena, sin las esquinas más claras que deja un
óvalo-, que se disipa en poco espacio hacia fuera de esa caja sin tocar
el resto del fotograma; título y cita en blanco puro (`#fff`); sombra de
texto en cuatro direcciones (un contorno real). Verificado con captura
ANTES/DESPUÉS de las tres escenas (piedra, interior, vino y vieiras -la
"segunda pantalla" que señaló, en realidad la tercera escena del
carrusel, no la segunda- ) y con la misma medición de contraste real que
la vez anterior, esta vez exigida solo dentro de la caja de cada
elemento de texto: las tres escenas pasan AA con margen, promedio y peor
punto, en móvil. Bug real de método encontrado y corregido a mitad de la
verificación: ocultar el propio contenedor para medir el fondo también
apagaba su `::before` -es su propio pseudo-elemento-, así que la primera
vuelta de medidas era del fondo SIN el parche puesto; corregido ocultando
solo el texto, no el contenedor.

---

## Quinta ronda (2026-09-03) — dos bugs más, uno de accesibilidad real

**1. Pestañas de categoría de `/local` inalcanzables en escritorio —
arreglado, y la hipótesis del usuario descartada con pruebas.** El
usuario sospechaba que `overflow-x:hidden` en `html,body` (commit
`215a612`) había roto el desplazamiento. Comprobado y descartado: ese
commit tocó solo `app/globals.css` y `components/SelectorIdioma.tsx`,
ambos exclusivos de `/carta`; `/local` es HTML estático con su propia
hoja de estilos y ni siquiera carga `app/globals.css`. Además, el
`overflow-x:hidden` del `body` de `/local` existe desde el primerísimo
commit del proyecto. La causa real, la misma en las TRES barras
deslizables del sitio (auditadas todas: pestañas de `/carta`, selector
de 18 idiomas de `/carta`, y `.fmTabs` de `/local`): `overflow-x-auto`
con la barra de scroll ocultada y cero alternativas de entrada -ni rueda
de ratón, ni arrastre, y confirmado con pulsaciones de Tab reales que el
foco de teclado se movía entre botones pero nunca desplazaba el
contenedor-. Viene del diseño original, no de nada de esta sesión.
Arreglado con un criterio distinto según el dispositivo: con ratón, las
categorías se reparten en varias filas (viven en contenedores de ancho
acotado, nunca hace falta deslizar); en táctil, se mantiene el desliz
horizontal pero ahora con dedo, rueda, arrastre y teclado con flechas
+ foco itinerante, más flechas visibles y desvanecido en el borde
cuando de verdad queda algo oculto. Nuevo componente compartido
`components/FilaDeslizable.tsx`. Verificado que el botón de WhatsApp
sigue intacto a 360/390/430px tras este cambio. Ver commit `3fe4280`.

**2. Oscurecimiento de `/local`, tercera vuelta — quitada la mancha.**
La segunda vuelta pasaba WCAG pero se veía como un parche rectangular
con un borde localizable. Cualquier parche, por difuminado que esté,
tiene un borde en algún punto. Rehecho sin ninguna forma reconocible:
un único degradado vertical a todo el ancho completo (al cubrir todo el
ancho no queda ningún borde lateral), disipándose muy despacio del 10%
al 90% de la altura de la pantalla, más apoyo en la sombra de texto y
menos en oscurecer el fondo. Verificado con capturas antes de darlo por
bueno: no se puede señalar un punto donde el oscurecimiento "termine"
en ninguna de las tres escenas ni en escritorio, y sigue pasando AA con
margen (promedio y peor punto) dentro de la caja de cada elemento de
texto. Ver commit `09c7b11`.

---

## TAREA 0 — Plato oculto (urgente)

**Hecho, antes incluso de recibir el encargo por escrito.** El plato que quedó
`disabled: true` en la KV real durante la prueba en vivo fue
**`pescados/pescado-dia` ("Pescado del día")**. Se detectó comparando la KV
contra `data/menu.json` y se reactivó verificando antes/después contra la KV
real (no un mock). Verificación final repetida al empezar esta sesión: **cero
platos con `disabled: true`** en la carta real ahora mismo.

---

## TAREA 1 — Interruptor de un toque (corrección de diseño)

**Hecho.** Rediseñado desde la versión anterior de esta misma sesión (la que
pedía duración ANTES de confirmar): ahora agotar/reactivar es un solo toque,
sin confirmación, con "Deshacer" y caducidad opcional DESPUÉS.

- `/agotado`: todos los platos en una pantalla, agotados arriba (orden
  estable), sin navegar por categoría.
- Cada botón alterna `disabled` al instante (`lib/agotados.ts:alternarDisponibilidad`),
  escribiendo directo con `setMenu` -ya exportado, sin tocar `lib/kv.ts`- y
  registrando con `appendLog` para que "deshacer último cambio" de WhatsApp
  también lo vea.
- Tras agotar: botones opcionales "Vuelve mañana" / "Vuelve en 2 horas" +
  "Deshacer". Si no toca nada, se queda agotado indefinido (comportamiento
  de siempre). El mensaje, al poner plazo, dice la fecha/hora exacta
  (`Europe/Madrid`).
- Alta de plato, cambio de precio y borrado definitivo: **sin cambios**,
  siguen exigiendo confirmación previa por `lib/pending.ts`/`handleOwnerMessage`.

**Verificado contra la KV real** (la misma que sirve `/carta`): 3 ciclos
completos de agotar→reactivar sobre "Milanesa de pollo" (`carnes/milanesa`),
comprobando en cada toque que la carta pública (`menuConReactivacionAutomatica`)
coincide con el resultado del interruptor. Al terminar, las 34 entradas del
menú son idénticas a `data/menu.json`, incluido `disabled` — el menú quedó
exactamente como se encontró.

Commit: `interruptor-un-toque-tarea-1` (ver git log).

---

## TAREA 2 — 18 idiomas (la grande)

**Hecho, con alcance recortado y documentado — léelo, hay una decisión importante dentro.**

Ampliado `lib/i18n.ts` de 7 a 18: `es, gl, en, pt, fr, de, it, ca, eu, nl, pl,
cs, hu, ko, ja, zh, ru, ro`. Catalán incluido (obligatorio). Nada reescrito:
mismo `elegirIdioma`, mismo `IDIOMAS`/`TEXTOS`/selector, mismo glosario
gallego de `lib/traducir.ts`.

**Verificado de verdad, servidor real:**
- Selector: 18 enlaces `/api/idioma?lang=...` en `/carta`, uno por idioma.
- Detección por `Accept-Language`: `ko-KR` → `<html lang="ko">`, título en
  coreano. `zh-CN` → `lang="zh-Hans"`, título en chino. `ja-JP` → `lang="ja"`,
  título en japonés. `ca-ES` → catalán. Las cuatro correctas.

**Nombres de plato a dos alturas (función nueva, no existía):**
`data/nombres-platos.i18n.json` + `lib/nombres-platos.ts`. El nombre real
(`data/menu.json`) es SIEMPRE el principal, en todos los idiomas -para poder
señalar y pedir por él-; la traducción es una segunda línea, más pequeña, y
solo aparece donde hay una traducción buena. Especialidades sin equivalente
razonable (zorza, raxo, caldo gallego, criollo...) se quedan sin segunda
línea a propósito -la descripción, ya traducida, es la que explica qué son-.
Verificado: 14/14 platos de "Entrantes" con segunda línea en coreano, 0 en
español (el idioma base no lleva segunda línea).

**Descripciones de plato:** `data/traducciones.json` ampliado con coreano,
japonés y chino (los tres idiomas prioritarios, "el público que peor
atiende" según el dueño) para las 39 frases existentes. Sigue siendo
"generado y guardado en archivo", nunca una llamada en vivo -la carta usa
`traducirDescripciones(..., {soloCache:true})`, que ya existía y no se toca-.

**RECORTE DE ALCANCE, decidido por tiempo, documentado aquí y no oculto:**
- **8 de los 18 idiomas** (catalán, euskera, neerlandés, polaco, checo,
  húngaro, ruso, rumano) **no tienen descripción de plato traducida
  todavía.** En la carta, esas descripciones caen a español -nunca rotas,
  nunca en blanco, nunca una llamada en vivo a un traductor-. El nombre del
  plato (con o sin segunda línea, según el idioma) y toda la interfaz SÍ
  están completos en los 18.
- **Páginas legales (`/aviso-legal`, `/privacidad`):** para no arriesgar una
  traducción legal mala en 11 idiomas que no domino con la misma confianza
  -un aviso legal mal traducido es peor que uno en inglés-, esos 11 idiomas
  **muestran el texto legal en inglés** (`lib/legal.ts:conFallbackIngles`),
  no en su propio idioma. Está señalizado en el propio código y en el
  README. Sustituir por traducción revisada por un hablante nativo antes de
  presentarlo como referencia legal real en esos mercados.
- **El escaparate estático (`/local`)** sigue generándose solo en los 6
  idiomas de antes (gl, en, pt, de, fr, it): ampliarlo a 18 es el propio
  sistema de `scripts/generar-portada.mjs` + `data/portada*.i18n.json`
  (931 + 243 líneas ya solo para 6 idiomas), un trabajo grande aparte. Para
  que esto NO rompa nada, `middleware.ts` ahora comprueba qué idiomas tienen
  portada generada de verdad y cae a español si no la hay -antes de este
  cambio, pedir /local en un idioma nuevo habría dado un 404-.

Pendiente para una sesión futura, si se decide priorizarlo: descripciones de
plato para los 8 idiomas restantes, traducción legal nativa de esos 11, y
ampliar /local a 18.

---

## TAREA 3 — Reseñas (corrige la versión anterior)

**Hecho.** Sin chupito: no había código de esa idea en el repo (la única
coincidencia de "chupito" es un plato real del menú, "Pan, café, chupito de
orujo", que no se toca).

- `lib/resenas.ts`: única constante `GOOGLE_REVIEWS_URL`, literal
  `[FALTA DATO: URL corta de reseñas de Google]`, documentada en el README
  (sección 3.1) con dónde conseguirla y por qué no se construye a partir del
  place_id.
- `components/BloqueResenas.tsx`: título + 5 estrellas + subtítulo. Las 5
  estrellas son **un único `<a>`** (no cinco), verificado en el HTML real:
  imposible que apunten a sitios distintos sin cambiar el componente. Nada
  de ventanas emergentes.
- Añadido al final de `/carta` (verificado: aparece, con la URL de marcador
  en el `href`) y como sección propia en `/local`, junto al marquee de
  reseñas que ya existía ahí, con su propia clase CSS sobria
  (`.resenasBloque`) — traducido a los 6 idiomas de `/local` vía
  `data/portada.i18n.json` y regenerado con `generar-portada.mjs` (0
  fragmentos que falten).
- Textos "¿Qué tal ha ido?" / "Tu opinión ayuda mucho a un negocio pequeño."
  añadidos a los 18 idiomas de `TEXTOS` (para `/carta`).
- `app/api/qr/resenas/route.ts`: cartelito A5/A6, reutiliza `sinFragmento`
  de `lib/qr.ts` sin tocarlo. Probado: con el `GOOGLE_REVIEWS_URL` todavía
  sin rellenar, responde 400 con mensaje claro en vez de generar un QR
  roto -exactamente lo que se pedía-.

---

## TAREA 6 — Documentación pendiente

**Hecho**, ambas notas en el README (sección "3.1" y junto a la nota de
alérgenos existente):
- La protección de alérgenos es de tiempo de **compilación**
  (`npm run build`), no de tiempo de ejecución -no fue posible sin tocar
  `lib/actions.ts`/`lib/orchestrator.ts`-.
- El secreto de bypass de protección de Vercel se compartió en esta
  conversación (canal no seguro): anotado que hay que rotarlo antes de
  producción, con los pasos exactos.

---

## TAREA 4 — Arroces y horario

**Hecho.**
- `components/SeccionArroces.tsx`: los arroces en su propia sección
  destacada (borde y etiqueta "Especialidad de la casa"), arriba del todo en
  `/carta`, antes de las pestañas normales -verificado por posición real en
  el HTML (byte 12096 vs. 14787 de las pestañas)-. Siguen apareciendo
  también dentro de su pestaña normal, esto es un adelanto, no un reemplazo.
- "Cocina abierta desde las 19:00, todos los días.": traducido a los 18
  idiomas (`TEXTOS.horarioAviso`) y verificado en `/carta`; y en `/local`,
  traducido a los 6 idiomas estáticos vía `portada.i18n.json`, verificado en
  el HTML generado.
- "Comida casera gallega": mismo patrón, en `/carta` y `/local`.
- "Desde [FALTA DATO: año exacto de fundación]": literal EXACTO, sin
  inventar nada, verificado que aparece tal cual en el HTML servido.
- Postres: `lib/types.ts` -no está en la lista de ficheros prohibidos- gana
  un campo `postres?: PlatoBase[]` **opcional**, a propósito NO añadido a
  `CategoriaMenu`/`CATEGORIAS` (eso arrastraría cambios a `ActionSchema` y al
  asistente de Telegram). Sin contenido, no aparece ninguna pestaña ni botón
  en ningún sitio: el hueco existe en el tipo, invisible hasta que haya
  datos reales.

---

## TAREA 5 — Los Mandamientos del Don Pepe

**Hecho**, en `/local`, estética de tiza sobre pizarra (CSS puro, sin foto
de fondo: gradiente + sombra de texto, tal como se pedía si no se usa una
foto real). Verificado con una captura de pantalla real (Chrome, vía
Playwright) tras corregir un solape con el logotipo del preloader -no era un
bug del bloque nuevo, solo que la captura se hizo antes de que el preloader
terminara de ocultarse-.

**Excluidos del sistema de 18 idiomas de la única forma que tenía sentido
sin construir un mecanismo nuevo**: el bloque no tiene ninguna clave en
`data/portada.i18n.json`, así que `generar-portada.mjs` -que solo traduce lo
que tiene clave- lo copia tal cual, en castellano, a las seis versiones
generadas. Verificado explícitamente: `public/inicio.en.html` contiene
"Pecar, se puede." en español, con `lang="es"` en la propia sección para que
un lector de pantalla no lo pronuncie como si fuera inglés. No lo he tocado
en ningún idioma; la adaptación a mano a EN/PT/FR/DE/IT queda pendiente,
como se pidió.
