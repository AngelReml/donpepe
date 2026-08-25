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

- Hero con `tel:` y CTA a `#carta`.
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
