# MiamiGetAwayBack

Backend para la aplicación MiamiGetAway, un servicio de alquiler de propiedades y servicios en Miami (apartamentos, villas, yates, autos).

## Tecnologías utilizadas

- Node.js
- Express
- TypeScript
- PostgreSQL
- Vitest (para pruebas)
- Cloudinary (para almacenamiento de imágenes)
- Nodemailer + Zoho SMTP (para envío de emails)
- PDFKit (para generación de PDFs)
- Google My Business API (para sincronización de reviews)

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/IgnacioAroza/MiamiGetAwayBack.git
cd MiamiGetAwayBack
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Servidor
PORT=3001
NODE_ENV=development

# CORS — orígenes permitidos separados por coma
ALLOWED_ORIGINS=http://localhost:5173,https://tu-frontend.com

# Base de datos (variables individuales usadas por db_render.ts)
DB_USER=tu_usuario
HOST=tu_host
DATABASE=tu_base_de_datos
PASSWORD=tu_password
PORT_DB=5432

# JWT
JWT_SECRET=tu_secreto_jwt

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Email (SMTP)
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_USER=tu_email@dominio.com
EMAIL_PASSWORD=tu_password_email
ADMIN_EMAIL=admin@dominio.com

# Google My Business (OAuth2)
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_PROJECT_ID=tu_project_id
GOOGLE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/api/google-mybusiness/callback
```

4. Ejecuta las migraciones de la base de datos:

```bash
npm run migrate
```

## Ejecución

Para ejecutar el servidor en modo desarrollo:

```bash
npm run dev
```

Para compilar y ejecutar en producción:

```bash
npm run build
npm start
```

## Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Modo watch
npm run test:watch

# Cobertura de código
npm run test:coverage
```

## Estructura del proyecto

```
src/
├── controllers/     # Lógica de cada endpoint
├── models/          # Queries a la base de datos
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio reutilizable
│   ├── emailService.ts          # Envío de emails (Nodemailer)
│   ├── pdfService.ts            # Generación de PDFs
│   ├── imageService.ts          # Manejo centralizado de Cloudinary
│   ├── cronService.ts           # Jobs automáticos (actualmente desactivado)
│   ├── googleMyBusinessService.ts
│   ├── reservationService.ts
│   ├── reservationPaymentsService.ts
│   └── monthlySummaryService.ts
├── middleware/      # Auth y upload
├── schemas/         # Validación con Zod
├── types/           # Tipos TypeScript
├── utils/           # DB connection, Cloudinary config
└── __tests__/       # Pruebas unitarias e integración
migrations/
└── scripts/         # Archivos SQL de migraciones
```

## API Endpoints

> Los endpoints marcados con **(auth)** requieren header `Authorization: Bearer <token>`.

---

### Autenticación

- `POST /api/auth/login` — Iniciar sesión como administrador
  - Body: `{ "username": "string", "password": "string" }`
  - Respuesta: `{ "token": "...", "admin": { "id", "username" } }`

---

### Administradores

- `GET /api/admins` — Obtener todos los administradores
- `GET /api/admins/:id` — Obtener un administrador por ID
- `POST /api/admins` — Crear un nuevo administrador
- `PUT /api/admins/:id` — Actualizar un administrador
- `DELETE /api/admins/:id` — Eliminar un administrador

---

### Usuarios

- `GET /api/users` — Obtener todos los usuarios
- `GET /api/users/:id` — Obtener un usuario por ID
- `POST /api/users` — Crear un usuario
- `PUT /api/users/:id` **(auth)** — Actualizar un usuario
- `DELETE /api/users/:id` **(auth)** — Eliminar un usuario

---

### Apartamentos

- `GET /api/apartments` — Obtener todos los apartamentos
- `GET /api/apartments/:id` — Obtener un apartamento por ID
- `POST /api/apartments` **(auth)** — Crear un apartamento (acepta imágenes: `multipart/form-data`, campo `images`, máx. 30)
- `PUT /api/apartments/:id` **(auth)** — Actualizar un apartamento (acepta imágenes)
- `DELETE /api/apartments/:id` **(auth)** — Eliminar un apartamento

#### Query Parameters para filtrar:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `minPrice` | número | Precio mínimo |
| `maxPrice` | número | Precio máximo |
| `capacity` | número | Capacidad mínima de personas |
| `q` | string | Búsqueda por texto en la dirección |

```bash
GET /api/apartments?minPrice=150&maxPrice=400&capacity=4&q=miami beach
```

---

### Villas

- `GET /api/villas` — Obtener todas las villas
- `GET /api/villas/:id` — Obtener una villa por ID
- `POST /api/villas` **(auth)** — Crear una villa (acepta imágenes: `multipart/form-data`, campo `images`, máx. 30)
- `PUT /api/villas/:id` **(auth)** — Actualizar una villa (acepta imágenes)
- `DELETE /api/villas/:id` **(auth)** — Eliminar una villa

---

### Yates

- `GET /api/yachts` — Obtener todos los yates
- `GET /api/yachts/:id` — Obtener un yate por ID
- `POST /api/yachts` **(auth)** — Crear un yate (acepta imágenes: `multipart/form-data`, campo `images`, máx. 30)
- `PUT /api/yachts/:id` **(auth)** — Actualizar un yate (acepta imágenes)
- `DELETE /api/yachts/:id` **(auth)** — Eliminar un yate

---

### Autos

- `GET /api/cars` — Obtener todos los autos
- `GET /api/cars/:id` — Obtener un auto por ID
- `POST /api/cars` **(auth)** — Crear un auto (acepta imágenes: `multipart/form-data`, campo `images`, máx. 30)
- `PUT /api/cars/:id` **(auth)** — Actualizar un auto (acepta imágenes)
- `DELETE /api/cars/:id` **(auth)** — Eliminar un auto

#### Query Parameters para filtrar:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `minPrice` | número | Precio mínimo |
| `maxPrice` | número | Precio máximo |
| `passengers` | número | Cantidad mínima de pasajeros |

```bash
GET /api/cars?minPrice=100&maxPrice=300&passengers=4
```

---

### Reviews (internas)

Endpoint para reviews guardadas localmente (distintas de Google My Business).

- `GET /api/reviews` — Obtener todas las reviews
- `POST /api/reviews` — Crear una review
- `DELETE /api/reviews/:id` — Eliminar una review

---

### Reservaciones

- `GET /api/reservations` **(auth)** — Obtener todas las reservaciones
- `GET /api/reservations/:id` **(auth)** — Obtener una reservación por ID
- `POST /api/reservations` **(auth)** — Crear una reservación
- `PUT /api/reservations/:id` **(auth)** — Actualizar una reservación
- `PATCH /api/reservations/:id` **(auth)** — Actualizar parcialmente una reservación
- `DELETE /api/reservations/:id` **(auth)** — Eliminar una reservación
- `GET /api/reservations/:id/payments` **(auth)** — Obtener los pagos de una reservación
- `POST /api/reservations/:id/payments` **(auth)** — Registrar un pago en una reservación
- `PATCH /api/reservations/:id/payment-status` **(auth)** — Actualizar el estado de pago
- `POST /api/reservations/:id/pdf` **(auth)** — Generar el PDF de una reservación
- `GET /api/reservations/:id/pdf/download` **(auth)** — Descargar el PDF de una reservación
- `POST /api/reservations/:id/send-notification` **(auth)** — Enviar notificación por email al cliente

#### Query Parameters para filtrar:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `startDate` | `MM-DD-YYYY HH:mm` | Fecha de inicio |
| `endDate` | `MM-DD-YYYY HH:mm` | Fecha de fin |
| `status` | string | `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled` |
| `clientName` | string | Búsqueda parcial por nombre |
| `clientLastname` | string | Búsqueda parcial por apellido |
| `clientEmail` | string | Email exacto del cliente |
| `q` | string | Búsqueda general por nombre o apellido |
| `upcoming` | `true/false` | Filtrar reservaciones futuras |
| `fromDate` | `MM-DD-YYYY` | Fecha base para `upcoming` |
| `withinDays` | número | Limitar a N días desde `fromDate` (solo con `upcoming=true`) |

```bash
# Reservaciones confirmadas futuras en los próximos 30 días
GET /api/reservations?status=confirmed&upcoming=true&withinDays=30

# Buscar por apellido
GET /api/reservations?q=smith
```

---

### Pagos de Reservaciones

- `GET /api/reservation-payments` **(auth)** — Obtener todos los pagos
- `GET /api/reservation-payments/:id` **(auth)** — Obtener un pago por ID
- `POST /api/reservation-payments` **(auth)** — Crear un pago
- `PUT /api/reservation-payments/:id` **(auth)** — Actualizar un pago
- `DELETE /api/reservation-payments/:id` **(auth)** — Eliminar un pago

#### Query Parameters para filtrar:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `startDate` | `MM-DD-YYYY` | Fecha de inicio |
| `endDate` | `MM-DD-YYYY` | Fecha de fin |
| `paymentMethod` | string | Método de pago (`cash`, `card`, `transfer`) |
| `status` | string | Estado del pago |
| `reservationId` | número | ID de una reservación específica |
| `clientName` | string | Búsqueda parcial por nombre |
| `clientLastname` | string | Búsqueda parcial por apellido |
| `clientEmail` | string | Email exacto del cliente |
| `q` | string | Búsqueda general por nombre o apellido |

```bash
GET /api/reservation-payments?paymentMethod=card&startDate=01-01-2025&endDate=12-31-2025
```

---

### Resúmenes / Reportes

Todos los endpoints requieren **(auth)**.

- `GET /api/summaries/sales-volume` — Reporte de volumen de ventas
  - Query params: `from` (YYYY-MM-DD, requerido), `to` (YYYY-MM-DD, requerido), `groupBy` (`day | month | year`, default `month`)
- `POST /api/summaries/generate` — Generar/actualizar resumen mensual. Body: `{ "month": number, "year": number }`
- `GET /api/summaries/:year/:month` — Obtener detalles de un resumen mensual
- `GET /api/summaries/:year/:month/pdf` — Descargar PDF del resumen mensual
- `POST /api/summaries/:year/:month/send` — Enviar resumen mensual por email

```bash
# Ventas por mes en Q1 2025
GET /api/summaries/sales-volume?from=2025-01-01&to=2025-03-31&groupBy=month
```

---

### Google My Business Reviews

Sistema de integración con Google My Business para gestionar reviews automáticamente.

#### Autenticación OAuth

- `GET /api/google-mybusiness/auth-status` — Verificar estado de autenticación
- `GET /api/google-mybusiness/auth/start` — Iniciar proceso OAuth con Google
- `GET /api/google-mybusiness/callback` — Callback de OAuth (manejado automáticamente)
- `GET /api/google-mybusiness/health` — Health check del servicio

#### Reviews — Endpoints para Frontend

- `GET /api/google-mybusiness/reviews` — Obtener reviews desde base de datos local
  - Query params: `limit` (default: 50), `offset` (default: 0)

- `GET /api/google-mybusiness/reviews/stats` — Estadísticas de reviews (para dashboards)

- `GET /api/google-mybusiness/reviews/search` — Buscar reviews por texto
  - Query params: `q` (requerido), `limit` (default: 20)

#### Reviews — Endpoints de Administración

- `GET /api/google-mybusiness/reviews/fetch` — Obtener reviews desde Google API (sin guardar)
- `POST /api/google-mybusiness/reviews/sync` — Sincronizar reviews (fetch + guardar en BD)
- `GET /api/google-mybusiness/admin/tokens` **(auth)** — Información de tokens OAuth
- `GET /api/google-mybusiness/admin/sync-info` **(auth)** — Información de sincronización
- `POST /api/google-mybusiness/admin/initialize` **(auth)** — Forzar inicialización

---

### Cron

- `POST /api/cron/update-reservation-statuses` **(auth)** — Ejecutar manualmente la actualización de estados de reservaciones

---

## Despliegue

Podés desplegar este backend en plataformas como [Railway](https://railway.app/), [Render](https://render.com/) o [Heroku](https://heroku.com/).
Asegurate de configurar todas las variables de entorno en el panel de la plataforma elegida.

## Contribución

¡Las contribuciones son bienvenidas!
Para contribuir:

1. Haz un fork del repositorio.
2. Crea una rama para tu feature o fix: `git checkout -b mi-feature`
3. Haz tus cambios y commitea: `git commit -am 'Agrega nueva feature'`
4. Haz push a tu rama: `git push origin mi-feature`
5. Abre un Pull Request.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

## Contacto

¿Dudas o sugerencias?
Podés abrir un issue o escribir a [ignacioaroza.ia@gmail.com](mailto:ignacioaroza.ia@gmail.com).
