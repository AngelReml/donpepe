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
