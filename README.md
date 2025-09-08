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

### Apartamentos

- `GET /api/apartments`: Obtener todos los apartamentos
- `GET /api/apartments/:id`: Obtener un apartamento por ID
- `POST /api/apartments`: Crear un nuevo apartamento
- `PUT /api/apartments/:id`: Actualizar un apartamento
- `DELETE /api/apartments/:id`: Eliminar un apartamento

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
- `fromDate`: Fecha base para el filtro `upcoming` en formato `MM-DD-YYYY HH:mm` (solo con `upcoming=true`)
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
GET /api/reservations?upcoming=true&fromDate=01-15-2025%2010:00

# Reservaciones futuras en los próximos 30 días
GET /api/reservations?upcoming=true&withinDays=30

# Combinar filtros: reservaciones confirmadas futuras de un cliente
GET /api/reservations?status=confirmed&upcoming=true&clientLastname=smith
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

- **Restructuración de Modelos**: Se eliminó el código de creación de tablas de los modelos. La creación de tablas ahora solo ocurre en los archivos de pruebas para garantizar un entorno limpio durante las pruebas. Esto mejora el rendimiento y la seguridad de la aplicación en producción.

- **Mejora en el Manejo de Errores**: Los modelos ahora gestionan mejor los casos donde pueden devolverse resultados nulos, proporcionando respuestas más consistentes y fáciles de manejar por los controladores.
