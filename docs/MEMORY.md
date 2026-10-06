# MiamiGetAwayBack — Memory

Archivo de notas y contexto del proyecto para uso con Claude Code.

---

## Resumen del proyecto

Backend REST API para **MiamiGetAway**, plataforma de alquiler de propiedades y servicios en Miami.

- **Stack**: Node.js + TypeScript (ESM) + Express + PostgreSQL
- **Autenticación**: JWT (`/api/auth/login`)
- **Imágenes**: Cloudinary (multipart/form-data, campo `images`, máx. 30; traslados 20; comprobantes de proveedor 5; pago de reserva 1; 10 MiB por archivo). Se reciben a disco, no en RAM — ver sección "Memoria y subida de imágenes"
- **Email**: Nodemailer + Zoho SMTP (`ADMIN_EMAIL` env var para notificaciones al admin)
- **PDF**: PDFKit
- **Validación**: Zod
- **Tests**: Vitest + Supertest
- **DB connection**: `src/utils/db_render.ts` usando variables individuales (`DB_USER`, `HOST`, `DATABASE`, `PASSWORD`, `PORT_DB`)

---

## Entidades principales

| Entidad | Ruta base | Auth requerida |
|---|---|---|
| Admins | `/api/admins` | No (GET), Sí (escritura) |
| Usuarios | `/api/users` | PUT y DELETE |
| Apartamentos | `/api/apartments` | POST, PUT, DELETE |
| Villas | `/api/villas` | POST, PUT, DELETE |
| Yates | `/api/yachts` | POST, PUT, DELETE |
| Autos | `/api/cars` | POST, PUT, DELETE |
| Reviews internas | `/api/reviews` | No |
| Reservaciones | `/api/reservations` | Todos |
| Pagos de reservaciones | `/api/reservation-payments` | Todos |
| Suppliers | `/api/suppliers` | Todos |
| Pagos a suppliers | `/api/supplier-payments` | Todos |
| Resúmenes mensuales | `/api/summaries` | Todos |
| Google My Business | `/api/google-mybusiness` | Solo admin endpoints |
| Cron | `/api/cron` | Sí |
| Inversiones | `/api/investments` | GET público, escritura JWT |
| Experiencias | `/api/experiences` | GET público, escritura JWT |
| Transfers vehículos | `/api/transfers/vehicles` | GET público, escritura JWT |
| Transfers inquiries | `/api/transfers/inquiries` | POST público, GET/PATCH JWT |

---

## Convenciones

- Fechas de reservaciones: formato `MM-DD-YYYY HH:mm`
- Imágenes: `multipart/form-data`, campo `images` — **pasar array directo a pg, nunca `JSON.stringify`** para columnas `TEXT[]`
- Nueva entidad con imágenes: registrar en `IMAGE_CONFIGS` en `src/utils/imageUtils.ts` o Cloudinary falla
- Cron de actualización automática de estados: **desactivado** (`app.ts`)
- `NODE_ENV=demo` carga `.env.test` y activa morgan/logs (igual que `development`)

---

## Entorno local

- PostgreSQL 18 local. Base: `MGA_test_db`, usuario: `postgres`, password: `postgres`, puerto: `5432`
- Arrancar servidor local: `npm run dev:demo` (NODE_ENV=demo, carga `.env.test`, puerto 3001)
- Matar proceso en puerto 3001: `kill $(lsof -ti:3001)`
- Migraciones locales individuales: `npx cross-env NODE_ENV=test ENV_FILE=.env.test node migrations/runSingle.js <archivo.sql>`
- Migraciones producción individuales: `npx cross-env NODE_ENV=production node migrations/runSingle.js <archivo.sql>`
- `.env.test` tiene credenciales falsas de Cloudinary — para probar uploads reales en dev, copiar las credenciales del `.env`
- `npm run dev` y `dev:demo` usan `tsx watch` (nodemon se sacó el 2026-10-06)
- Tests: `NODE_ENV=test npx vitest run` (usa `.env.test`, base local y Cloudinary falso)

---

## Migraciones (actualizado 2026-06-24)

Scripts SQL en `migrations/scripts/`. Usar `runSingle.js` de a una, nunca `index.js` en producción.

| # | Descripción | Estado |
|---|---|---|
| 000-008 | Base del schema | prod + local |
| 009-010 | Google OAuth tokens y reviews | prod + local |
| 011 | Performance indexes | prod + local |
| 012 | receipt_image en reservation_payments | prod + local |
| 013 | Tabla suppliers, reservation_suppliers, supplier_payments | prod + local |
| 014 | Amount columns en reservations | prod + local |
| 015 | payment_reference en payments | prod + local |
| 016 | **ELIMINADA** (era RENAME COLUMN) | — |
| 017 | cleaning_fee en reservation_suppliers | prod + local |
| 018 | Normaliza payment_status 'complete' → 'completed' | prod + local |
| 019 | Tabla investments | prod + local |
| 020 | Indexes FK en supplier tables | prod + local |
| 021 | mga_parse_date() IMMUTABLE + expression indexes | prod + local |
| 022 | ON DELETE CASCADE en reservation_payments | prod + local |
| 023 | Tablas experiences + experience_inquiries | prod + local |
| 024 | Tablas transfer_vehicles + transfer_inquiries | prod + local |
| 025 | luggage_large/medium/carry_on en transfer_inquiries | prod + local |
| 026 | Actualiza CHECK constraint métodos de pago supplier | prod + local ✅ |

---

## Métodos de pago

**Reservation payments** (`reservation_payments.payment_method`):
`card` | `cash` | `transfer` | `paypal` | `zelle` | `stripe` | `other`

**Supplier payments** (`supplier_payments.method`):
`cash` | `card` | `transfer` | `paypal` | `zelle` | `stripe` | `other`

---

## Estado de ramas y features

> Última sesión: `docs/memory/2026-10-06.md`
> Documentos de referencia:
> - `docs/contracts/api-frontend-contract.md` — contrato general API ↔ Frontend
> - `docs/contracts/investments-frontend-contract.md` — contrato investments
> - `docs/contracts/experiences-frontend-contract.md` — contrato experiences
> - `docs/contracts/transfers-frontend-contract.md` — contrato transfers

| Feature | Rama | Estado |
|---|---|---|
| Investments | `main` | ✅ en producción |
| Experiences | `main` | ✅ en producción |
| Transfers | `main` | ✅ en producción |
| GET /supplier-payments | `main` | ✅ en producción (PR #43) |
| ImageService.syncImages (borrado/orden real de imágenes) | `main` | ✅ en producción (PR #46, 2026-07-23) |
| `?sort=recent` opcional en apartments/cars/yachts/villas | `main` | ✅ en producción (PR #47) |
| Spec 001 — subida de imágenes sin agotar la memoria | `main` | ✅ en producción (PR #50, 2026-10-06) |
| Fix memoria nativa de `sharp` | `main` | ✅ en producción (PR #51/#52, 2026-10-06) |
| Fix PDF: imágenes incrustadas una vez + achicadas | `main` | ✅ en producción (PR #53/#54, 2026-10-06) |

**Al 2026-10-06:** `main` = `15d5ef8` (release #54). Migraciones hasta 026 (sin cambios).

---

## ⚠️ Advertencia operativa — dev local apunta a producción

El servidor local (`npm run dev:demo`, puerto 3001) usa la `DATABASE_URL` y las credenciales `CLOUDINARY_*` de **producción** — no hay ambiente aislado. (Verificado el 2026-10-06: el `.env` local apunta a la cuenta de Cloudinary `dcxa0ozit`, no a la de producción `dbvpwfh07`. La base no se verificó: tratarla como producción.) Cualquier prueba de borrado/creación/edición desde el admin panel local (o contra este backend en `localhost:3001`) afecta datos reales del cliente. Probar siempre con entidades de prueba propias y limpiar después. Ver detalle en `docs/memory/2026-07-23.md`.

---

## Memoria y subida de imágenes (2026-10-06)

Render Starter tiene **512 MiB**. Hubo OOM kills por imágenes en RAM y, sobre todo, por el PDF de reserva. Detalle completo en `docs/memory/2026-10-06.md` y `specs/001-image-upload-memory-safety/`.

- **Uploads:** multer a disco (`os.tmpdir()`), validación del contenido real con `sharp` (miniatura con `failOn: 'truncated'`), subida a Cloudinary desde la ruta con cola global de 3, limpieza de temporales al terminar y al arrancar.
- **Reemplazos:** las imágenes y comprobantes viejos se borran recién después de guardar los nuevos. Si falla una subida parcial, se borran de Cloudinary las que sí subieron.
- **`sharp`:** `cache(false)` y `concurrency(1)`.
- **Runtime:** `start` con `--max-old-space-size=256`, `engines.node: 22.x`, y `MALLOC_ARENA_MAX=2` en las variables de Render.
- **PDF (`pdfService.ts`):** pasar **rutas** a `doc.image()`, nunca Buffers, para que pdfkit incruste cada imagen una sola vez. Imágenes de `src/assets/images/`: `logo_texto_negro.png` (1300 × 452, marca de agua) y `logo_negro.png` (600 × 338, cabecera). No agregar imágenes grandes ahí.
- **Diagnóstico:** en la Shell de Render, `egrep '^(anon|file|shmem|kernel) ' /sys/fs/cgroup/memory.stat` — `anon` es lo que causa OOM, `file` es caché reclamable.

---

## Imágenes — sync en updates (2026-07-23)

`ImageService.syncImages({ currentImages, existingImagesRaw, files, entityType })` (`src/services/imageService.ts`) centraliza el manejo de imágenes en los updates de `apartment.ts`, `car.ts`, `yacht.ts`, `villa.ts`:

- `existingImagesRaw` = `req.body.existingImages`, un **JSON string** (no campos repetidos) con el array final de URLs a conservar, en el orden que decide el front.
- Mergea `[...keptImages, ...newUploadedUrls]` — las nuevas siempre van al final.
- Borra de Cloudinary las URLs que estaban en `currentImages` pero no en `keptImages`.
- Si no llega `existingImages` ni hay archivos nuevos, no toca el campo `images`.

Los 4 controllers fetchean la entidad (`getXById`) antes de actualizar para poder diffear contra `currentImages`.

---

## Orden de listados — `?sort=recent` (2026-07-23)

Los 4 modelos de listado (`apartment.ts`, `car.ts`, `yacht.ts`, `villa.ts`) aceptan un `sortOrder` opcional (`'ASC' | 'DESC'`, default `'ASC'` — sin cambios si no se pide). Los controllers lo obtienen con `parseSortOrder(req.query)` (`src/utils/pagination.ts`): `?sort=recent` → `DESC`, cualquier otro valor o ausente → `ASC`.

Pensado para que el admin de `MiamiGetAwayFront` pueda pedir los últimos cargados primero (`/admin/apartments`) sin afectar al listado público ni a nada que no mande el parámetro explícitamente.

---

## Endpoint: GET /api/supplier-payments (2026-06-24)

Devuelve pagos a proveedores con contexto completo. Auth: JWT.

**Query params:** `supplierId`, `reservationId`, `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD), `page`, `limit`

**Response:** `{ data[], pagination, summary }` — `summary` es `null` sin `supplierId`; con él incluye `{ totalPaid, totalOwed, balance }` calculado sobre **todas** las reservas del supplier.

**JOIN chain:** `supplier_payments → reservation_suppliers → reservations → apartments → suppliers`
