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

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.
