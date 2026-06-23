# MiamiGetAwayBack — Memory

Archivo de notas y contexto del proyecto para uso con Claude Code.

---

## Resumen del proyecto

Backend REST API para **MiamiGetAway**, plataforma de alquiler de propiedades y servicios en Miami.

- **Stack**: Node.js + TypeScript (ESM) + Express + PostgreSQL
- **Autenticación**: JWT (`/api/auth/login`)
- **Imágenes**: Cloudinary (multipart/form-data, campo `images`, máx. 30)
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

---

## Migraciones

Scripts SQL en `migrations/scripts/`. Usar `runSingle.js` de a una, nunca `index.js` en producción.

| # | Descripción | Entorno |
|---|---|---|
| 000-008 | Base del schema | prod |
| 009-010 | Google OAuth tokens y reviews | prod |
| 011 | Performance indexes | prod |
| 012 | receipt_image en reservation_payments | prod |
| 013 | Tabla suppliers, reservation_suppliers, supplier_payments | prod |
| 014 | Amount columns en reservations | prod |
| 015 | payment_reference en payments | prod |
| 016 | **ELIMINADA** (era RENAME COLUMN) | — |
| 017 | cleaning_fee en reservation_suppliers | prod |
| 018 | Normaliza payment_status 'complete' → 'completed' | prod |
| 019 | Tabla investments | prod |
| 020 | Indexes FK en supplier tables | prod |
| 021 | mga_parse_date() IMMUTABLE + expression indexes | prod |
| 022 | ON DELETE CASCADE en reservation_payments | prod |
| 023 | Tablas experiences + experience_inquiries | prod |
| 024 | Tablas transfer_vehicles + transfer_inquiries | prod |
| 025 | luggage_large/medium/carry_on en transfer_inquiries | prod |
| 026 | Actualiza CHECK constraint métodos de pago supplier | prod — **⚠️ pendiente en BD local** |

---

## Estado de ramas y features del cliente

> Última sesión: `docs/memory/2026-06-23.md`
> Documentos de referencia:
> - `docs/api-frontend-contract.md` — contrato general API ↔ Frontend
> - `docs/investments-frontend-contract.md` — contrato investments
> - `docs/experiences-frontend-contract.md` — contrato experiences
> - `docs/transfers-frontend-contract.md` — contrato transfers
> - `docs/presupuesto.md` — presupuesto técnico ($1.500 USD)

| Feature | Rama | Estado |
|---|---|---|
| Investments | `main` | ✅ en producción |
| Experiences | `main` | ✅ en producción |
| Transfers | `main` | ✅ en producción |

---

## Métodos de pago

**Reservation payments** (`reservation_payments.payment_method`):
`card` | `cash` | `transfer` | `paypal` | `zelle` | `stripe` | `other`

**Supplier payments** (`supplier_payments.method`):
`cash` | `card` | `transfer` | `paypal` | `zelle` | `stripe` | `other`

---

## Pendientes

- ⚠️ Correr migration 026 en BD local: `npx cross-env NODE_ENV=test ENV_FILE=.env.test node migrations/runSingle.js 026_update_supplier_payment_method_enum.sql`
