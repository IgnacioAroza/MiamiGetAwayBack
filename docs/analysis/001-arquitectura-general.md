# 001 — Análisis de Arquitectura General

**Fecha:** 2026-05-14  
**Agente:** backend-developer  
**Scope:** src/ completo — controllers, services, models, routes, schemas, types, utils, middleware

---

## 1. Qué está bien resuelto

### Separación de capas clara
La división `routes → controllers → services → models` es coherente en todos los dominios (apartments, cars, villas, yachts, reservations, payments, reviews, GMB). Cada capa tiene responsabilidad definida y no hay cortocircuitos directos entre routes y models.

### Centralización de imágenes (`ImageService`)
`src/services/imageService.ts` es el punto único para upload, delete y optimización de imágenes en Cloudinary. Todos los controllers de entidades (`apartment`, `car`, `villa`, `yacht`) lo usan de la misma forma. El servicio soporta transformaciones responsivas por contexto (`list`, `detail`, `gallery`) — decisión de diseño correcta que evita duplicación.

### Lazy pool de base de datos
`src/utils/db_render.ts` implementa un pool que se inicializa solo cuando se necesita la primera query. Esto es correcto para entornos serverless/Render donde el cold start importa. SSL condicional según `NODE_ENV` también está bien.

### Validación con Zod en la frontera correcta
Los schemas Zod (`src/schemas/`) se usan en controllers para validar input externo antes de que toque la lógica de negocio. El patrón `validateX` / `validatePartialX` es consistente en todos los dominios.

### CORS con allowlist configurable
`app.ts` usa `ALLOWED_ORIGINS` del env para configurar CORS dinámicamente. Correcto para ambientes múltiples (dev/staging/prod).

### Error handling de SQL diferenciado en delete
`ReservationController.deleteReservation` captura específicamente `error.code === '23503'` (FK violation) y devuelve 409 en vez de 500. Buen manejo de errores de integridad referencial.

### Google My Business con OAuth2 completo
El módulo GMB (`controllers/googleMyBusiness.ts`, `services/googleMyBusinessService.ts`, `models/googleMyBusiness.ts`) implementa el flujo OAuth2 completo con almacenamiento de tokens en DB, refresh automático y sincronización local. Es el módulo más complejo y está bien encapsulado.

### Migraciones versionadas
Los 11 scripts SQL en `migrations/scripts/` están numerados secuencialmente y son idempotentes (`CREATE TABLE IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`). Los triggers `update_updated_at_column` están definidos desde el inicio.

---

## 2. Deuda técnica detectada

### 🔴 CRÍTICA — Lógica de negocio financiera en el controller

**Archivo:** `src/controllers/reservation.ts:209-430` (`updateReservation`)  
El cálculo de `totalAmount`, `amountDue`, `paymentStatus` y la conversión camelCase→snake_case viven completamente en el controller. Son ~220 líneas de lógica de negocio mezclada con manejo HTTP. Esto viola la separación de capas y hace el código intestable directamente.

El `ReservationService` para `updateReservation` solo acepta `status` como string — no delega el cálculo completo. El controller llama directamente a `ReservationModel.updateReservation` con datos ya procesados, saltándose el service layer.

### 🔴 CRÍTICA — Doble validación en Model y Controller

**Archivo:** `src/models/reservation.ts:204-210` y `src/controllers/reservation.ts:136-143`  
`createReservation` valida con Zod tanto en el controller (correcto) como dentro del model (incorrecto). El model no debería validar — eso genera doble parseo y puede producir errores crípticos si los tipos difieren entre capas.

Lo mismo ocurre en `ReservationPaymentModel.createReservationPayment` (línea 132).

### 🔴 CRÍTICA — Fechas como strings sin tipo nativo

Las fechas de reservación se almacenan y transmiten como strings con formato `MM-DD-YYYY HH:mm`. PostgreSQL las recibe como texto y realiza comparaciones con `to_date()` y CASE para detectar el formato. Esto genera queries complejos y frágiles:

```sql
-- models/reservation.ts:92-108
CASE 
    WHEN r.check_in_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN ...
    ELSE to_date(substr(r.check_in_date, 1, 10), 'MM-DD-YYYY') >= ...
END
```

Hay datos con dos formatos distintos en producción (ISO y MM-DD-YYYY), lo que obligó a este CASE defensivo.

### 🟡 ALTA — `updatePaymentStatus` acepta snake_case y camelCase

**Archivo:** `src/controllers/reservation.ts:576-588`  
El método acepta `amount_paid` / `amountPaid` y `amount_due` / `amountDue` para compatibilidad. Esto indica inconsistencia en los clientes que consumen la API — el contrato no está definido claramente.

### 🟡 ALTA — `ReservationService.updateReservation` es un wrapper inútil

**Archivo:** `src/services/reservationService.ts:23-39`  
El service solo acepta `status` como parámetro. Para cualquier otra actualización (precios, pagos), el controller bypasea el service y llama directamente al model. El service layer para reservations está incompleto.

### 🟡 ALTA — `console.log` de debug en producción

**Archivo:** `src/services/reservationService.ts:24`  
```ts
console.log('Updating reservation with ID:', id, 'and status:', status);
```
Este log no está condicional a `NODE_ENV`. Hay varios `console.error` dispersos sin estructura (sin correlation ID, sin nivel de severidad consistente).

### 🟡 ALTA — `any` tipado en lugares críticos

- `src/models/reservation.ts:34` — `queryParams: any[]`
- `src/services/reservationService.ts:77` — `updateReservation(id, { amount_paid, amount_due, payment_status } as any)`
- `src/controllers/reservation.ts:149` — `createReservation(reservationData as any)`

El cast `as any` en `updatePaymentFields` pasa snake_case al método `updateReservation` que espera camelCase, generando un bug silencioso donde las columnas SQL se generan incorrectamente.

### 🟡 ALTA — `status` comentado en `reservation_payments`

**Archivo:** `src/models/reservationPayment.ts:62-66`  
```ts
// Filtro por estado - comentado temporalmente porque la columna no existe
```
Código comentado que referencia una columna faltante en el schema. Indica deuda de migración pendiente.

### 🟠 MEDIA — `updateApartment` pierde el error original

**Archivo:** `src/models/apartment.ts:155-157`  
```ts
} catch (error) {
    throw new Error('Error updating apartment')  // error original perdido
}
```
La causa raíz del error SQL se descarta. Mismo patrón en `deleteApartment`.

### 🟠 MEDIA — Sin paginación en listados

Ningún endpoint de listado (`GET /api/reservations`, `GET /api/apartments`, etc.) implementa paginación. Con volumen de datos creciente, estas queries pueden volverse lentas y las respuestas demasiado grandes.

### 🟠 MEDIA — `GoogleMyBusinessService` instanciada por request

**Archivo:** `src/controllers/googleMyBusiness.ts` — cada método hace `new GoogleMyBusinessService()`.  
Si el servicio mantiene estado de OAuth (tokens en memoria), cada instancia empieza desde cero. Debería ser un singleton o inicializarse una vez por proceso.

### 🟠 MEDIA — Sin rate limiting

`app.ts` no tiene `express-rate-limit`. Los endpoints de auth (`/api/auth/login`) y notificaciones (`/:id/send-notification`) son vulnerables a abuso sin throttling.

### 🟠 MEDIA — Error global no loguea el error

**Archivo:** `src/app.ts:77-82`  
```ts
app.use((err: Error, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' })
    // el error nunca se loguea
})
```
Los errores no capturados no dejan rastro en ningún log.

### 🟢 BAJA — `sharp` en dependencies no se usa

`package.json` incluye `sharp` como dependencia de producción pero no aparece importado en ningún archivo de `src/`. Agrega ~30MB al bundle innecesariamente.

### 🟢 BAJA — `cron.ts` controller y route registrados pero cron desactivado

`app.ts:93` tiene el cron comentado, pero la route `/api/cron` sigue registrada y activa. Es dead code funcional.

---

## 3. Refactors priorizados — Impacto vs Esfuerzo

| # | Refactor | Impacto | Esfuerzo | Prioridad |
|---|----------|---------|----------|-----------|
| 1 | Mover lógica de cálculo financiero del controller al service (`ReservationService`) | 🔴 Alto | ~4h | **P0** |
| 2 | Estandarizar formato de fechas: migrar a `TIMESTAMPTZ` nativo en DB + ISO 8601 en API | 🔴 Alto | ~1 día | **P0** |
| 3 | Eliminar doble validación Zod en models — validar solo en controllers | 🟡 Alto | ~2h | **P1** |
| 4 | Agregar paginación a endpoints de listado (`limit`/`offset`) | 🟡 Alto | ~3h | **P1** |
| 5 | Rate limiting en auth y notificaciones (`express-rate-limit`) | 🟡 Alto | ~1h | **P1** |
| 6 | Logger estructurado (reemplazar `console.log/error` por niveles + condicional a NODE_ENV) | 🟡 Medio | ~2h | **P2** |
| 7 | Singleton para `GoogleMyBusinessService` | 🟠 Medio | ~1h | **P2** |
| 8 | Preservar error original en catch de models | 🟠 Medio | ~30min | **P2** |
| 9 | Error handler global con logging | 🟠 Medio | ~30min | **P2** |
| 10 | Remover `sharp` de dependencies | 🟢 Bajo | ~5min | **P3** |
| 11 | Limpiar dead code de cron | 🟢 Bajo | ~15min | **P3** |

---

### Refactor P0 detallado: Lógica financiera al service

El controller `updateReservation` debería quedar así:

```ts
// controller
const updateData = validatePartialReservation(req.body)
const updatedReservation = await ReservationService.updateReservation(id, updateData)
res.status(200).json(updatedReservation)

// service — aquí va el cálculo de totalAmount, amountDue, paymentStatus, y la conversión snake_case
```

Esto hace la lógica testeable con Vitest sin necesidad de HTTP.

### Refactor P0 detallado: Fechas nativas

Migración SQL:
```sql
ALTER TABLE reservations 
  ALTER COLUMN check_in_date TYPE TIMESTAMPTZ USING check_in_date::TIMESTAMPTZ,
  ALTER COLUMN check_out_date TYPE TIMESTAMPTZ USING check_out_date::TIMESTAMPTZ;
```

Los CASE defensivos en los queries de filtro desaparecen. La API acepta y devuelve ISO 8601.
