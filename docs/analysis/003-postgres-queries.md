# PostgreSQL — Análisis de Queries y Performance

- **Fecha**: 2026-05-14
- **Agent**: postgres-pro + database-optimizer
- **Scope**: `src/models/` — 9 archivos, todas las queries SQL

---

## Resumen ejecutivo

Los modelos usan `pg` con queries parametrizadas (sin SQL injection). Los índices de base del migration `000` son correctos pero incompletos: **faltan los FK indexes más críticos** — `reservations.client_id` y `reservation_payments.reservation_id` — que se usan en cada JOIN de las queries de listado y en cada operación de pago. Se identificaron 4 patrones N+1 que generan entre 3 y 5 queries donde debería haber 1 transacción. La deuda más grave: las fechas como strings fuerzan `CASE` con `to_date()` en WHERE, invalidando el índice `idx_reservations_dates` en las queries de resúmenes mensuales. Una inyección SQL real existe en `cleanupOldReviews`.

---

## Índices existentes (baseline)

De `migrations/scripts/000_create_tables.sql` y `010_create_google_reviews.sql`:

```sql
-- Creados en 000
idx_reservations_dates       ON reservations(check_in_date, check_out_date)
idx_payments_date            ON reservation_payments(payment_date)
idx_monthly_summaries_month_year ON monthly_summaries(year, month)

-- Creados en 010
idx_google_reviews_location_id   ON google_reviews(google_location_id)
idx_google_reviews_account_id    ON google_reviews(google_account_id)
idx_google_reviews_rating        ON google_reviews(rating)
idx_google_reviews_create_time   ON google_reviews(google_create_time)
idx_google_reviews_sync_status   ON google_reviews(sync_status)
idx_google_reviews_local_created ON google_reviews(local_created_at)
idx_google_reviews_location_status ON google_reviews(google_location_id, sync_status)
```

---

## Hallazgos detallados

### 1. FK indexes faltantes en `reservations` y `reservation_payments`

**Severidad**: alta  
**Ubicación**: `src/models/reservation.ts`, `src/models/reservationPayment.ts`

`reservations.client_id` y `reservations.apartment_id` no tienen índice. Ambas columnas se usan como JOIN en **cada query** de listado de reservaciones — la más ejecutada del sistema:

```sql
-- models/reservation.ts:18-33 — sin índice en client_id ni apartment_id
FROM reservations r
LEFT JOIN clients c ON r.client_id = c.id        -- seq scan en clients por FK
LEFT JOIN apartments a ON r.apartment_id = a.id   -- seq scan en apartments por FK
```

`reservation_payments.reservation_id` tampoco tiene índice. Se ejecuta en:
- `getPaymentsByReservation` — llamado en download de PDF, envío de notificaciones, delete de reserva
- `getAllReservationPayments` — con JOIN a `reservations`

PostgreSQL crea índices automáticamente solo en `PRIMARY KEY` y `UNIQUE`. Los FK necesitan índice explícito.

**Impacto estimado**: con <100 clientes/apartamentos el seq scan es rápido, pero con >1000 reservaciones el JOIN sin índice en `client_id` degrada linealmente.

---

### 2. Índice `idx_reservations_dates` inutilizado por CASE con `to_date()`

**Severidad**: alta  
**Ubicación**: `src/models/monthlySummary.ts:208-219`, `src/models/reservation.ts:88-134`

El índice `idx_reservations_dates ON reservations(check_in_date, check_out_date)` existe, pero estas queries lo invalidan:

```sql
-- monthlySummary.ts:208 — full table scan garantizado
WHERE (
    CASE 
        WHEN r.check_in_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN 
            EXTRACT(MONTH FROM r.check_in_date::date) = $1
        ELSE 
            EXTRACT(MONTH FROM to_date(substr(r.check_in_date, 1, 10), 'MM-DD-YYYY')) = $1
    END
)
```

Aplicar una función (`EXTRACT`, `to_date`, `substr`) sobre una columna en WHERE hace la condición **non-SARGable** — el planner no puede usar el índice B-tree y hace sequential scan en toda la tabla.

Lo mismo ocurre con el filtro `upcoming` en `reservation.ts:88-134` que usa `CASE WHEN ... to_date(substr(...))`.

La causa raíz es la existencia de dos formatos de fecha en la misma columna (`YYYY-MM-DD` e `MM-DD-YYYY`). La solución definitiva requiere migrar la columna a `TIMESTAMPTZ` (ver sección de migraciones).

---

### 3. N+1: creación de reserva con pago inicial — 3 queries sin transacción

**Severidad**: alta  
**Ubicación**: `src/controllers/reservation.ts:148-199`

```ts
// Query 1 — INSERT reservations
const newReservation = await ReservationService.createReservation(reservationData)

// Query 2 — INSERT reservation_payments
const createdPayment = await ReservationPaymentsService.createPayment({ ... })

// Query 3 — SELECT reservations JOIN clients JOIN apartments
const updatedReservation = await ReservationService.getReservationById(Number(newReservation.id))
```

Si la Query 2 falla, la reserva queda creada sin pago (estado inconsistente). Las 3 operaciones deberían ejecutarse en una transacción `BEGIN/COMMIT`.

---

### 4. N+1: `recalculateReservationPayments` — 3 queries por cada pago

**Severidad**: alta  
**Ubicación**: `src/services/reservationPaymentsService.ts:7-31`

Llamado en cada `createPayment`, `updatePayment` y `deletePayment`:

```ts
// Query 1 — SELECT reservation_payments WHERE reservation_id = ?
const payments = await ReservationPaymentModel.getPaymentsByReservation(reservationId)

// Query 2 — SELECT reservations JOIN clients JOIN apartments WHERE id = ?
const reservation = await ReservationModel.getReservationById(reservationId)

// Query 3 — UPDATE reservations SET amount_paid, amount_due, payment_status
await ReservationModel.updateReservation(reservationId, { ... })
```

Las 3 queries pueden reemplazarse con 1 query que usa `SUM()` y actualiza en un solo paso:

```sql
UPDATE reservations r
SET 
    amount_paid = (
        SELECT COALESCE(SUM(amount), 0) FROM reservation_payments WHERE reservation_id = r.id
    ),
    amount_due  = GREATEST(0, r.total_amount - (
        SELECT COALESCE(SUM(amount), 0) FROM reservation_payments WHERE reservation_id = r.id
    )),
    payment_status = CASE
        WHEN (SELECT COALESCE(SUM(amount), 0) FROM reservation_payments WHERE reservation_id = r.id) <= 0 THEN 'pending'
        WHEN r.total_amount <= (SELECT COALESCE(SUM(amount), 0) FROM reservation_payments WHERE reservation_id = r.id) THEN 'complete'
        ELSE 'partial'
    END
WHERE r.id = $1
RETURNING *
```

O mejor aún, como trigger en `reservation_payments` (ver sección de migraciones).

---

### 5. N+1: UPDATE + SELECT separados en 4 models

**Severidad**: media  
**Ubicación**: `src/models/apartment.ts:132-135`, `src/models/user.ts:131-134`, `src/models/review.ts:93-96`, `src/models/reservationPayment.ts:165-198`

Patrón repetido en 4 models:

```ts
// Query 1 — UPDATE
await db.query(`UPDATE table SET ... WHERE id = $n`, values)

// Query 2 — SELECT redundante (el UPDATE ya tiene los datos)
const { rows } = await db.query('SELECT * FROM table WHERE id = $1', [id])
```

Todos deberían usar `RETURNING *` en el UPDATE:

```sql
UPDATE apartments SET name=$1, ... WHERE id=$n RETURNING *
```

Reduce a la mitad las queries de escritura.

---

### 6. N+1: `deletePayment` — fetch antes de delete innecesario

**Severidad**: media  
**Ubicación**: `src/services/reservationPaymentsService.ts:95-101`

```ts
// Query 1 — SELECT para obtener reservationId antes de borrar
const payment = await ReservationPaymentModel.getReservationPaymentById(paymentId)

// Query 2 — DELETE
await ReservationPaymentModel.deleteReservationPayment(paymentId)

// Queries 3+4+5 — recalculate (ver hallazgo 4)
await this.recalculateReservationPayments(payment.reservationId)
```

`DELETE ... RETURNING reservation_id` elimina la necesidad del SELECT previo.

---

### 7. `getReviewsStats` — 3 queries paralelas sobre la misma tabla

**Severidad**: media  
**Ubicación**: `src/models/googleMyBusiness.ts:206-249`

```ts
// 3 queries paralelas que pueden ser 1 CTE
const [statsResult, distributionResult, recentResult] = await Promise.all([
    db.query(statsQuery),        // COUNT + AVG
    db.query(distributionQuery), // GROUP BY rating
    db.query(recentQuery)        // COUNT WHERE >= now - 30d
])
```

Reemplazable con una sola query usando `FILTER`:

```sql
SELECT 
    COUNT(*)                                                    AS total,
    ROUND(AVG(rating), 2)                                       AS average_rating,
    COUNT(*) FILTER (
        WHERE google_create_time >= NOW() - INTERVAL '30 days'
    )                                                           AS recent_count,
    COUNT(*) FILTER (WHERE rating = 5)                          AS rating_5,
    COUNT(*) FILTER (WHERE rating = 4)                          AS rating_4,
    COUNT(*) FILTER (WHERE rating = 3)                          AS rating_3,
    COUNT(*) FILTER (WHERE rating = 2)                          AS rating_2,
    COUNT(*) FILTER (WHERE rating = 1)                          AS rating_1
FROM google_reviews
WHERE sync_status = 'active'
```

---

### 8. SQL injection en `cleanupOldReviews`

**Severidad**: alta  
**Ubicación**: `src/models/googleMyBusiness.ts:329-337`

```ts
// 🔴 Interpolación directa en SQL
const query = `
    DELETE FROM google_reviews 
    WHERE sync_status = 'deleted' 
    AND local_updated_at < (CURRENT_TIMESTAMP - INTERVAL '${daysOld} days')
`
```

Si `daysOld` llega de input externo (actualmente viene del controller como parámetro), es SQL injection. Aunque hoy se llama con valor hardcodeado, el patrón es inseguro.

```sql
-- Correcto: parámetro para el número de días
AND local_updated_at < (CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day'))
```

---

### 9. `LOWER(col) LIKE LOWER($1)` inutiliza índices en búsqueda de reviews

**Severidad**: media  
**Ubicación**: `src/models/googleMyBusiness.ts:271-283`

```sql
WHERE LOWER(comment) LIKE LOWER($1) 
   OR LOWER(reviewer_name) LIKE LOWER($1)
```

Aplicar `LOWER()` sobre la columna impide usar cualquier índice. Ya existen índices en la tabla, pero este query hace seq scan. La alternativa correcta es `ILIKE` (que ya hace case-insensitive) o un índice `GIN` con `pg_trgm` para búsqueda de texto parcial eficiente.

---

### 10. `UserModel.getAll` — ILIKE sin índice de texto

**Severidad**: baja  
**Ubicación**: `src/models/user.ts:12-28`

```sql
WHERE name ILIKE $1 AND lastname ILIKE $2 AND email ILIKE $3
```

`ILIKE` con `%pattern%` no usa índices B-tree estándar. Con pocos clientes esto no es problema, pero si la tabla crece necesitará índices GIN con `pg_trgm`.

---

### 11. `ReviewModel.createReview` — fallback con ID aleatorio

**Severidad**: media  
**Ubicación**: `src/models/review.ts:54-60`

```ts
// Si INSERT no devuelve rows, retorna un objeto con ID aleatorio
return {
    id: Math.floor(Math.random() * 1000) + 1,
    name, comment
}
```

Este fallback enmascara errores reales de DB devolviendo datos inventados. Un `INSERT ... RETURNING *` siempre devuelve la fila insertada o lanza excepción — el fallback nunca debería ejecutarse y oculta bugs reales.

---

## Plan de acción priorizado

| # | Acción | Esfuerzo | Impacto | Status |
|---|--------|----------|---------|--------|
| 1 | Agregar FK indexes faltantes (migración 011) | bajo | alto | pendiente |
| 2 | Corregir SQL injection en `cleanupOldReviews` | bajo | crítico | pendiente |
| 3 | Envolver createReservation+payment en transacción | medio | alto | pendiente |
| 4 | Reemplazar recalculate (3 queries) con 1 UPDATE + subquery | medio | alto | pendiente |
| 5 | RETURNING * en los 4 models con UPDATE+SELECT | bajo | medio | pendiente |
| 6 | Unificar `getReviewsStats` en 1 query con FILTER | bajo | medio | pendiente |
| 7 | Corregir `LOWER(col) LIKE` por `ILIKE` en searchReviews | bajo | medio | pendiente |
| 8 | Migrar fechas a TIMESTAMPTZ (habilita el índice de fechas) | alto | alto | pendiente |
| 9 | Agregar GIN indexes con pg_trgm para búsqueda de texto | medio | medio | pendiente |
| 10 | Eliminar fallback con ID aleatorio en ReviewModel | bajo | medio | pendiente |

---

## Notas

- `getSalesVolume` usa `date_trunc` en la columna `payment_date` que es `TIMESTAMP`. Existe índice `idx_payments_date` sobre esa columna, pero `date_trunc` sobre la columna lo invalida para el WHERE de rango. El WHERE tiene `payment_date >= $1 AND payment_date <= $2` (SARGable) — ese sí usa el índice. El GROUP BY con `date_trunc` es después de filtrar, correcto.
- `monthly_summaries` tiene `UNIQUE(month, year)` que implícitamente crea un índice — la migración `idx_monthly_summaries_month_year` es redundante.
- No hay queries con `OFFSET` grande que causarían el "late row lookup" problem — la paginación no está implementada, lo que es un problema aparte pero protege de este antipatrón por ahora.
