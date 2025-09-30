# MiamiGetAwayBack

Backend para la aplicación MiamiGetAway, un servicio de alquiler de apartamentos en Miami.

## Tecnologías utilizadas

- Node.js
- Express
- TypeScript
- PostgreSQL
- Vitest (para pruebas)
- Cloudinary (para almacenamiento de imágenes)

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/tu-usuario/miamigetaway.git
cd miamigetaway
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
PORT=3000
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/miamigetaway
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=1d
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

4. Para Google My Business Reviews, agrega el archivo de credenciales OAuth:
   - Descarga `client_secret_OAtuh_MGA_reviews.json` desde Google Cloud Console
   - Colócalo en la raíz del proyecto (mismo nivel que package.json)

5. Ejecuta las migraciones de la base de datos:

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

Para ejecutar las pruebas:

```bash
npm test
```

Para ejecutar las pruebas en modo watch:

```bash
npm run test:watch
```

Para ver la cobertura de código:

```bash
npm run test:coverage
```

## Estructura del proyecto

- `src/`: Código fuente
  - `controllers/`: Controladores de la API
  - `models/`: Modelos de datos
  - `routes/`: Rutas de la API
  - `middleware/`: Middlewares
  - `utils/`: Utilidades
  - `schemas/`: Esquemas de validación
  - `types/`: Tipos de TypeScript
  - `__tests__/`: Pruebas
- `dist/`: Código compilado

## API Endpoints

### Google My Business Reviews

Sistema completo de integración con Google My Business para gestionar reviews de manera automática.

#### Autenticación OAuth

- `GET /api/google-mybusiness/auth-status`: Verificar estado de autenticación
- `GET /api/google-mybusiness/auth/start`: Iniciar proceso de autenticación OAuth con Google
- `GET /api/google-mybusiness/callback`: Callback de OAuth (manejado automáticamente)

#### Reviews - Endpoints para Frontend

- `GET /api/google-mybusiness/reviews`: **Obtener reviews desde base de datos local** (recomendado para frontend)
  - Query params:
    - `limit` (número): Cantidad de reviews por página (default: 50)
    - `offset` (número): Desplazamiento para paginación (default: 0)
  - Respuesta:
    ```json
    {
      "success": true,
      "data": {
        "reviews": [
          {
            "id": 1,
            "google_review_id": "AbFvOqloz_XyevxiRF4EoXoq0ZZidDd8oE9VBXnneSDoyoXj5WTZeWFR2znS0GSt08jdbON9uTo4",
            "reviewer_name": "Juan Pérez",
            "reviewer_photo_url": "https://...",
            "rating": 5,
            "comment": "Excelente servicio...",
            "google_create_time": "2024-12-15T10:30:00Z",
            "google_update_time": "2024-12-15T10:30:00Z",
            "reply_comment": "Gracias por su comentario...",
            "sync_status": "active",
            "local_created_at": "2025-09-29T15:00:00Z"
          }
        ],
        "count": 44,
        "total": 44
      }
    }
    ```

- `GET /api/google-mybusiness/reviews/stats`: **Estadísticas de reviews** (ideal para dashboards)
  - Respuesta:
    ```json
    {
      "success": true,
      "data": {
        "totalReviews": 44,
        "averageRating": 4.8,
        "ratingDistribution": {
          "1": 0,
          "2": 1,
          "3": 2,
          "4": 8,
          "5": 33
        },
        "lastSync": "2025-09-29T15:00:14.860Z",
        "recentReviews": 5
      }
    }
    ```

- `GET /api/google-mybusiness/reviews/search`: **Buscar reviews por texto**
  - Query params:
    - `q` (string, requerido): Término de búsqueda en comentarios
    - `limit` (número): Cantidad de resultados (default: 20)
  - Respuesta: Mismo formato que `/reviews` pero filtrado

#### Reviews - Endpoints de Administración

- `GET /api/google-mybusiness/reviews/fetch`: Obtener reviews directamente desde Google API (sin guardar)
- `POST /api/google-mybusiness/reviews/sync`: **Sincronizar reviews** (fetch desde Google + guardar en BD)
- `GET /api/google-mybusiness/admin/tokens`: Información de tokens OAuth (auth requerido)
- `GET /api/google-mybusiness/admin/sync-info`: Información de sincronización (auth requerido)
- `POST /api/google-mybusiness/admin/initialize`: Forzar inicialización (auth requerido)
- `GET /api/google-mybusiness/health`: Health check del servicio

#### Ejemplos de uso para Frontend:

```bash
# Obtener todas las reviews (paginadas)
GET /api/google-mybusiness/reviews?limit=10&offset=0

# Obtener estadísticas para dashboard
GET /api/google-mybusiness/reviews/stats

# Buscar reviews que mencionen "excelente"
GET /api/google-mybusiness/reviews/search?q=excelente&limit=5

# Verificar estado de autenticación
GET /api/google-mybusiness/auth-status

# Sincronizar reviews (para admin)
POST /api/google-mybusiness/reviews/sync
```

#### Casos de uso Frontend:

1. **Widget de Reviews**: Usar `/reviews?limit=5` para mostrar las 5 reviews más recientes
2. **Dashboard de Stats**: Usar `/reviews/stats` para mostrar métricas y gráficos
3. **Página completa de Reviews**: Usar `/reviews` con paginación
4. **Búsqueda de Reviews**: Usar `/reviews/search?q=...` para búsqueda en tiempo real
5. **Panel de Administración**: Usar endpoints `/admin/*` para gestión

### Summaries / Reportes

- `GET /api/summaries/sales-volume` (auth requerido): Reporte de volumen de ventas basado en pagos.
  - Query params:
    - `from` (YYYY-MM-DD) requerido
    - `to` (YYYY-MM-DD) requerido
    - `groupBy` opcional: `day | month | year` (por defecto `month`)
  - Respuesta:
    - `{ from, to, groupBy, series: [{ period, totalRevenue, totalPayments }], totals: { totalRevenue, totalPayments } }`
  - Ejemplos:
    ```bash
    # Ventas por mes en Q1 2025
    GET /api/summaries/sales-volume?from=2025-01-01&to=2025-03-31&groupBy=month

    # Ventas diarias en enero 2025
    GET /api/summaries/sales-volume?from=2025-01-01&to=2025-01-31&groupBy=day
    ```

- Endpoints existentes de resúmenes mensuales (auth requerido):
  - `POST /api/summaries/generate` — genera/actualiza el resumen del mes. Body: `{ month, year }`.
  - `GET /api/summaries/:year/:month` — obtiene detalles del resumen (reservas y pagos del mes).
  - `GET /api/summaries/:year/:month/pdf` — descarga PDF del resumen mensual.
  - `POST /api/summaries/:year/:month/send` — envía el resumen mensual por email.

### Apartamentos

- `GET /api/apartments`: Obtener todos los apartamentos
- `GET /api/apartments/:id`: Obtener un apartamento por ID
- `POST /api/apartments`: Crear un nuevo apartamento
- `PUT /api/apartments/:id`: Actualizar un apartamento
- `DELETE /api/apartments/:id`: Eliminar un apartamento

#### Query Parameters disponibles para filtrar apartamentos:

**Filtros por precio:**
- `minPrice`: Precio mínimo (ej: `100.50`)
- `maxPrice`: Precio máximo (ej: `500.00`)

**Filtros por capacidad:**
- `capacity`: Cantidad mínima de personas (ej: `4`)

**Filtros por ubicación:**
- `q`: Búsqueda por texto en la dirección (ej: `miami beach`)

#### Ejemplos de uso:

```bash
# Obtener todos los apartamentos
GET /api/apartments

# Filtrar por rango de precio
GET /api/apartments?minPrice=150&maxPrice=400

# Filtrar por capacidad mínima de personas
GET /api/apartments?capacity=4

# Filtrar por ubicación
GET /api/apartments?q=miami beach

# Filtros combinados: precio, capacidad y ubicación
GET /api/apartments?minPrice=200&maxPrice=350&capacity=2&q=downtown

# Solo precio mínimo
GET /api/apartments?minPrice=100

# Solo precio máximo
GET /api/apartments?maxPrice=300

# Para frontend con barra deslizante de precio
GET /api/apartments?minPrice=150.75&maxPrice=425.50&capacity=6
```

### Autos

- `GET /api/cars`: Obtener todos los autos
- `GET /api/cars/:id`: Obtener un auto por ID
- `POST /api/cars`: Crear un nuevo auto
- `PUT /api/cars/:id`: Actualizar un auto
- `DELETE /api/cars/:id`: Eliminar un auto

#### Query Parameters disponibles para filtrar autos:

**Filtros por precio:**
- `minPrice`: Precio mínimo (ej: `100.50`)
- `maxPrice`: Precio máximo (ej: `500.00`)

**Filtros por capacidad:**
- `passengers`: Cantidad mínima de pasajeros (ej: `4`)

#### Ejemplos de uso:

```bash
# Obtener todos los autos
GET /api/cars

# Filtrar por rango de precio
GET /api/cars?minPrice=100&maxPrice=300

# Filtrar por cantidad de pasajeros
GET /api/cars?passengers=4

# Filtrar por precio y pasajeros combinados
GET /api/cars?minPrice=150&maxPrice=400&passengers=2

# Solo precio mínimo
GET /api/cars?minPrice=200

# Solo precio máximo  
GET /api/cars?maxPrice=250

# Para frontend con barra deslizante de precio
GET /api/cars?minPrice=100.50&maxPrice=350.75&passengers=4
```

### Usuarios

- `POST /api/auth/register`: Registrar un nuevo usuario
- `POST /api/auth/login`: Iniciar sesión
- `GET /api/users/me`: Obtener información del usuario actual

### Reservaciones

- `GET /api/reservations`: Obtener todas las reservaciones

#### Query Parameters disponibles para filtrar reservaciones:

**Filtros básicos:**
- `startDate`: Fecha de inicio en formato `MM-DD-YYYY HH:mm`
- `endDate`: Fecha de fin en formato `MM-DD-YYYY HH:mm`
- `status`: Estado de la reservación (pending, confirmed, checked_in, checked_out, cancelled)
- `clientName`: Buscar por nombre del cliente (coincidencia parcial)
- `clientEmail`: Buscar por email exacto del cliente

**Nuevos filtros:**
- `q`: Búsqueda general por nombre o apellido del cliente (coincidencia parcial)
- `clientLastname`: Buscar por apellido del cliente (coincidencia parcial)
- `upcoming`: Filtrar reservaciones futuras (`true`, `false`, `1`, `0`)
- `fromDate`: Fecha base para el filtro `upcoming` en formato `MM-DD-YYYY` (solo con `upcoming=true`)
- `withinDays`: Limitar reservaciones futuras a N días desde la fecha base (solo con `upcoming=true`)

#### Ejemplos de uso:

```bash
# Obtener todas las reservaciones
GET /api/reservations

# Buscar por nombre o apellido
GET /api/reservations?q=john

# Reservaciones futuras
GET /api/reservations?upcoming=true

# Reservaciones futuras desde una fecha específica
GET /api/reservations?upcoming=true&fromDate=01-15-2025

# Reservaciones futuras en los próximos 30 días
GET /api/reservations?upcoming=true&withinDays=30

# Reservaciones futuras en los próximos 7 días desde una fecha específica
GET /api/reservations?upcoming=true&fromDate=01-15-2025&withinDays=7

# Combinar filtros: reservaciones confirmadas futuras de un cliente
GET /api/reservations?status=confirmed&upcoming=true&clientLastname=smith
```

### Pagos de Reservaciones

- `GET /api/reservationPayments`: Obtener todos los pagos de reservaciones

#### Query Parameters disponibles para filtrar pagos:

**Filtros por fechas:**
- `startDate`: Fecha de inicio de pagos en formato `MM-DD-YYYY`
- `endDate`: Fecha de fin de pagos en formato `MM-DD-YYYY`

**Filtros por pago:**
- `paymentMethod`: Método de pago (ej: cash, card, transfer)
- `status`: Estado del pago
- `reservationId`: ID específico de reservación

**Filtros por cliente:**
- `clientName`: Buscar por nombre del cliente (coincidencia parcial)
- `clientEmail`: Buscar por email exacto del cliente
- `clientLastname`: Buscar por apellido del cliente (coincidencia parcial)
- `q`: Búsqueda general por nombre o apellido del cliente (coincidencia parcial)

#### Ejemplos de uso:

```bash
# Obtener todos los pagos
GET /api/reservation-payments

# Pagos por método
GET /api/reservation-payments?paymentMethod=card

# Pagos de un cliente específico
GET /api/reservation-payments?q=john

# Pagos en un rango de fechas
GET /api/reservation-payments?startDate=01-01-2025&endDate=12-31-2025

# Pagos de una reservación específica
GET /api/reservation-payments?reservationId=123

# Combinar filtros: pagos con tarjeta de un cliente en enero
GET /api/reservation-payments?paymentMethod=card&clientLastname=smith&startDate=01-01-2025&endDate=01-31-2025
```

## Ejemplo de uso de la API

**Registrar usuario:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@correo.com","password":"123456"}'
```

**Obtener apartamentos:**

```bash
curl http://localhost:3000/api/apartments
```

## Despliegue

Puedes desplegar este backend en plataformas como [Railway](https://railway.app/), [Render](https://render.com/) o [Heroku](https://heroku.com/).  
Asegúrate de configurar correctamente las variables de entorno en el panel de la plataforma elegida.

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

## Mejoras Recientes

- **Integración con Google My Business**: Sistema completo de reviews con autenticación OAuth2, sincronización automática y almacenamiento local. Incluye endpoints optimizados para frontend con paginación, búsqueda y estadísticas.

- **Sistema de Reviews**: 
  - Autenticación OAuth2 con Google My Business API
  - Sincronización automática de reviews con base de datos PostgreSQL
  - Endpoints REST optimizados para frontend con paginación y búsqueda
  - Conversión automática de ratings (FIVE → 5, FOUR → 4, etc.)
  - Dashboard de estadísticas con distribución de ratings y métricas

- **Restructuración de Modelos**: Se eliminó el código de creación de tablas de los modelos. La creación de tablas ahora solo ocurre en los archivos de pruebas para garantizar un entorno limpio durante las pruebas. Esto mejora el rendimiento y la seguridad de la aplicación en producción.

- **Mejora en el Manejo de Errores**: Los modelos ahora gestionan mejor los casos donde pueden devolverse resultados nulos, proporcionando respuestas más consistentes y fáciles de manejar por los controladores.

## Contacto

¿Dudas o sugerencias?  
Puedes abrir un issue o escribir a [ignacioaroza.ia@gmail.com](mailto:ignacioaroza.ia@gmail.com).
