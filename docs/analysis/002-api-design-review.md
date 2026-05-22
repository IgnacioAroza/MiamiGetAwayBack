# API Design Review — Endpoints REST

- **Fecha**: 2026-05-14
- **Agent**: api-designer
- **Scope**: `src/routes/` — 13 archivos, ~55 endpoints

---

## Resumen ejecutivo

La API tiene una estructura de recursos coherente para los dominios principales (propiedades, reservaciones, pagos). Los problemas más graves son: **rutas de admins completamente sin autenticación**, DELETE de reviews públicamente accesible, verbos en URLs (anti-REST), y la ausencia total de versionado y paginación. El módulo Google My Business mezcla endpoints seguros con otros que deberían estar protegidos. Hay duplicación de rutas para pagos que crea ambigüedad en el contrato.

---

## Inventario completo de endpoints

| Método | Ruta | Auth | Observación |
|--------|------|------|-------------|
| GET | `/api/apartments` | ❌ | público OK |
| POST | `/api/apartments` | ✅ | multipart |
| GET | `/api/apartments/:id` | ❌ | público OK |
| PUT | `/api/apartments/:id` | ✅ | multipart |
| DELETE | `/api/apartments/:id` | ✅ | |
| GET | `/api/cars` | ❌ | público OK |
| POST | `/api/cars` | ✅ | |
| GET | `/api/cars/:id` | ❌ | público OK |
| PUT | `/api/cars/:id` | ✅ | |
| DELETE | `/api/cars/:id` | ✅ | |
| GET | `/api/villas` | ❌ | público OK |
| POST | `/api/villas` | ✅ | |
| GET | `/api/villas/:id` | ❌ | público OK |
| PUT | `/api/villas/:id` | ✅ | |
| DELETE | `/api/villas/:id` | ✅ | |
| GET | `/api/yachts` | ❌ | público OK |
| POST | `/api/yachts` | ✅ | |
| GET | `/api/yachts/:id` | ❌ | público OK |
| PUT | `/api/yachts/:id` | ✅ | |
| DELETE | `/api/yachts/:id` | ✅ | |
| GET | `/api/admins` | ❌ | 🔴 SIN AUTH |
| POST | `/api/admins` | ❌ | 🔴 SIN AUTH |
| GET | `/api/admins/:id` | ❌ | 🔴 SIN AUTH |
| PUT | `/api/admins/:id` | ❌ | 🔴 SIN AUTH |
| DELETE | `/api/admins/:id` | ❌ | 🔴 SIN AUTH |
| GET | `/api/users` | ❌ | 🟡 datos sensibles |
| GET | `/api/users/:id` | ❌ | 🟡 datos sensibles |
| POST | `/api/users` | ❌ | registro público OK |
| PUT | `/api/users/:id` | ✅ | |
| DELETE | `/api/users/:id` | ✅ | |
| POST | `/api/auth/login` | ❌ | público OK |
| GET | `/api/reviews` | ❌ | público OK |
| POST | `/api/reviews` | ❌ | 🟡 sin auth |
| DELETE | `/api/reviews/:id` | ❌ | 🔴 sin auth |
| GET | `/api/reservations` | ✅ | sin paginación |
| GET | `/api/reservations/:id` | ✅ | |
| POST | `/api/reservations` | ✅ | |
| PUT | `/api/reservations/:id` | ✅ | duplica PATCH |
| PATCH | `/api/reservations/:id` | ✅ | mismo handler que PUT |
| DELETE | `/api/reservations/:id` | ✅ | |
| POST | `/api/reservations/:id/payments` | ✅ | |
| GET | `/api/reservations/:id/payments` | ✅ | duplica ruta plana |
| POST | `/api/reservations/:id/pdf` | ✅ | verbo en URL |
| GET | `/api/reservations/:id/pdf/download` | ✅ | verbo en URL |
| PATCH | `/api/reservations/:id/payment-status` | ✅ | |
| POST | `/api/reservations/:id/send-notification` | ✅ | verbo en URL |
| GET | `/api/reservation-payments` | ✅ | sin paginación |
| GET | `/api/reservation-payments/:id` | ✅ | |
| POST | `/api/reservation-payments` | ✅ | duplica ruta anidada |
| PUT | `/api/reservation-payments/:id` | ✅ | |
| DELETE | `/api/reservation-payments/:id` | ✅ | |
| GET | `/api/summaries/sales-volume` | ✅ | verbo como recurso |
| POST | `/api/summaries/generate` | ✅ | 🟡 verbo en URL |
| GET | `/api/summaries/:year/:month` | ✅ | |
| GET | `/api/summaries/:year/:month/pdf` | ✅ | verbo en URL |
| POST | `/api/summaries/:year/:month/send` | ✅ | verbo en URL |
| POST | `/api/cron/update-reservation-statuses` | ✅ | verbo en URL |
| GET | `/api/google-mybusiness/auth-status` | ❌ | |
| GET | `/api/google-mybusiness/auth/start` | ❌ | verbo en URL |
| GET | `/api/google-mybusiness/callback` | ❌ | OAuth callback OK |
| GET | `/api/google-mybusiness/reviews/fetch` | ❌ | 🔴 verbo en URL |
| POST | `/api/google-mybusiness/reviews/sync` | ❌ | 🟡 sin auth |
| GET | `/api/google-mybusiness/reviews` | ❌ | público OK |
| GET | `/api/google-mybusiness/reviews/stats` | ❌ | |
| GET | `/api/google-mybusiness/reviews/search` | ❌ | |
| GET | `/api/google-mybusiness/admin/tokens` | ✅ | |
| GET | `/api/google-mybusiness/admin/sync-info` | ✅ | |
| POST | `/api/google-mybusiness/admin/initialize` | ✅ | verbo en URL |
| GET | `/api/google-mybusiness/health` | ❌ | |

---

## Hallazgos detallados

### 1. Rutas de admins sin ninguna autenticación

**Severidad**: crítica  
**Ubicación**: `src/routes/admin.ts`  
**Descripción**: Los 5 endpoints de `/api/admins` — incluyendo `POST /api/admins` (crear admin) y `DELETE /api/admins/:id` — no tienen `authMiddleware`. Cualquier cliente no autenticado puede crear, listar, modificar o eliminar cuentas de administrador.  
**Recomendación**: Agregar `authMiddleware` a todas las rutas. Considerar además un segundo middleware de rol (`requireSuperAdmin`) para `POST` y `DELETE`.

```ts
// admin.ts — corrección mínima
router.get('/', authMiddleware, AdminController.getAllAdmins)
router.post('/', authMiddleware, AdminController.createAdmin)
router.get('/:id', authMiddleware, AdminController.getAdminById)
router.put('/:id', authMiddleware, AdminController.updateAdmin)
router.delete('/:id', authMiddleware, AdminController.deleteAdmin)
```

---

### 2. DELETE de reviews sin autenticación

**Severidad**: alta  
**Ubicación**: `src/routes/review.ts:8`  
**Descripción**: `DELETE /api/reviews/:id` no requiere auth. Cualquier usuario puede borrar cualquier review. `POST /api/reviews` tampoco requiere auth, lo cual puede ser intencional (reviews públicas) pero debería ser explícito.  
**Recomendación**: Proteger DELETE con `authMiddleware`. Evaluar si POST debe requerir auth o permanecer público.

---

### 3. Verbos en URLs — violación REST

**Severidad**: media  
**Ubicación**: múltiples routes  
**Descripción**: REST usa sustantivos para recursos y métodos HTTP para acciones. Endpoints con verbos:

| URL actual (incorrecta) | URL REST correcta |
|-------------------------|-------------------|
| `GET /reviews/fetch` | `GET /reviews?source=google` |
| `POST /reviews/sync` | `POST /reviews/sync-jobs` o `PUT /reviews` |
| `POST /summaries/generate` | `POST /summaries` (el POST ya implica creación) |
| `GET /summaries/:y/:m/pdf` | `GET /summaries/:y/:m` con `Accept: application/pdf` |
| `POST /summaries/:y/:m/send` | `POST /summaries/:y/:m/notifications` |
| `POST /reservations/:id/pdf` | `POST /reservations/:id/notifications` |
| `GET /reservations/:id/pdf/download` | `GET /reservations/:id/documents/pdf` |
| `POST /reservations/:id/send-notification` | `POST /reservations/:id/notifications` |
| `POST /cron/update-reservation-statuses` | `POST /reservation-status-updates` o `POST /jobs/status-sync` |
| `GET /auth/start` | `GET /auth` con redirect |
| `POST /admin/initialize` | `POST /auth/tokens` |

---

### 4. PUT y PATCH apuntan al mismo handler

**Severidad**: media  
**Ubicación**: `src/routes/reservation.ts:11-12`  
**Descripción**: `PUT /:id` y `PATCH /:id` ejecutan exactamente el mismo método `updateReservation`. REST define semánticas distintas: PUT reemplaza el recurso completo (requiere todos los campos), PATCH actualiza campos parciales. Al tener el mismo handler, PUT no garantiza el reemplazo completo — ambos hacen updates parciales.  
**Recomendación**: Eliminar `PUT /:id` y dejar solo `PATCH /:id`. O implementar handlers distintos con validación `validateReservation` (completo) para PUT y `validatePartialReservation` para PATCH.

---

### 5. Sin versionado de API

**Severidad**: media  
**Ubicación**: `src/app.ts` — todas las rutas  
**Descripción**: Todos los endpoints están bajo `/api/` sin versión. Cualquier cambio breaking (renombrar campo, cambiar tipo) rompe todos los clientes. No hay mecanismo para deprecar endpoints gradualmente.  
**Recomendación**: Prefijo `/api/v1/` desde ahora. No requiere refactorizar nada internamente — solo cambiar los `app.use()` en `app.ts`:

```ts
// app.ts
app.use('/api/v1/apartments', apartmentRoutes)
app.use('/api/v1/reservations', reservationRoutes)
// ...
```

Costo: ~5 minutos. El frontend debe actualizar las URLs base, pero es un cambio único.

---

### 6. Paginación ausente en todos los listados

**Severidad**: media  
**Ubicación**: `GET /api/reservations`, `GET /api/apartments`, `GET /api/cars`, `GET /api/villas`, `GET /api/yachts`, `GET /api/reservation-payments`  
**Descripción**: Ningún endpoint de colección implementa paginación. A medida que crecen los datos, las respuestas serán más grandes y las queries más lentas sin límite. Solo `GET /api/google-mybusiness/reviews` tiene `limit`/`offset` correctamente.  
**Recomendación**: Patrón estándar `?page=1&limit=20` o `?limit=20&offset=0`. Respuesta con envelope:

```json
{
  "data": [...],
  "pagination": { "total": 150, "page": 1, "limit": 20, "pages": 8 }
}
```

---

### 7. Status codes incorrectos en DELETE

**Severidad**: baja  
**Ubicación**: todos los controllers con `deleteX`  
**Descripción**: Los DELETE devuelven `200` con un body `{ message: "... deleted successfully" }`. REST indica que un DELETE exitoso que no devuelve contenido debe usar `204 No Content`.  

```ts
// incorrecto — actual
res.status(200).json({ message: 'Reservation deleted successfully' })

// correcto
res.status(204).send()
```

**Excepción**: Si el frontend necesita el objeto eliminado para actualizar UI, `200` con el objeto eliminado en body también es válido. `200` con solo un mensaje string no lo es.

---

### 8. Duplicación de rutas para pagos

**Severidad**: baja  
**Ubicación**: `src/routes/reservation.ts` vs `src/routes/reservationPayments.ts`  
**Descripción**: Los pagos de una reserva son accesibles por dos rutas:
- `GET /api/reservations/:id/payments` (ruta anidada, semánticamente correcta)
- `GET /api/reservation-payments?reservationId=X` (ruta plana con filtro)
- `POST /api/reservations/:id/payments` Y `POST /api/reservation-payments`

Dos contratos para el mismo recurso genera confusión en el cliente sobre cuál usar.  
**Recomendación**: Mantener la ruta anidada `POST /api/reservations/:id/payments` para crear (contexto claro). La ruta plana `GET /api/reservation-payments` tiene sentido solo para listados globales con filtros. Documentar cuándo usar cada una.

---

### 9. GET /api/users sin autenticación

**Severidad**: baja  
**Ubicación**: `src/routes/user.ts:6-7`  
**Descripción**: `GET /api/users` y `GET /api/users/:id` son públicos. Si "users" son clientes con email, teléfono y dirección, esto expone PII sin control.  
**Recomendación**: Verificar si estos endpoints los consume algún cliente no autenticado. Si no, agregar `authMiddleware`.

---

### 10. Ruta estática compite con parámetro dinámico en summaries

**Severidad**: baja  
**Ubicación**: `src/routes/monthlySummary.ts:9`  
**Descripción**: `GET /api/summaries/sales-volume` es una ruta estática registrada antes de `GET /api/summaries/:year/:month`. Express las resuelve en orden de registro, por lo que `sales-volume` no colisiona actualmente. Sin embargo, si se agrega otra ruta estática después de `/:year/:month`, sí colisionaría. El diseño es frágil.  
**Recomendación**: Mover los reportes a sub-path diferenciado: `GET /api/summaries/reports/sales-volume`.

---

## Plan de acción priorizado

| # | Acción | Esfuerzo | Impacto | Status |
|---|--------|----------|---------|--------|
| 1 | Agregar `authMiddleware` a todas las rutas de `/api/admins` | bajo | crítico | pendiente |
| 2 | Agregar `authMiddleware` a `DELETE /api/reviews/:id` | bajo | alto | pendiente |
| 3 | Agregar prefijo `/api/v1/` en `app.ts` | bajo | alto | pendiente |
| 4 | Implementar paginación en los 6 endpoints de listado | medio | alto | pendiente |
| 5 | Cambiar DELETE de `200+mensaje` a `204` en todos los controllers | bajo | medio | pendiente |
| 6 | Eliminar `PUT /api/reservations/:id` y dejar solo PATCH | bajo | medio | pendiente |
| 7 | Renombrar rutas con verbos a sustantivos (GMB, summaries, cron) | medio | medio | pendiente |
| 8 | Proteger `GET /api/users` y `GET /api/users/:id` con auth | bajo | medio | pendiente |
| 9 | Documentar cuándo usar ruta anidada vs plana para pagos | bajo | bajo | pendiente |
| 10 | Mover `sales-volume` a `/reports/sales-volume` | bajo | bajo | pendiente |

---

## Notas

- El módulo GMB tiene la arquitectura de rutas más compleja y la más inconsistente en auth. Los endpoints de reviews no deberían sincronizar con Google (`POST /reviews/sync`) sin estar autenticados.
- `POST /api/reservations/:id/pdf` devuelve una confirmación pero no el PDF. `GET /api/reservations/:id/pdf/download` devuelve el buffer binario. Semánticamente, ambos deberían unificarse: `GET /api/reservations/:id/pdf` con `Content-Type: application/pdf`.
- No hay ningún endpoint `HEAD` ni `OPTIONS` implementado explícitamente — depende del comportamiento default de Express + CORS.
