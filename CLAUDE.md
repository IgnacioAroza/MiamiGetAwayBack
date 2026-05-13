# MiamiGetAwayBack — Contexto del Proyecto

## Qué es este proyecto

Backend REST API para **MiamiGetAway**, una plataforma de alquiler de propiedades y servicios en Miami. Construido con Node.js, Express y TypeScript, conectado a una base de datos PostgreSQL en Render.

## Dominio principal

El sistema gestiona:
- **Propiedades para alquilar**: apartamentos, villas, yates y autos — cada uno con subida de imágenes a Cloudinary
- **Clientes y reservaciones**: con estados (`pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`), cuota de cancelación y pagos asociados
- **Pagos de reservaciones**: registro de pagos por reserva, con filtros por fecha, método y cliente
- **Resúmenes mensuales**: reportes de ventas en PDF, enviados por email vía Zoho SMTP
- **Reviews de Google My Business**: sincronización OAuth2 con la API de Google, almacenamiento local en PostgreSQL y endpoints optimizados para frontend
- **Admins**: autenticación con JWT (login en `/api/auth/login`)

## Stack técnico

- **Runtime**: Node.js + TypeScript (ESM, `tsx` en dev, `tsc` en prod)
- **Framework**: Express
- **DB**: PostgreSQL via `pg` — pool de conexión en `src/utils/db_render.ts` usando variables individuales (`DB_USER`, `HOST`, `DATABASE`, `PASSWORD`, `PORT_DB`)
- **Validación**: Zod (schemas en `src/schemas/`)
- **Imágenes**: Cloudinary, centralizado en `src/services/imageService.ts`
- **Email**: Nodemailer + Zoho SMTP (`src/services/emailService.ts`)
- **PDF**: PDFKit (`src/services/pdfService.ts`)
- **Auth**: JWT en `src/middleware/authMiddleware.ts`
- **Tests**: Vitest + Supertest (unitarios e integración en `src/__tests__/`)
- **Migraciones**: scripts SQL en `migrations/scripts/`, ejecutados con `npm run migrate`

## Estructura de carpetas clave

```
src/
├── controllers/   # Lógica de cada endpoint
├── models/        # Queries SQL directas a la DB
├── routes/        # Definición de rutas Express
├── services/      # Lógica de negocio reutilizable
├── middleware/    # authMiddleware, uploadMiddleware
├── schemas/       # Validación con Zod
├── types/         # Tipos TypeScript
└── utils/         # db_render.ts, cloudinaryConfig.ts
migrations/
└── scripts/       # 001..010 archivos SQL
```

## Convenciones importantes

- Los endpoints de escritura (POST, PUT, DELETE) requieren JWT salvo en entidades públicas (reviews internas, GET de propiedades)
- Las imágenes se suben como `multipart/form-data` con el campo `images` (máx. 30 archivos)
- Las fechas de reservaciones usan el formato `MM-DD-YYYY HH:mm`
- El cron de actualización automática de estados está **desactivado** (`app.ts:93`)
- `NODE_ENV=development` activa morgan y logs de debug

## Approach

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.
