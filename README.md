# Don Pepe Original

Web pública one-page, sistema de QR para mesas, agente de WhatsApp para editar la carta
hablando, y auto-respuesta de reseñas de Google con revisión humana previa.
Todo en un único proyecto Next.js 14 desplegable en Vercel.

```
don-pepe/
├─ app/                         # App Router (RSC + cliente)
│  ├─ page.tsx                  # One-page pública
│  ├─ carta/page.tsx            # Carta optimizada para QR (revalidate 30s)
│  ├─ qr/page.tsx + actions.ts  # Panel admin de QRs (basic auth por cookie)
│  ├─ api/
│  │  ├─ menu/                  # GET JSON actual
│  │  ├─ menu/log/              # GET historial (protegido por pass)
│  │  ├─ qr/                    # GET PNG/SVG
│  │  ├─ qr/pdf/                # GET PDF A4 con 6 QRs por hoja
│  │  ├─ whatsapp/webhook/      # Webhook Meta Cloud o Twilio
│  │  └─ reviews/poll/          # Cron cada 15 min (vercel.json)
│  └─ layout.tsx + globals.css
├─ components/                  # Hero, MenuView, SiteSections, QRAdmin
├─ data/
│  ├─ menu.json                 # ⭐ fuente de verdad de la carta (seed)
│  └─ sample-reviews.json       # reseñas de ejemplo para modo simulación
├─ lib/
│  ├─ kv.ts                     # Vercel KV con fallback in-memory + JSON
│  ├─ types.ts                  # Menu / PlatoBase / MenuDelDia
│  ├─ format.ts                 # Intl.NumberFormat('es-ES', EUR)
│  ├─ actions.ts                # Zod schema + applyAction
│  ├─ llm.ts                    # cliente OpenRouter (fetch directo)
│  ├─ sitio.ts                  # dominio público (SITE_URL)
│  ├─ prompts.ts                # system prompts menú y reseñas
│  ├─ whatsapp.ts               # proveedor Meta Cloud o Twilio
│  ├─ google.ts                 # GBP API con modo simulación
│  ├─ orchestrator.ts           # corazón del agente (pending + confirm)
│  └─ pending.ts                # confirmación SÍ/NO/EDITAR + 10 min TTL
├─ vercel.json                  # cron de /api/reviews/poll
├─ tailwind.config.ts
├─ next.config.mjs
└─ package.json
```

## 0. Requisitos

- Node 18.17+ (en Vercel viene de fábrica).
- Una cuenta en [Vercel](https://vercel.com).
- Una API key de [OpenRouter](https://openrouter.ai/keys).
- Para reseñas: una app de Google Cloud con la **Business Profile Performance API**
  activada y un refresh token del dueño (ver §5).
- Para WhatsApp: un número verificado en **Meta Cloud API** o **Twilio** (ver §4).

## 1. Despliegue en Vercel (resumen)

```bash
# 1. Instala deps (no obligatorio si despliegas directo)
npm install

# 2. Sube a Vercel
vercel
# o conecta el repo desde la UI y deja que Vercel instale solo
```

### Variables de entorno

Copia `.env.example` a `.env.local` para desarrollo y rellena en Vercel para
producción (Project → Settings → Environment Variables). Lo mínimo para
arrancar la web pública:

| Var                                   | Ejemplo                            | Notas                                                  |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_RESTAURANT_NAME`         | `Don Pepe Original`                |                                                        |
| `NEXT_PUBLIC_PHONE`                   | `34881829728`                      | fijo del local; sin `+`                                |
| `NEXT_PUBLIC_PHONE_DISPLAY`           | `881 82 97 28`                     | cómo se ve en la web                                   |
| `NEXT_PUBLIC_PHONE_MOBILE`            | `34696434042`                      | móvil de reservas; sin `+`                             |
| `NEXT_PUBLIC_PHONE_MOBILE_DISPLAY`    | `696 43 40 42`                     | cómo se ve en la web                                   |
| `NEXT_PUBLIC_WHATSAPP`                | `34696434042`                      | el móvil: es quien tiene WhatsApp                      |
| `NEXT_PUBLIC_ADDRESS`                 | `Rúa Longa, 21, 15900 Padrón`      | dirección postal exacta                                |
| `NEXT_PUBLIC_LAT` / `NEXT_PUBLIC_LNG` | `42.7389` / `-8.6603`              | coordenadas del mapa                                   |
| `NEXT_PUBLIC_SITE_URL`                | `https://donpepeoriginal.es`       | opcional: ya es el valor por defecto                   |
| `QR_ADMIN_PASS`                       | una-larga-y-aleatoria              | acceso a `/qr`                                         |
| `OPENROUTER_API_KEY`                  | `sk-or-v1-…`                       | para el agente y las reseñas                           |
| `OPENROUTER_MODEL`                    | `qwen/qwen3-30b-a3b-instruct-2507` | el agente de WhatsApp; cambiarlo no es un despliegue   |
| `OPENROUTER_MODEL_TRADUCCION`         | `qwen/qwen3-30b-a3b-instruct-2507` | las traducciones de la carta; vacío = usa el de arriba |

Recomendado: añade también [Vercel KV](https://vercel.com/marketplace/kv) desde
el dashboard de Vercel. Eso inyecta automáticamente `KV_REST_API_URL` y
`KV_REST_API_TOKEN`. Sin KV, el proyecto sigue funcionando en local con un
fallback en memoria + JSON, pero **los cambios del agente se perderán en cada
despliegue o cold start**.

## 2. La web pública

`app/page.tsx` es la one-page:

- Hero con `tel:` y CTA a `/carta`.
- Carta en pestañas (Entrantes / Arroces / Pescados / Carnes), precios a la
  derecha con tipografía monoespaciada.
- Tres tarjetas de menús.
- Horario + contacto (Llamar + WhatsApp wa.me pre-rellenado).
- Mapa embebido con OpenStreetMap (sin cookies de terceros).
- Footer con aviso legal y recordatorio de Estrella Galicia.

`app/carta/page.tsx` es la versión pensada para abrir desde QR. Detecta
`?mesa=N` y deja un log anónimo (sólo mesa + hora) en KV bajo `qr:scans`. Lee
la carta de KV con `revalidate: 30`, así que cualquier cambio del agente se ve
en menos de 30 s.

### SEO

- `metadata` completo en `app/layout.tsx` + `app/page.tsx`.
- JSON-LD `Restaurant` con `servesCuisine`, `openingHoursSpecification`,
  `telephone`, `menu`, `priceRange`, `address` y `geo`. Placeholders:
  `address` y `geo` toman los valores de `NEXT_PUBLIC_*`.
- `app/sitemap.ts` y `app/robots.ts` listos.
- `lang="es-ES"` en `<html>`. La estructura permite añadir `gl-ES` y `en`
  después envolviendo strings en `messages/{locale}.json`.

### Rendimiento y accesibilidad

- Tailwind tree-shaken, sin cliente JS innecesario (la carta es la única
  parte interactiva).
- Imágenes cero — todo es CSS y SVG.
- Foco visible, `prefers-reduced-motion` respetado, `aria-*` en tabs y
  secciones.

## 3. QR para las mesas

Visita `/qr` (te pedirá la `QR_ADMIN_PASS` que hayas definido).

- **QR general**: apunta a `https://<dominio>/carta`. Ideal para la entrada.
- **QRs por mesa**: apuntan a `https://<dominio>/carta?mesa=N`. Permite
  saber qué mesa escanea más (log en `qr:scans`).
- Descarga cada QR en **PNG 1024** o **SVG** (vectorial — escala sin pixelar).
- **PDF A4 con 6 QRs por hoja** listo para imprimir y plastificar.

Nivel de corrección de errores `H` (soporta manchas y arañazos), quiet zone
de 4 módulos, sin logo encima. Si quieres branding, imprímelo en la hoja
debajo del QR, no encima.

**QR viejos en circulación.** Hay carteles ya plastificados en las mesas
cuyo código apunta a `https://donpepeoriginal.es/#carta`, un ancla de la
versión anterior de la web (cuando la carta era una sección de la home, no
una ruta propia). El fragmento nunca llega al servidor, así que se resuelve
en el cliente: ver `lib/anclas-heredadas.ts`, cargado desde `app/layout.tsx`.
No borres ni vacíes ese mapa mientras esos carteles sigan en las mesas.

### 3.1 URL de reseñas de Google — FALTA DATO

El bloque de reseñas de `/carta` y `/local`, y el cartelito de
`/api/qr/resenas`, usan **una única constante**: `GOOGLE_REVIEWS_URL` en
`lib/resenas.ts`. Hoy vale el literal `[FALTA DATO: URL corta de reseñas de
Google]` a propósito -no se construye a partir del place_id ni de ningún
otro dato, porque eso podría no ser el enlace corto real de "escribir una
reseña"-. Consíguela en el propio perfil de Google Business del local
("Pedir reseñas" → copiar enlace) y sustitúyela ahí; se usa en todos los
sitios a la vez. Hasta entonces, `/api/qr/resenas` responde 400 con un
mensaje claro en vez de generar un cartel con un QR roto.

Las cinco estrellas del bloque de reseñas son un único enlace (no cinco
distintos) al mismo destino siempre: no hay -ni puede haber sin tocar el
componente- ninguna lógica que mande a un sitio distinto según la
puntuación. Es a propósito: Google prohíbe expresamente filtrar reseñas
según si el cliente está contento o no ("review gating").

## 4. Agente de WhatsApp

### 4.1 Meta Cloud API (recomendado)

1. Crea una app en [developers.facebook.com](https://developers.facebook.com).
2. Añade el producto **WhatsApp**.
3. En *API Setup*, copia el **Phone number ID** → `WHATSAPP_PHONE_ID`.
4. Genera un **Permanent System User Token** → `WHATSAPP_TOKEN`.
5. En la sección *Configuration* → *Webhook*:
   - Callback URL: `https://<dominio>/api/whatsapp/webhook`
   - Verify token: lo que pongas en `WHATSAPP_VERIFY_TOKEN`
   - Suscríbete a `messages`.
6. Añade tu número a `WHATSAPP_ALLOWED_NUMBERS` (sólo dígitos, separados
   por comas).

### 4.2 Twilio (alternativa)

1. Crea un [Twilio](https://www.twilio.com) y activa el sandbox de WhatsApp
   (o un sender aprobado).
2. Variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_WHATSAPP_FROM` (formato `whatsapp:+1...`).
3. Apunta el webhook del sandbox a la misma URL.

### 4.3 Cómo habla el dueño

Comandos (literal o aproximado):

| Mensaje del dueño                                       | Acción                                              |
| ------------------------------------------------------- | --------------------------------------------------- |
| `sube el pulpo a 20`                                    | `update_price` (pulpo 18 → 20 €)                    |
| `baja el chuletón a 32`                                 | `update_price`                                      |
| `hoy el pescado del día es rodaballo a 22`              | `update_special` (pescado-dia → Rodaballo, 22 €)    |
| `quita las zamburiñas hasta nueva orden`                | `disable_item`                                      |
| `vuelve a poner las zamburiñas`                         | `enable_item`                                       |
| `añade paella de bogavante a 45`                        | `add_item`                                          |
| `quita el menú churrasco`                               | `update_menu_availability { disabled: true }`       |
| `deshacer último cambio`                                | revierte la última edición con snapshot             |
| `precio del pulpo` / `cuánto vale el chuletón`          | sólo consulta, no cambia nada                       |

El bot siempre responde con un **resumen** y espera confirmación:

> Voy a: Cambiar "Pulpo a la gallega" de 18,00 € a 20,00 €.
> Responde SÍ para confirmar, NO para cancelar, o EDITAR: <texto> para reescribirlo. Tienes 10 minutos.

Si pasan 10 minutos sin confirmar, la acción caduca. Cualquier mensaje del
número autorizado en ese intervalo cuenta como respuesta.

### 4.4 Número no autorizado

Si escribe alguien que no está en `WHATSAPP_ALLOWED_NUMBERS`, el bot
responde automáticamente:

> Este número es solo para gestión interna. Para reservas, llama al 696 434 042.

(El dueño puede cambiar ese texto en `app/api/whatsapp/webhook/route.ts`.)

### 4.5 Telegram (canal adicional, mismo agente)

Mismo cerebro que WhatsApp (`lib/orchestrator.ts`, sin tocar), transporte
aparte en `lib/telegram.ts` + `app/api/telegram/webhook/route.ts`. El dueño
toca botones en vez de escribir: `/plato` abre categoría → plato → acción
(agotar / reactivar / eliminar / cambiar precio) → confirmar. También acepta
texto libre igual que WhatsApp ("sube el pulpo a 20"), y en ese caso también
aparecen los botones de Confirmar/Cancelar antes de aplicar nada — nunca se
aplica un cambio sin que el dueño lo toque a propósito.

Variables de entorno: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`TELEGRAM_ALLOWED_CHAT_IDS` (ver `.env.example`). Vacía = nadie autorizado.

Para registrar el webhook una vez desplegado (URL pública en `https`),
en PowerShell:

```powershell
$token = "<TELEGRAM_BOT_TOKEN>"
$secret = "<TELEGRAM_WEBHOOK_SECRET>"
$url = "https://donpepeoriginal.es/api/telegram/webhook"
Invoke-RestMethod -Method Post `
  -Uri "https://api.telegram.org/bot$token/setWebhook" `
  -Body (@{ url = $url; secret_token = $secret } | ConvertTo-Json) `
  -ContentType "application/json"
```

Los alérgenos no se pueden tocar desde ningún canal: ver el comentario junto
a `PlatoBase` en `lib/types.ts` y `scripts/test-proteccion-alergenos.ts`
(forma parte de `npm run build`: si algún día una acción pudiera tocarlos,
el despliegue se para ahí).

**Importante sobre esta protección: es de tiempo de COMPILACIÓN, no de
tiempo de EJECUCIÓN.** `npm run build` la comprueba antes de cada despliegue
-así que un cambio peligroso nunca llega a producción-, pero no hay ningún
guardia que se ejecute en caliente, petición a petición, mientras el bot
está atendiendo mensajes reales. No fue posible añadirlo sin tocar
`lib/actions.ts`/`lib/orchestrator.ts`, que quedan fuera de alcance (ver
condiciones de esta sesión). Si algún día se permite editar esos ficheros,
vale la pena añadir ahí también una comprobación en caliente, como cinturón
y tirantes.

**Secreto de bypass de protección de Vercel — rotarlo antes de producción.**
El valor de `x-vercel-protection-bypass` usado para probar el canal de
Telegram contra el despliegue Preview se compartió en esta conversación, que
no es un canal seguro para secretos. Rótalo en el dashboard de Vercel
(Project Settings → Deployment Protection → Protection Bypass for
Automation → generar uno nuevo) antes de dar esto por definitivo, y
actualiza `VERCEL_AUTOMATION_BYPASS_SECRET` donde corresponda.

## 5. Auto-respuesta de reseñas de Google

### 5.1 Estado actual: simulación

Hasta que Google aprueba el acceso a la Business Profile API (puede tardar
días o semanas), el sistema corre en **modo simulación**: en cada
ejecución del cron toma reseñas de `data/sample-reviews.json` que aún no
hayan sido procesadas, genera un borrador con el LLM y se lo manda al
dueño por WhatsApp. Cuando Google apruebe, sólo hay que:

1. Poner `GOOGLE_REVIEWS_ENABLED=true`.
2. Rellenar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REFRESH_TOKEN`, `GOOGLE_LOCATION_ID`.
3. El cron empieza a leer y responder en real.

### 5.2 Cómo conseguir las credenciales de Google

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com).
2. Habilita **Business Profile Performance API**.
3. Configura la pantalla de OAuth con tipo "External" y añade tu cuenta
   como tester.
4. Crea credenciales OAuth de tipo "Desktop app" → descarga el JSON.
5. Usa el flujo OAuth para obtener un **refresh token** con los scopes:
   - `https://www.googleapis.com/auth/business.manage`
6. Rellena las cuatro variables en Vercel.

`GOOGLE_LOCATION_ID` tiene el formato
`accounts/<account-id>/locations/<location-id>`. Lo encuentras en la
respuesta de `accounts.locations.list`.

### 5.3 Flujo de aprobación

1. Cron (`/api/reviews/poll`, cada 15 min según `vercel.json`) lista
   reseñas nuevas.
2. Por cada una, genera un borrador con el LLM (system prompt en
   `lib/prompts.ts`).
3. Envía WhatsApp al dueño con la reseña, el borrador y la pregunta:
   `PUBLICAR`, `EDITAR: <texto>`, o `NO`.
4. Si el dueño dice `PUBLICAR`, se publica vía
   `accounts.locations.reviews.reply`.
5. Si dice `EDITAR: <texto>`, se sustituye el borrador por el texto del
   dueño y se le pide `PUBLICAR` de nuevo.
6. Si dice `NO`, se marca como vista sin responder.
7. Rate limit: 20 reseñas/hora para no spamear al dueño.

### 5.4 Plan de trabajo posterior — no implementado, solo anotado

Dos ideas evaluadas a partir de material de referencia de otro proyecto
(sin copiar ni un dato suyo, solo patrones generales). Ninguna de las dos
está construida todavía; quedan aquí como encargo futuro.

**Protocolo PAS para responder reseñas negativas** (Pedir perdón, Asumir,
Solucionar): reconocer el fallo sin excusas, asumirlo como propio y decir
qué se va a hacer al respecto. `lib/prompts.ts:REVIEW_REPLY_SYSTEM` ya pide
algo parecido para 1-2 estrellas ("disculparse con elegancia... nombrar un
compromiso concreto"); formalizar el protocolo es una extensión de lo que
ya casi se hace, no un sistema nuevo.

**Regla dura, sin excepción, para cuando esto se implemente:**
**una respuesta a una reseña negativa solo puede afirmar una acción
correctiva que el dueño haya confirmado que es cierta.** Nada de "hemos
cambiado de proveedor" ni "hemos reforzado la formación" si eso no ha
pasado de verdad. Publicar una promesa falsa en nombre del dueño en su
propia ficha de Google no es gestionar la reputación, es mentir en público
en su nombre — y si alguien lo descubre, el daño es mayor que el de la
reseña original. Cualquier implementación futura del protocolo PAS debe
o bien limitarse a acciones que el sistema pueda verificar (p. ej. las que
ya haya aplicado el propio dueño por Telegram/WhatsApp), o bien
preguntarle primero y esperar su confirmación antes de publicar nada que
prometa algo concreto.

**Publicar novedades y fotos semanales** en la ficha de Google (Google
Posts + fotos nuevas), para mantener la ficha activa entre reseña y
reseña. Hoy es una tarea manual del dueño; solo tendría sentido
automatizarla si algún día se activa de verdad la API de reseñas de
Google (hoy en modo simulación, ver 5.1).

### 5.5 Decisión de diseño para un futuro panel del dueño — no implementada

Si algún día se construye un panel para que Antonio vea sus propias
métricas (nota media, reseñas pendientes, etc.), la gramática visual a
reutilizar -evaluada contra un dashboard de referencia de otro proyecto,
sin copiar su paleta- es: tarjetas planas (sombra casi inexistente, tipo
`0 1px 2px rgba(0,0,0,.04)`), borde teñido del color de marca a opacidad
baja (10-20%) en vez de gris neutro, esquinas muy redondeadas o en
píldora, y números grandes con interlineado mínimo (`leading-none`) y
tracking apretado para las cifras clave. Con la paleta YA existente de Don
Pepe (brasa/carbon/gold), no una nueva: el objetivo es que lo que vea
Antonio en su panel se sienta de la misma familia que lo que ve el cliente
en la carta.

## 6. Comprobaciones locales

```bash
# arrancar en dev
cp .env.example .env.local
# edita .env.local y rellena al menos OPENROUTER_API_KEY + QR_ADMIN_PASS
npm install
npm run dev
# http://localhost:3000       → web pública
# http://localhost:3000/carta → carta limpia
# http://localhost:3000/qr    → admin de QRs (pass: la de QR_ADMIN_PASS)
# http://localhost:3000/api/menu → JSON actual
# http://localhost:3000/api/menu/log?pass=<QR_ADMIN_PASS> → historial
```

Sin Vercel KV configurado, el proyecto usa un fallback en memoria + el
JSON de `data/menu.json`. Los cambios del agente se ven en `/carta` hasta
el siguiente reinicio del servidor.

## 7. Mantenimiento

- **Cambios estructurales** (nuevas categorías, nuevos tipos de acción):
  edita `lib/types.ts`, `lib/actions.ts` y el prompt en `lib/prompts.ts`.
- **Tono de las respuestas de reseñas**: ajusta el system prompt en
  `lib/prompts.ts` (`REVIEW_REPLY_SYSTEM`).
- **Texto del "número no autorizado"**: `app/api/whatsapp/webhook/route.ts`.
- **Tasa máxima de reseñas/hora**: constante
  `ALLOWED_PROCESSED_PER_HOUR` en `app/api/reviews/poll/route.ts`.
- **Tiempo de espera de confirmación**: `CONFIRM_TTL_MS` en
  `lib/pending.ts`.

## Despliegue

El proyecto está conectado a `AngelReml/donpepe`. Cada push a `main` dispara
un despliegue de producción en Vercel; las demás ramas generan una vista
previa. Ya no hace falta `vercel --prod` desde el disco local, y así no se
puede desplegar nada que no esté versionado.
