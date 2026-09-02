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
2. **URL de reseñas de Google** (`lib/resenas.ts`): sin ella, el bloque de
   reseñas y el cartelito imprimible no funcionan. Instrucciones en el
   README, sección 3.1.
3. **Año de fundación**: para el "Desde [FALTA DATO...]" de la carta. No lo
   he inventado, como se pidió.
4. Decide si merece la pena, en una sesión futura: descripciones de plato
   para los 8 idiomas que faltan, traducción legal nativa de los 11 idiomas
   que hoy caen a inglés, y ampliar `/local` a los 18 idiomas (hoy en 6).
   Todo documentado con detalle en la Tarea 2 más abajo, nada roto mientras
   tanto.
5. Cuando tengas la carta de postres real, hay un hueco preparado
   (`Menu.postres` en `lib/types.ts`) — dime y lo conecto.

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
