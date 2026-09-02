# Informe de sesión desatendida

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
