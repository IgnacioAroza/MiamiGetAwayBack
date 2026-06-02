# MiamiGetAwayBack — Memory

Archivo de notas y contexto del proyecto para uso con Claude Code.

---

## Resumen del proyecto

Backend REST API para **MiamiGetAway**, plataforma de alquiler de propiedades y servicios en Miami.

- **Stack**: Node.js + TypeScript (ESM) + Express + PostgreSQL
- **Autenticación**: JWT (`/api/auth/login`)
- **Imágenes**: Cloudinary (multipart/form-data, campo `images`, máx. 30)
- **Email**: Nodemailer + Zoho SMTP
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
| Resúmenes mensuales | `/api/summaries` | Todos |
| Google My Business | `/api/google-mybusiness` | Solo admin endpoints |
| Cron | `/api/cron` | Sí |

---

## Convenciones

- Fechas de reservaciones: formato `MM-DD-YYYY HH:mm`
- Imágenes: `multipart/form-data`, campo `images`
- Cron de actualización automática de estados: **desactivado** (`app.ts:93`)
- `NODE_ENV=development` activa morgan y logs de debug

---

## Entorno local

- PostgreSQL 18 instalado localmente. Base: `MGA_test_db`, usuario: `test`, password: `test`, puerto: `5432`.
- Arrancar servidor local: `npm run dev:demo` (NODE_ENV=demo, carga `.env.test`, puerto 3001).
- Migraciones locales: `npx cross-env NODE_ENV=test ENV_FILE=.env.test node migrations/index.js`
- `gh` CLI instalado en `C:\Program Files\GitHub CLI\gh.exe` (no está en PATH del sistema).

## Migraciones

Scripts SQL en `migrations/scripts/` (000 al 011 + `000b_create_missing_tables.sql`). Ejecutar con `npm run migrate`.

`000b` es solo para setup local — crea tablas que existían en producción antes del sistema de migraciones (admins, cars, villas, yachts, reviews) y columnas faltantes en clients/reservations/apartments.

---

## Cambios pendientes del cliente

> Estado: **security + optimizaciones + paginación mergeados a main (PR #39 + #40, 2026-05-31) — features del cliente pendientes**
> Última sesión: `docs/memory/2026-05-31.md`
> Documentos de referencia:
> - `docs/api-frontend-contract.md` — contrato completo API ↔ Frontend con todos los endpoints, bodies y responses
> - `docs/presupuesto.md` — presupuesto técnico y propuesta para el cliente ($1.500 USD)

### 1. Nuevos servicios: Experiencias, Inversiones y Traslados

Agregar tres nuevas entidades de servicio, similares a apartamentos/villas/yates/autos.
- Rutas: `/api/experiences`, `/api/investments`, `/api/transfers`

#### Inversiones (`/api/investments`) ✅ campos confirmados
| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | Nombre de la inversión |
| `unit_number` | string | Número de unidad |
| `address` | string | Dirección |
| `description` | string | Descripción |
| `bathrooms` | number | Cantidad de baños |
| `rooms` | number | Cantidad de habitaciones |
| `price` | number / null | "A consultar" — puede ser null |
| `images` | string[] | URLs Cloudinary |

#### Experiencias (`/api/experiences`) ✅ campos confirmados

Tiene dos responsabilidades separadas:

**A) Entidad experiencia** — gestionada por el admin (CRUD con auth):
| Campo | Tipo | Notas |
|---|---|---|
| `title` | string | Nombre (ej: "Vuelo en helicóptero") |
| `description` | string | Descripción |
| `capacity` | number | Capacidad de personas |
| `price` | number | Precio "a partir de" (mínimo referencial) |
| `images` | string[] | URLs Cloudinary, multipart/form-data, máx. 30 |

**B) Consulta de cliente** — endpoint público (`POST /api/experiences/:id/inquiry` o similar):
| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | Nombre del cliente interesado |
| `lastname` | string | Apellido |
| `email` | string | Email |
| `phone` | string | Teléfono |

Al recibir la consulta, el backend debe:
- **Guardar la consulta en BD** (tabla `experience_inquiries`) con `experience_id` + datos del cliente + `created_at`
- **Estado de la consulta**: `pending` | `contacted` | `closed` (para seguimiento desde el panel del admin)
- Enviar **email de notificación al admin** del negocio
- El **WhatsApp** lo maneja el frontend (link/redirect, no el backend)

#### Traslados (`/api/transfers`) ✅ campos confirmados

Tiene dos entidades separadas:

**A) Flota (`transfer_fleet`)** — gestionada por el admin (CRUD con auth):
| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | Nombre del vehículo (ej: "Mercedes Benz S Class") |
| `category` | enum | `sedan` \| `suv` \| `van` |
| `capacity` | number | Capacidad de pasajeros |
| `description` | string | Descripción / amenidades |
| `images` | string[] | URLs Cloudinary |

**B) Consultas de traslado (`transfer_inquiries`)** — endpoint público:
| Campo | Tipo | Notas |
|---|---|---|
| `pick_up` | string | Lugar de recogida |
| `drop_off` | string | Lugar de destino |
| `date` | string | Fecha del traslado |
| `time` | string | Hora del traslado |
| `passengers` | number | Cantidad de pasajeros |
| `service_type` | enum | `airport` \| `business` \| `private_event` \| `sports_event` |
| `vehicle_id` | number / null | Vehículo preferido (opcional) |
| `name` | string | Nombre del cliente |
| `lastname` | string | Apellido del cliente |
| `email` | string | Email del cliente |
| `phone` | string | Teléfono del cliente |
| `status` | enum | `pending` \| `contacted` \| `closed` |

Al recibir la consulta:
- **Guardar en BD**
- Enviar **email de notificación al admin**
- El **WhatsApp** lo maneja el frontend

### 2. Datos del proveedor en reservaciones ✅ confirmado (ver imagen UI)

Tres entidades nuevas para reemplazar Excel en el cálculo de profit:

**A) Tabla `suppliers`** — proveedores reutilizables entre reservas (CRUD con auth):
| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | Nombre del proveedor (ej: "Carolina Méndez") |
| `company` | string | Empresa (ej: "Coastal Stays Management") |
| `email` | string | Email |
| `phone` | string | Teléfono |

**B) Tabla `reservation_suppliers`** — vincula un proveedor a una reserva con sus condiciones de pago:
| Campo | Tipo | Notas |
|---|---|---|
| `reservation_id` | number | FK a `reservations` |
| `supplier_id` | number | FK a `suppliers` |
| `payout_per_night` | number | Costo por noche al proveedor |
| `payment_terms` | string | Ej: "Within 48h after check-out" |

Campos calculados (no se guardan, se derivan):
- **Total** = noches × payout_per_night
- **Paid** = suma de pagos registrados al proveedor
- **Balance** = total - paid

**C) Tabla `supplier_payments`** — historial de pagos al proveedor:
| Campo | Tipo | Notas |
|---|---|---|
| `reservation_supplier_id` | number | FK a `reservation_suppliers` |
| `amount` | number | Monto del pago |
| `method` | enum | `cash` \| `wire` \| `card` \| `transfer` |
| `date` | date | Fecha del pago |
| `reference_notes` | string | Referencia / notas libres |
| `receipt_images` | string[] | URLs Cloudinary (recibos) |

**Cálculo de profit por reserva:**
- Revenue = suma de `reservation_payments` (lo que paga el cliente)
- Cost = suma de `supplier_payments` (lo que se le paga al proveedor)
- **Profit = Revenue − Cost**

**Campo `supplier_status` en tabla `reservations`:**
| Estado | Cuándo | Quién lo setea |
|---|---|---|
| `unassigned` | Al crear la reserva (default) | API automáticamente |
| `searching` | El admin está buscando proveedor | Admin manualmente |
| `confirmed` | Al asignar proveedor (`POST /reservations/:id/supplier`) | API automáticamente |

- Al eliminar proveedor (`DELETE /reservations/:id/supplier`) → vuelve a `unassigned` automáticamente
- Frontend usa este campo para colorear: 🔴 unassigned, 🟡 searching, 🟢 confirmed
- El admin solo interviene manualmente para setear `searching`

### 3. Cambios en PDFs generados

Afecta: `src/services/pdfService.ts`

**A) Fix de impresión del fondo**

Problema actual: `addBackgroundImage()` (línea 682) renderiza la foto de fondo con `fillOpacity(1)` + todo el texto en blanco. Al imprimir sale negro o el texto queda invisible sobre papel blanco.

Solución acordada:
- Bajar la opacidad del fondo a ~0.15 (watermark sutil, no afecta impresión)
- Cambiar todos los colores de texto de `white` a dark navy (`#1a2a3a` o similar)
- El encabezado del table (`#1B4B82`) se mantiene con texto blanco — ese sí imprime bien

**B) Agregar políticas de reserva**

- Agregar una página nueva al final del PDF con las políticas de la empresa
- El texto de las políticas está listo — **pendiente que el cliente lo pase**
- Mantener el mismo estilo visual (fondo watermark + texto dark navy)
- Implementar con `doc.addPage()` después de la sección de notas actuales

### 4. Imágenes en notas de pagos de reserva

**Alcance acotado (más simple de lo inicial):**
- **Una sola imagen** por pago (no array) — el recibo del pago
- Se sube a Cloudinary y se guarda la URL en la tabla `reservation_payments`
- Nuevo campo: `receipt_image` (string, nullable) en `reservation_payments`

**Endpoints afectados:**
- `POST /api/reservations/:id/payments` — acepta imagen como `multipart/form-data`
- `PUT /api/reservation-payments/:id` — permite actualizar/reemplazar la imagen
- `GET /api/reservations/:id/payments` — incluye `receipt_image` en la respuesta (para verla desde la reserva)
- `GET /api/reservation-payments/:id` — incluye `receipt_image` en la respuesta

**Nota sobre supplier_payments:** también tendrán `receipt_images` (ver punto 2C), misma lógica.
