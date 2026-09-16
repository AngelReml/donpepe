# Don Pepe — Sistema de reseñas
**Fecha:** 4 de septiembre de 2026
**Documento autocontenido.** Auditoría del material de Flavia 360 + propuesta de implementación.

---

## 0. Veredicto en una línea

Del material de Flavia **no se aprovecha ni una línea de código**: está roto de raíz (lee de una API que no puede responder y publica con el ID equivocado). Se aprovecha **una idea de producto y una estética**. Y lo más importante: **el 70 % del sistema de reseñas ya está construido dentro de Proyecto1** — solo está enchufado al canal muerto (WhatsApp) en lugar de a Telegram.

---

## 1. Lo que ya tienes hecho y no estaba en el radar

Estos ficheros ya existen en Proyecto1 y ya hacen el trabajo:

| Fichero | Qué hace ya |
|---|---|
| `lib/google.ts` | Cliente de Google Business Profile. Lista reseñas y publica respuesta con `PUT .../reviews/{id}/reply`. **Está bien hecho.** Trae modo simulación con `data/sample-reviews.json` |
| `lib/prompts.ts` → `REVIEW_REPLY_SYSTEM` | Prompt de redacción con la voz del local: plural, tuteo, teléfono solo en 1-2★, máx. 380 caracteres, prohibido inventar platos |
| `lib/orchestrator.ts` → `buildReviewDraft` + `handleReviewConfirmation` | Genera el borrador y gestiona PUBLICAR / EDITAR / NO |
| `app/api/reviews/poll/route.ts` | Cron protegido con `CRON_SECRET`, control de vistas, límite de 20/hora |
| `vercel.json` | Cron ya programado, diario a las 10:00 |

**Lo que falta de verdad son tres cosas, no un sistema entero:**

1. El flujo sale por **WhatsApp**, canal que abandonaste. Hay que sacarlo por **Telegram**, donde ya vive el bot.
2. Solo contempla **reseñas nuevas**. Las **89 del histórico** no tienen recorrido.
3. Google todavía no ha aprobado el acceso a la API (`GOOGLE_REVIEWS_ENABLED="false"`).

---

## 2. Auditoría del material de Flavia

### 2.1 Fallos que impiden que funcione (no son matices)

**a) Lee de una API que no puede hacer el trabajo.**
El workflow principal consulta `places.googleapis.com/v1/places/{id}` con FieldMask `reviews`. La Places API devuelve **como máximo 5 reseñas**, no las pagina, no da el identificador que hace falta para responder, y su política **prohíbe almacenar el contenido** que devuelve (justo lo que el workflow hace al meterlo en Supabase). Para leer y responder solo sirve la Business Profile API.

**b) Publica la respuesta con el ID equivocado y con el método equivocado.**
En `n8n_workflow_aprobacion.json`, el nodo *Build Business Name* construye:
`accounts/{cuenta}/locations/{local}/reviews/{item.id}` — donde `item.id` es **el UUID de la fila de Supabase**, no el ID de la reseña en Google. Y llama con `POST` cuando el endpoint de respuesta es `PUT`. Resultado: 404 en todas las ejecuciones. Nunca ha publicado nada.

**c) Las claves y las URLs nunca se resuelven.**
Todos los nodos Code llevan `` `{{$env.OMNIROUTER_URL}}` `` dentro del JavaScript. n8n **no evalúa plantillas dentro del código de un nodo Code**: eso llega al `fetch` como texto literal. Primera ejecución, primer error.

**d) No hay deduplicación.**
El README dice *"IF reviewId not in Supabase"*. En el JSON ese nodo **no existe**. Cada 15 minutos reinserta las mismas reseñas y reenvía los mismos WhatsApp. 96 avisos duplicados al día por local.

**e) El aviso por WhatsApp no se puede enviar.**
Manda `type: "interactive"` con botones a un cliente que no ha escrito antes. Fuera de la ventana de 24 h, Meta solo permite **plantillas aprobadas**. Es exactamente el muro contra el que ya chocaste en Don Pepe y por el que migraste a Telegram.

**f) La rama "Editar" siempre revienta.**
El botón de WhatsApp no envía texto, y el webhook lanza excepción si `edited_text` viene vacío. La mitad del flujo de aprobación está muerta por diseño.

**g) El webhook de aprobación no valida nada.**
Sin firma, sin token, sin comprobación de origen. Cualquiera que descubra la URL publica texto en Google en nombre del cliente. Tu propio código hace lo contrario y lo hace bien: `verificarSecretToken` en Telegram, `X-Hub-Signature-256` en WhatsApp.

**h) El esquema rechaza sus propios datos.**
El normalizador pone `rating: 0` cuando falta. La tabla tiene `check (rating between 1 and 5)`. Insert rechazado.

**i) Hay dos JSON contradictorios.** `n8n_x5f_workflow_x5f_flavia360.json` usa tipos de nodo que no existen en n8n (`"type": "cron"`, `"openAi"`, `"supabase"` a secas). Es un esbozo presentado como entregable.

### 2.2 Fallos de criterio, más graves que los técnicos

**El filtro anti-negativa.** La *Plantilla 3* del pack de arranque propone una landing: 😍 → va a Google, 😐 → va a tu WhatsApp. Eso es *review gating* y la política de Google lo prohíbe expresamente. Es la misma línea que ya decidiste no cruzar con el chupito de Antonio. **Descartado, y no se le ofrece a ningún cliente.**

**Respuestas con hechos inventados.** Los textos "listos para copiar" prometen una fumigación completa, fundas anti-chinches con cremallera, revisión quincenal, sonda a 90º, punto de carga gratuito para e-bikes. Nadie verificó que nada de eso existiera. Eso lo firma el dueño en público y lo lee el siguiente cliente que entra por la puerta.
→ **Regla de la casa: no se promete una acción correctiva que el local no haya hecho.** Se reconoce el fallo y se ofrece hablarlo. Punto.

**El número de venta es inventado.** "1 estrella más = 25k€ año extra" no sale de ningún sitio. Si ese argumento se usa delante de un cliente, hay que poder enseñar de dónde sale. [FALTA DATO: fuente]

**Modelo barato para lo que se publica.** Groq/omnirouter con `llama-3.1-8b` está bien para clasificar. Lo que se publica bajo el nombre del cliente no es el sitio para ahorrar céntimos.

---

## 3. Qué se salva

- **La estética y el concepto del dashboard**: bandeja de pendientes, un botón que publica, evolución de la nota a 30 días, palabras negativas más repetidas. Buena idea de producto y buen material de venta. El HTML está compilado y minificado: **se rehace, no se reutiliza**.
- **La idea del ciclo de estados** (`pendiente → aprobada → publicada`). Sin Supabase: en Don Pepe eso es una clave de KV.
- **El informe mensual como concepto facturable.** Es lo que convierte esto en cuota y no en un favor.

Nada más.

---

## 4. Propuesta: el mismo bot, tres comandos

**Principio:** ni n8n, ni Supabase, ni Softr, ni un segundo bot. Todo dentro de Proyecto1, que ya tiene KV, crons, LLM, Telegram y el cliente de Google. Una pieza menos que mantener es una pieza menos que se rompe un sábado a las tres.

### Lo que ve Antonio

```
/resenas          → la siguiente pendiente, con el borrador ya escrito
/resenas 3        → las tres siguientes, de una en una
/resenas estado   → cuántas quedan, cuántas respondidas, nota actual
```

Y bajo cada borrador, cuatro botones:

**✅ Publicar · 🔄 Otra versión · ✏️ Escribo yo · ⏭️ Saltar**

Nada más. Sin menús anidados. Es el mismo gesto que ya conoce de agotar un plato.

### Dos modos sobre el mismo motor

- **Backlog**: las 89 históricas, de la peor a la mejor. Se vacía a ritmo de Antonio.
- **Guardia**: reseña nueva → aviso automático a Telegram con el borrador ya hecho. El cron diario ya existe.

### Cambios por fichero

| Fichero | Cambio |
|---|---|
| `lib/resenas-cola.ts` *(nuevo)* | Cola en KV: pendientes, respondidas, saltadas. Ordenada por estrellas ascendente |
| `lib/telegram-wizard.ts` | Pantalla de reseña + los cuatro botones (`res:pub`, `res:otra`, `res:edit`, `res:skip`) |
| `app/api/telegram/webhook/route.ts` | Enrutar `/resenas` y los callbacks `res:*` |
| `lib/orchestrator.ts` | `buildReviewDraft` acepta *"otra versión"* (temperatura más alta + evitar el texto anterior) |
| `app/api/reviews/poll/route.ts` | Avisar por **Telegram**, no por WhatsApp |
| `lib/google.ts` | Corregir los cuatro bugs de la sección 6 |
| `app/resenas/page.tsx` *(nuevo, fase 2)* | El dashboard: nota, evolución, pendientes, palabras repetidas. Tu material de venta |

### Guardarraíles (no negociables)

1. **Nada se publica sin que Antonio toque el botón.** Cero automático, siempre.
2. **El borrador no inventa hechos.** Ni protocolos nuevos, ni compensaciones, ni platos que no están en la carta.
3. **Reseña ya respondida en Google = no se toca.** Se filtra antes de generar nada.
4. **Solo el chat_id del dueño**, igual que la carta.
5. **Registro de todo lo publicado** en el log de KV, con fecha y texto exacto.

---

## 5. El bloqueo real: el acceso a la API

Hay que decirlo sin adornos: **hoy el bot no puede publicar en Google.** La API de Business Profile arranca con cuota 0 y hace falta aprobación manual de Google.

**Requisitos para pedirla** (verificados el 4-sep-2026): ficha verificada y activa desde hace 60+ días · web del negocio (✔ donpepeoriginal.es) · proyecto en Google Cloud · solicitar desde un email que sea propietario o gestor de la ficha. La aprobación va de **días a semanas**. Se comprueba mirando la cuota: 0 QPM = no aprobado, 300 QPM = aprobado.

**Ruta A — pedirla ya.** Cuesta una tarde. Hasta que llegue, todo lo demás se construye y se prueba con el modo simulación que ya existe.

**Ruta B — empezar a facturar sin esperarla.** El bot genera los 89 borradores igual. Se pegan a mano en la ficha de Google. Son una tarde de trabajo, una sola vez, y el resultado que ve Antonio es idéntico. **Las reseñas son la prioridad número uno que él te dijo: no se aplaza tres semanas esperando a un formulario.**

**Ruta C — descartada.** Automatizar el navegador contra el panel de Google Business Profile. Va contra sus condiciones y lo que se arriesga es la ficha de un cliente. No se hace.

---

## 6. Bugs encontrados en tu propio código

En `lib/google.ts`, modo real (nunca se ha ejecutado porque está en simulación):

1. **`starRating` es texto, no número.** Google devuelve `"FIVE"`, `"FOUR"`… y `Number("FIVE")` es `NaN`. Hay que mapear el enum.
2. **No filtra las ya vistas.** En simulación filtra por `seen`; en modo real devuelve todas y el poll coge las 20 primeras. Reprocesaría las mismas 20 cada día, para siempre.
3. **No pagina.** Con 89 reseñas hacen falta `pageSize` y `pageToken`.
4. **No descarta las ya respondidas.** Si la reseña trae `reviewReply`, no debe entrar en la cola. Además, ese campo se usa como texto de la reseña cuando falta `comment`: eso mete *nuestra propia respuesta* dentro del borrador.
5. `app/api/reviews/poll/route.ts` aborta si `WHATSAPP_ALLOWED_NUMBERS` está vacía. Con WhatsApp fuera, el cron no hace nada.

---

## 7. Decisiones que te tocan a ti

1. ¿Pedimos el acceso a la API ya (Ruta A) y en paralelo montamos la Ruta B para no perder tres semanas?
2. ¿El dashboard entra en la fase 1 o se deja para cuando haya que renovar la cuota?
3. ¿Esto se le factura a Antonio como servicio mensual, y a qué precio? De ahí sale la plantilla que reutilizas con Flavia y con el resto de la comarca.

---

## 8. Orden de trabajo propuesto

1. Corregir los 5 bugs de `lib/google.ts` y el poll (media hora, sin dependencias externas).
2. Cola de reseñas en KV + pantalla y botones en Telegram, contra el modo simulación.
3. Solicitar el acceso a la API de Business Profile.
4. Generar los 89 borradores y empezar a pegarlos, de la peor a la mejor.
5. Enchufar el cron a Telegram para las reseñas nuevas.
6. Dashboard `/resenas` e informe mensual.

---

## 9. Datos del acceso a la API (4-sep-2026)

- **Proyecto Google Cloud:** `zapweave-resenas` — creado en la cuenta de Iván (calycharlie@gmail.com), reutilizable para los demás clientes
- **Número de proyecto:** `2608613113`
- **APIs habilitadas:** My Business Account Management · My Business Business Information
- **Email de la solicitud:** donpepeoriginalpadron@gmail.com (propietario de la ficha, sesión abierta en el Chrome de Iván como authuser=3)
- **Formulario:** support.google.com/business/contact/api_default → "Solicitud de acceso básico a las APIs"
- **Ficha de Google:** 3,4★ · 90 reseñas · 20 sin responder · location id interno 13703524551739761972
- **Hecho ese mismo día:** añadida la web `https://donpepeoriginal.es` a la ficha (era requisito del formulario y faltaba) y el enlace al menú `https://donpepeoriginal.es/carta`
- **Comprobación de aprobación:** cuotas del proyecto — 0 QPM = pendiente · 300 QPM = aprobado
- **SOLICITUD ENVIADA** el 4-sep-2026. ID de asistencia de Google: `6-5498000041620`. Plazo de revisión indicado por Google: 7-10 días hábiles. La respuesta llega al correo donpepeoriginalpadron@gmail.com

---

## 10. Implementado el 4-sep-2026

### Bugs corregidos en `lib/google.ts`
1. **`starRating` llega como palabra**, no como número. `Number("FIVE")` era `NaN`: la reseña entraba con 0 estrellas y el borrador se redactaba como si fuera una queja. Añadido `parseStarRating`.
2. **En modo real no se filtraban las ya vistas.** El cron cogía las 20 primeras y habría reproposto las mismas 20 cada día. Ahora `listReviews` filtra por el registro de vistas.
3. **No paginaba.** Con 90 reseñas hacían falta `pageSize` y `pageToken`; ahora recorre hasta 20 páginas de 50.
4. **Las ya respondidas entraban en la cola.** Ahora se descartan por `reviewReply`.
5. **`reviewReply.comment` se usaba como texto de la reseña** cuando faltaba `comment`: el borrador se redactaba sobre nuestra propia respuesta anterior. Eliminado.
6. Extra: `replyToReview` rechaza un id que no sea el recurso completo `accounts/x/locations/y/reviews/z` — es justo el error que hundía el sistema de Flavia.

### Piezas nuevas
- **`lib/resenas-cola.ts`** — cola en KV. Ordena de la peor estrella a la mejor y, a igualdad, de la más antigua a la más nueva. Comparte memoria con la clave `reviews:seen` que ya usaba el cron, así que una reseña resuelta no reaparece por el otro camino.
- **`lib/resenas-telegram.ts`** — la pantalla y los cuatro botones: **✅ Publicar · 🔄 Otra versión · ✏️ Escribo yo · ⏭️ Saltar**. Al publicar o saltar, encadena sola con la siguiente. "Otra versión" le pasa al modelo los textos ya descartados para que no devuelva lo mismo, con tope de 5.
- **`lib/orchestrator.ts`** — `buildReviewDraft` acepta `{ evitar: string[] }`.
- **`app/api/telegram/webhook/route.ts`** — comandos `/resenas` y `/resenas estado`, callbacks `res:*` y captura del texto cuando el dueño escribe su propia versión.
- **`app/api/reviews/poll/route.ts`** — el cron diario ya no sale por WhatsApp: avisa por Telegram con la peor reseña y el borrador hecho. No manda nada si ya hay un borrador suyo a medias.
- **`scripts/test-resenas.ts`** — `npm run test:resenas`.

### Verificación
- `tsc --noEmit` limpio.
- Las 12 comprobaciones del test pasan: mapeo de estrellas, filtrado de respondidas, orden de la cola, publicar/saltar y recuento.
- El fixture `data/sample-reviews.json` sube a 6 reseñas, una de ellas ya respondida, para que el filtro se pruebe de verdad.

### Pendiente
- [ ] Desplegar a producción (el bot no tendrá `/resenas` hasta entonces).
- [ ] Aprobación de Google (caso 6-5498000041620). Al llegar: `GOOGLE_REVIEWS_ENABLED=true`, credenciales OAuth y `GOOGLE_LOCATION_ID`.
- [ ] Año exacto de fundación — Iván se lo pregunta a Antonio.

### Ajustes para la demostración (4-sep-2026, tarde)
- El comando se acepta en **todas sus formas**: `/reseña`, `/reseñas`, `/resena`, `/resenas`, con barra o sin ella. Antonio no tiene que acordarse de cómo se escribe.
- `/resenas estado` → recuento. `/resenas reiniciar` → deja la cola de ejemplo de cero (**solo funciona en modo prueba**; con reseñas reales se niega, porque borrar el historial supondría volver a responder encima de lo ya publicado).
- El menú que sale al pulsar "/" **se registra solo** la primera vez que el dueño escribe al bot (marca en KV para no repetirlo). Sin entrar en BotFather y sin exponer el token en ningún sitio.
- El aviso de modo prueba ya no dice "esto no se publica de verdad" sino que Google está revisando el permiso y que el mismo botón publicará cuando llegue.

### Limitaciones del entorno (para la próxima vez)
- El `node_modules` del proyecto está instalado para **Windows**; el puente monta la carpeta en una VM Linux, así que ahí no corren `tsx`, `next build` ni nada con binario nativo. `tsc` sí (es JS puro), y los tests se pueden compilar a JS y ejecutar con `node`.
- Desde esa VM **no hay credenciales** ni de Vercel CLI ni de GitHub, y las rutas `api.telegram.org/bot<token>/...` no responden. El despliegue lo lanza Iván desde su terminal.

---

## 11. Incidente del 5-sep-2026: el bot mudo. Causa raíz y lección

**Síntoma:** tras desplegar el comando `/resenas`, el bot dejó de responder por completo. Telegram devolvía `Wrong response from the webhook: 401 Unauthorized`.

**Causa raíz:** el bot **nunca había estado corriendo en producción**. Su webhook apuntaba a un despliegue de **preview**, que es el único entorno donde estaban dadas de alta `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` y `TELEGRAM_ALLOWED_CHAT_IDS`. Al reapuntar el webhook al dominio de producción, `verificarSecretToken` comparó contra una variable inexistente y rechazó todo con 401.

Eso explica también por qué `/reseña` no respondía antes: el bot servía desde un despliegue de preview de hacía tres días, sin ese código.

**Solución:** dar de alta las tres variables en el entorno **Production** (como Sensitive), desplegar, promover el despliegue al dominio y volver a registrar el webhook con el secreto ya presente en producción.

**Detalles que costaron tiempo:**
- Las variables marcadas como *Sensitive* en Vercel **no se pueden volver a leer**: `vercel env pull` devuelve el literal `[SENSITIVE]`. No se pueden copiar de un entorno a otro por CLI; hay que reintroducir el valor desde la fuente original (aquí, `.env.local`).
- Un `vercel rollback` **fija el dominio al despliegue viejo**: después hay que usar `vercel promote` explícitamente para que el dominio vuelva a seguir al despliegue nuevo.
- `vercel env ls production` no lista las variables que solo existen en Preview, lo que al principio hizo parecer que no existían en ninguna parte.

**Lección, y aplica a Flavia y a cualquier cliente futuro:** antes de tocar la configuración de un sistema que funciona, comprobar **dónde** está funcionando de verdad. Aquí se asumió que producción era el destino correcto del webhook sin verificar que producción tuviera con qué atenderlo.

**Comprobación que debería existir en todo proyecto nuevo:** que las variables de entorno estén dadas de alta en **Production**, no solo en Preview o en el `.env.local` local.
