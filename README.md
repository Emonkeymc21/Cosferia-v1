# Cosferia — Fase 2

Marketplace de cosplay de Mendoza. Next.js 14 (App Router) + TypeScript strict +
Supabase (Auth, Postgres, Storage) + Prisma + Tailwind.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 · App Router · React Server Components |
| Lenguaje | TypeScript `strict` + `noUncheckedIndexedAccess` |
| Base de datos | Supabase Postgres vía Prisma |
| Auth | Supabase Auth (Google OAuth + magic link) |
| Archivos | Supabase Storage (3 buckets) |
| Estilos | Tailwind CSS + Lucide React |
| OCR | Tesseract.js (navegador) + pdf-parse (servidor) |
| Validación | zod, compartida entre cliente y servidor |

---

## Guía de instalación

### 1. Crear el proyecto en Supabase (gratis)

1. Entrá a **supabase.com** → *Start your project* → iniciá sesión con GitHub.
2. *New project*. Nombre: `cosferia`. **Elegí la región South America (São Paulo)**:
   es la más cercana a Mendoza y cada 100 ms de latencia se notan en cada query.
3. Generá una contraseña de base de datos y **guardala**: se muestra una sola vez.
4. Esperá ~2 minutos a que termine de aprovisionar.

### 2. Copiar las credenciales

En **Settings → API**:

| Campo en Supabase | Variable |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

En **Settings → Database → Connection string → URI**, tomá dos variantes:

- **Transaction pooler** (puerto `6543`) → `DATABASE_URL`,
  agregándole `?pgbouncer=true&connection_limit=1`
- **Session pooler / directa** (puerto `5432`) → `DIRECT_URL`

> Las dos URLs no son un capricho. Prisma necesita una conexión directa para
> correr migraciones (el pooler no soporta *prepared statements*), pero en
> runtime hay que usar el pooler o el plan gratuito se queda sin conexiones
> apenas tengas tráfico.

### 3. Configurar el proyecto local

```bash
npm install
cp .env.example .env.local     # completar con lo del paso 2
npx prisma db push             # crea las tablas
npm run db:seed                # carga datos de prueba
```

### 4. Ejecutar el SQL de configuración

En Supabase, **SQL Editor → New query**, pegá todo el contenido de
`prisma/supabase-setup.sql` y ejecutá. Eso crea:

- El **trigger** que inserta en `public.users` cuando alguien se registra.
- Las **policies de RLS** de todas las tablas.
- Los **tres buckets** de Storage con sus políticas.

### 5. Activar Google OAuth

1. En **Google Cloud Console** → *APIs y servicios* → *Credenciales* → *Crear
   credenciales* → *ID de cliente de OAuth* → *Aplicación web*.
2. En *URIs de redireccionamiento autorizados* pegá la URL de callback que
   Supabase te muestra en **Authentication → Providers → Google**.
3. Copiá *Client ID* y *Client Secret* a Supabase y activá el proveedor.
4. En **Authentication → URL Configuration**, agregá a *Redirect URLs*:
   `http://localhost:3000/auth/callback` y `https://TU-DOMINIO/auth/callback`.

### 6. Levantar

```bash
npm run dev
```

### 7. Deploy en Vercel

1. Subí el repo a GitHub e importalo en Vercel.
2. Cargá **todas** las variables de `.env.example` en *Settings → Environment
   Variables*.
3. Actualizá `NEXT_PUBLIC_APP_URL` con el dominio real.
4. Volvé a Supabase y sumá el dominio de producción a las *Redirect URLs*.

---

## Estructura

```
src/
├── app/
│   ├── page.tsx                    Catálogo (RSC, filtros por URL)
│   ├── producto/[slug]/page.tsx    Detalle + botón de compra
│   ├── publicar/page.tsx           Alta de producto
│   ├── mi-tienda/page.tsx          Datos de tienda y bancarios
│   ├── pedidos/page.tsx            Compras y ventas
│   ├── comunidad/page.tsx          Foro Zero Funas
│   ├── eventos/page.tsx            Eventos + galería
│   ├── login/page.tsx              Google OAuth + magic link
│   ├── actions/                    Server Actions con zod
│   │   ├── products.ts  orders.ts  community.ts  events.ts
│   └── api/
│       ├── ocr/verify/route.ts     Verificación de comprobantes
│       └── upload/route.ts         Subida de imágenes
├── components/
│   ├── catalog/  checkout/  publish/  forum/  events/  layout/  ui/
└── lib/
    ├── prisma.ts       Singleton del cliente
    ├── auth.ts         Sesión + upsert defensivo del usuario
    ├── money.ts        Centavos + parseo de montos argentinos
    ├── moderation.ts   Motor Zero Funas (2 capas)
    ├── receipt.ts      Parseo y scoring de comprobantes
    ├── ocr-client.ts   Tesseract en el navegador
    ├── storage.ts      Buckets de Supabase
    ├── validators.ts   Esquemas zod compartidos
    └── supabase/       client · server · middleware
```

---

## Decisiones que conviene entender antes de tocar el código

### El OCR corre en el navegador, no en el servidor

Tesseract descarga un modelo de idioma de ~15 MB. En una función serverless de
Vercel eso significa superar el límite de bundle y agotar el tiempo de ejecución
en cada *cold start* — y fallar de forma intermitente, que es el peor modo de
fallar.

El esquema es híbrido:

| Tipo de archivo | Quién extrae el texto | Confianza |
|---|---|---|
| PDF con texto nativo | Servidor (`pdf-parse`) | **Alta** — `PDF_TEXT` |
| Imagen | Navegador (Tesseract) | Baja — `CLIENT_OCR`, penalización del 30% |

El servidor **siempre re-parsea y re-puntúa** lo que recibe. Un comprobante
`CLIENT_OCR` nunca se aprueba de forma automática, porque el texto viene de una
máquina que el comprador controla.

### El OCR es triage, no autoridad

Un comprobante es un archivo editable. Cambiar `$89.500` por `$8.950` en una
imagen lleva treinta segundos. Por eso, con `RECEIPT_REQUIRE_MANUAL_REVIEW=true`
(el default), el sistema nunca aprueba un pago solo: lo máximo que hace es dejar
el comprobante listo para que el vendedor lo confirme de un clic mirando su
homebanking.

Lo que sí frena fraude de verdad son las **dos capas de deduplicación**:

- Hash SHA-256 del archivo → bloquea reenviar el mismo comprobante.
- Número de operación único → bloquea re-exportar el PDF para cambiar el hash.

Puntuación: monto 45, CUIT 20, operación 15, fecha 12, CBU 8.
Un monto legible que **no** coincide es rechazo directo, sin importar el resto.

### Prisma ignora RLS

Prisma se conecta con el rol `postgres`, que salta las policies. **Toda la
autorización real vive en las Server Actions.** RLS es la segunda línea de
defensa: protege contra el acceso directo con la `anon key` desde el navegador.

Si agregás una acción nueva, verificá pertenencia a mano. No alcanza con que la
tabla tenga policy.

### Dinero en centavos

Todo importe es `Int` en centavos. `$45.000` se guarda como `4500000`. Con
floats, `0.1 + 0.2` da `0.30000000000000004`, y en una orden de $180.000 esa
diferencia termina en un reclamo.

Cuidado con el caso ambiguo del formato argentino: `"1.500"` es mil quinientos,
no uno coma cinco. Lo resuelve `parseArsToCents()` mirando la longitud del
último grupo.

### La moderación tiene dos capas y un límite conocido

Una lista plana de palabras bloquea *"es un robo lo que cobran por la tela"*,
que es conversación legítima. La segunda capa exige que la acusación aparezca
junto a un señalamiento identificable (`@fulano`, "el vendedor", "la tienda de").

Está probado contra 10 casos, incluidos los falsos positivos difíciles. Pero
ningún regex resuelve esto del todo: alguien decidido escribe "la persona que
todos sabemos" y pasa. Funciona como fricción y como declaración de política,
no como muro.

Los posts bloqueados **se guardan** con `status = BLOCKED` y su `blockedReason`.
Sin eso no hay forma de medir si la moderación se está volviendo demasiado
agresiva.

Y cuando se bloquea un mensaje, el texto viaja al Centro de Disputas ya cargado.
Si le cerrás la puerta a alguien sin ofrecerle salida, se va a Instagram a hacer
la funa igual.

### Estado del catálogo en la URL

Los filtros viven en *search params*, no en `useState`. Así el catálogo filtrado
es compartible por link, sobrevive al refresh, y el Server Component hace la
query real en Postgres en vez de traer todo y filtrar en memoria.

---

## Pendientes conscientes

- **Fotos huérfanas.** Se suben antes de guardar el producto (para el preview
  real). Si el usuario abandona el formulario, quedan en Storage. Falta un cron
  semanal que borre las que no estén referenciadas.
- **Panel de admin** para revisar `NEEDS_REVIEW` y disputas abiertas.
- **Rate limiting** en `/api/ocr/verify` y `/api/upload` (Upstash). Sin límite,
  son endpoints caros y abusables.
- **Service Worker** para PWA offline. El manifest ya está; falta `sw.js`.
- **Notificaciones** al comprador cuando el vendedor confirma el pago.
- **Tests automatizados.** `moderation.ts` y `receipt.ts` están escritos como
  funciones puras justamente para poder testearlas sin base ni red.

---

## Comandos

```bash
npm run dev         # desarrollo
npm run build       # prisma generate + next build
npm run typecheck   # tsc --noEmit
npm run db:push     # sincronizar schema sin migración
npm run db:migrate  # migración versionada
npm run db:studio   # explorador visual de la base
npm run db:seed     # datos de prueba
```
