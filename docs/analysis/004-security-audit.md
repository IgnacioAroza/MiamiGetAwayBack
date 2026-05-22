# Security Audit

- **Fecha**: 2026-05-14
- **Agent**: security-auditor
- **Scope**: authMiddleware, controllers/auth.ts, models/admin.ts, googleMyBusinessService.ts, src/schemas/, uploadMiddleware, app.ts (CORS + headers)

---

## Resumen ejecutivo

Se encontraron **3 vulnerabilidades críticas** que requieren fix inmediato antes de cualquier deploy: (1) `AdminModel.createAdmin` devuelve la contraseña en texto plano en la respuesta API, (2) todos los endpoints de admins están sin autenticación, y (3) el OAuth callback de Google no valida el parámetro `state` (sin protección CSRF). Adicionalmente, el CORS mal configurado puede abrir la API a cualquier origen si `ALLOWED_ORIGINS` no está seteado, y no hay ningún middleware de headers de seguridad (`helmet`). La gestión del `.env` y el uso de bcrypt son correctos. Zod cubre la mayoría de los inputs pero con gaps en longitudes máximas y validación de archivos.

---

## Hallazgos detallados

### 1. AdminModel devuelve contraseña en texto plano en la respuesta

**Severidad**: crítica  
**Ubicación**: `src/models/admin.ts:47-48`

```ts
// adminData contiene la contraseña PLAIN TEXT recibida del request body
const { id, ...dataWithoutId } = adminData;
return { id: rows[0].id, ...dataWithoutId };
// ↑ devuelve { username, email, password: "plaintext123" }
```

El modelo hashea la contraseña para guardarla en DB (correcto), pero luego construye la respuesta desde `adminData` (el objeto original con password plano) en vez de desde `rows[0]`. Cualquier cliente que llame a `POST /api/admins` recibe la contraseña en texto plano en la respuesta JSON.

Además, `getAllAdmins` y `getAdminById` hacen `SELECT *` y devuelven el hash de contraseña en la respuesta — expone el hash a cualquier atacante que acceda al endpoint (sin auth).

**Fix inmediato:**

```ts
// models/admin.ts — createAdmin: retornar desde rows[0] omitiendo password
const { password: _, ...adminWithoutPassword } = rows[0];
return adminWithoutPassword;

// getAll y getAdminById: SELECT explícito sin password
await db.query('SELECT id, username, email, created_at FROM admins')
await db.query('SELECT id, username, email, created_at FROM admins WHERE id = $1', [id])
```

---

### 2. Todos los endpoints de `/api/admins` sin autenticación

**Severidad**: crítica  
**Ubicación**: `src/routes/admin.ts`

Ya documentado en `002-api-design-review.md`. Reforzado aquí por el impacto de seguridad: combinado con el hallazgo 1, cualquier visitante puede crear una cuenta de admin y recibir su propia contraseña en texto plano en la respuesta.

**Fix inmediato**: agregar `authMiddleware` a todas las rutas de admin (ver 002).

---

### 3. OAuth callback sin validación de `state` — CSRF en flujo OAuth

**Severidad**: crítica  
**Ubicación**: `src/controllers/googleMyBusiness.ts:83-115`, `src/services/googleMyBusinessService.ts:134-139`

El flujo OAuth no genera ni valida el parámetro `state`. RFC 6749 y Google OAuth recomiendan explícitamente usar `state` para prevenir CSRF:

```ts
// googleMyBusinessService.ts:134 — sin state
getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GoogleMyBusinessService.SCOPES,
        prompt: 'consent'
        // ❌ falta: state: crypto.randomBytes(16).toString('hex')
    });
}

// googleMyBusinessController.ts:83 — callback no valida state
static async handleCallback(req: Request, res: Response): Promise<void> {
    const { code } = req.query;
    // ❌ no verifica req.query.state contra valor guardado en sesión/DB
    const tokens = await service.exchangeCodeForTokens(code);
}
```

Un atacante puede forzar a un admin autenticado a vincular su cuenta de Google con tokens del atacante.

**Fix:**
```ts
// Al generar la URL: guardar state en DB o sesión
const state = crypto.randomBytes(16).toString('hex');
// almacenar state con TTL de 10 minutos
return this.oauth2Client.generateAuthUrl({ ..., state });

// En el callback: verificar
const { code, state } = req.query;
// recuperar state guardado y comparar con crypto.timingSafeEqual
```

---

### 4. CORS permite todos los orígenes si `ALLOWED_ORIGINS` no está configurado

**Severidad**: alta  
**Ubicación**: `src/app.ts:39-40`

```ts
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    // ...
}
```

Si `ALLOWED_ORIGINS` no está definida en el `.env`, `process.env.ALLOWED_ORIGINS?.split(',')` devuelve `undefined`. En la librería `cors`, `origin: undefined` equivale a **permitir todos los orígenes** — es como no tener CORS configurado. Esto es silencioso y no genera ningún warning.

**Fix:**
```ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',');
if (!allowedOrigins || allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be configured');
}
const corsOptions = { origin: allowedOrigins, ... };
```

O como mínimo, un fallback explícito:
```ts
origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
```

---

### 5. Sin `helmet` — headers de seguridad HTTP ausentes

**Severidad**: alta  
**Ubicación**: `src/app.ts`

La API no tiene ningún middleware de headers de seguridad. Faltan:

| Header | Riesgo sin él |
|--------|---------------|
| `X-Content-Type-Options: nosniff` | MIME-type sniffing en clientes |
| `X-Frame-Options: DENY` | Clickjacking |
| `Strict-Transport-Security` | Downgrade a HTTP |
| `X-XSS-Protection` | XSS en respuestas HTML |
| `Content-Security-Policy` | Inyección de scripts |
| `Referrer-Policy` | Filtración de URLs en Referer |

**Fix** (5 minutos):
```ts
// npm install helmet
import helmet from 'helmet'
app.use(helmet())
```

---

### 6. Sin rate limiting en `/api/auth/login`

**Severidad**: alta  
**Ubicación**: `src/routes/auth.ts`, `src/controllers/auth.ts`

El endpoint de login no tiene throttling. Un atacante puede intentar contraseñas en fuerza bruta sin limitación. `bcrypt` con 10 rounds ya ralentiza cada intento (~100ms), pero no es suficiente como único mecanismo.

**Fix:**
```ts
// npm install express-rate-limit
import rateLimit from 'express-rate-limit'

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,                   // 10 intentos por IP
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
})

router.post('/login', loginLimiter, AuthController.login)
```

---

### 7. JWT — algoritmo no especificado explícitamente

**Severidad**: media  
**Ubicación**: `src/middleware/authMiddleware.ts:20`, `src/controllers/auth.ts:51-55`

```ts
// sign — sin especificar algorithm
jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '1h' })

// verify — sin especificar algorithms permitidos
jwt.verify(token, JWT_SECRET)
```

Sin `algorithms: ['HS256']` en `verify`, la librería `jsonwebtoken` acepta cualquier algoritmo declarado en el header del token. Un atacante podría enviar un token con `"alg": "none"` en implementaciones vulnerables (aunque `jsonwebtoken` >= 9.0 rechaza `"none"` por defecto, la práctica correcta es ser explícito).

**Fix:**
```ts
jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' })
jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
```

---

### 8. `JWT_SECRET` sin validación de longitud mínima

**Severidad**: media  
**Ubicación**: `src/controllers/auth.ts:10-14`

```ts
const JWT_SECRET = process.env.JWT_SECRET
if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set...')
}
```

Solo verifica que `JWT_SECRET` exista, no que sea suficientemente larga. Un secret de 6 caracteres pasa esta validación. Para HS256, NIST recomienda al menos 256 bits (32 caracteres).

**Fix:**
```ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
}
```

---

### 9. Contraseña de admin sin límite máximo — DoS via bcrypt

**Severidad**: media  
**Ubicación**: `src/schemas/adminSchema.ts:5`

```ts
password: z.string().min(6, "Password must be at least 6 characters long")
// ❌ sin .max()
```

`bcrypt` procesa solo los primeros 72 bytes de la contraseña, pero `bcrypt.hash()` en Node.js tiene que leer el string completo. Un atacante puede enviar una contraseña de 10MB y forzar trabajo computacional en el servidor antes de que bcrypt la trunce.

**Fix:**
```ts
password: z.string().min(8).max(72, "Password cannot exceed 72 characters")
```

---

### 10. `dotenv.config()` duplicado en `auth.ts`

**Severidad**: baja  
**Ubicación**: `src/controllers/auth.ts:8`

```ts
import dotenv from 'dotenv'
dotenv.config()  // segunda llamada — ya fue llamado en app.ts
```

`dotenv.config()` llamado dos veces no es un riesgo directo, pero indica que `JWT_SECRET` podría ser leído antes de que el `.env` correcto esté cargado si el orden de imports cambia. En ESM (`"type": "module"`), los imports se hoistan — `dotenv.config()` en `app.ts` puede ejecutarse después del `JWT_SECRET = process.env.JWT_SECRET` en `auth.ts` dependiendo del bundler/runtime.

**Fix**: eliminar el `dotenv.config()` de `auth.ts`. El env debe cargarse una única vez en el entrypoint (`app.ts`).

---

### 11. Validación de tipo MIME en uploads es bypasseable

**Severidad**: media  
**Ubicación**: `src/middleware/uploadMiddleware.ts:12-17`

```ts
fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    }
}
```

`file.mimetype` viene del header `Content-Type` del request — es controlado por el cliente. Un atacante puede subir un ejecutable con `Content-Type: image/jpeg` y pasará el filtro. Cloudinary valida el contenido en su extremo, pero el archivo malicioso llega a la memoria del servidor antes de ser rechazado.

**Fix**: validar magic bytes del buffer antes de subir:
```ts
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

fileFilter: async (req, file, cb) => {
    // El buffer llega en chunks — validar después de recibir completo
    // O usar multer.diskStorage con validación post-upload
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only images allowed'));
    }
    cb(null, true);
}
```

Para validación completa de magic bytes, necesitás acceso al buffer completo — esto requiere procesar el archivo en un middleware posterior.

---

### 12. OAuth tokens guardados en DB sin cifrado

**Severidad**: media  
**Ubicación**: `src/models/googleMyBusiness.ts:18-49`

`access_token` y `refresh_token` de Google se almacenan en texto plano en la tabla `google_oauth_tokens`. Si hay una inyección SQL u otro vector de acceso a la DB, los tokens quedan expuestos y permiten acceso completo a la cuenta de Google My Business.

**Recomendación**: cifrar `refresh_token` en reposo con `AES-256-GCM` usando una clave derivada del env:
```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
// cifrar antes de INSERT, descifrar después de SELECT
```

El `access_token` expira en ~1h, el `refresh_token` no expira — este último es el crítico.

---

### 13. Error message leakage en controllers de admin y apartment

**Severidad**: baja  
**Ubicación**: `src/controllers/admin.ts:11`, `src/controllers/apartment.ts:55`

```ts
res.status(500).json({ error: error.message })  // expone detalles internos
```

Mensajes de error de PostgreSQL (nombres de tablas, columnas, constraints) quedan expuestos en respuestas 500 de producción.

**Fix**: loguear internamente, responder con mensaje genérico:
```ts
console.error('Error in getAllAdmins:', error);
res.status(500).json({ error: 'Internal server error' });
```

---

### Qué está bien

- **bcrypt con 10 rounds** en `AdminModel` para passwords ✓
- **Queries parametrizadas** en todos los models — sin SQL injection (excepto `cleanupOldReviews` documentado en 003) ✓
- **`.env` en `.gitignore`** — credenciales no comprometidas en repo ✓
- **JWT expiry `1h`** — token de vida corta ✓
- **Respuesta de login** omite el hash de contraseña: `{ id, username }` ✓
- **SSL condicional** en pool de DB según `NODE_ENV` ✓
- **OAuth credentials** desde env vars, no hardcodeadas ✓
- **Zod en todos los endpoints** de escritura — input validation presente ✓

---

## Plan de acción priorizado

| # | Acción | Esfuerzo | Impacto | Status |
|---|--------|----------|---------|--------|
| 1 | Fix `AdminModel.createAdmin` — no devolver password plano | bajo | crítico | pendiente |
| 2 | Fix `SELECT *` en `getAll/getAdminById` — excluir password column | bajo | crítico | pendiente |
| 3 | Agregar `authMiddleware` a todas las rutas de `/api/admins` | bajo | crítico | pendiente |
| 4 | Agregar `state` parameter en OAuth flow (anti-CSRF) | medio | crítico | pendiente |
| 5 | Fix CORS — validar que `ALLOWED_ORIGINS` esté definido | bajo | alto | pendiente |
| 6 | Instalar y configurar `helmet` | bajo | alto | pendiente |
| 7 | Rate limiting en `/api/auth/login` | bajo | alto | pendiente |
| 8 | Especificar `algorithm: 'HS256'` en sign y verify de JWT | bajo | medio | pendiente |
| 9 | Validar longitud mínima de `JWT_SECRET` (≥32 chars) | bajo | medio | pendiente |
| 10 | Agregar `.max(72)` al schema de password de admin | bajo | medio | pendiente |
| 11 | Eliminar `dotenv.config()` duplicado en `auth.ts` | bajo | bajo | pendiente |
| 12 | Cifrar `refresh_token` en DB con AES-256-GCM | alto | medio | pendiente |
| 13 | Reemplazar `error.message` en respuestas 500 con mensajes genéricos | bajo | medio | pendiente |

## Notas

- **`/docs` está en `.gitignore`** — estos análisis no se commitean al repo. Si querés versionarlos, remover `/docs` del `.gitignore`.
- El scope `'https://www.googleapis.com/auth/business.manage'` es amplio. Validar si `userinfo.profile` y `userinfo.email` son necesarios o pueden removerse (principio de mínimo privilegio).
- No hay logging estructurado ni audit trail de acciones de admin. En un sistema con PII de clientes (emails, teléfonos, direcciones), considerar logs de acceso por acción.
