-- Migración 011: Índices de performance
-- Fecha: 2026-05-14
-- Descripción: FK indexes faltantes en reservations y reservation_payments,
--              partial indexes en google_reviews, y preparación para pg_trgm.

-- ============================================================
-- 1. FK INDEXES EN reservations
--    PostgreSQL NO crea índices automáticos en columnas FK.
--    Estas dos columnas aparecen en LEFT JOIN de cada listado.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservations_client_id
    ON reservations(client_id);

CREATE INDEX IF NOT EXISTS idx_reservations_apartment_id
    ON reservations(apartment_id);

-- Índice en status: usado en cron (WHERE status IN ('confirmed','checked_in'))
-- y en filtros de listado.
CREATE INDEX IF NOT EXISTS idx_reservations_status
    ON reservations(status);

-- Índice en payment_status: usado en filtros del dashboard.
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status
    ON reservations(payment_status);

-- ============================================================
-- 2. FK INDEX EN reservation_payments
--    reservation_id se usa en getPaymentsByReservation,
--    llamado en cada download PDF, notificación y delete.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservation_payments_reservation_id
    ON reservation_payments(reservation_id);

-- ============================================================
-- 3. PARTIAL INDEXES en google_reviews
--    sync_status = 'active' aparece en el WHERE de todas las
--    consultas públicas. Un partial index es más pequeño y rápido.
--    Los índices de migration 010 son full-table — estos los complementan.
-- ============================================================

-- Partial index para queries de listado + stats
CREATE INDEX IF NOT EXISTS idx_google_reviews_active_create_time
    ON google_reviews(google_create_time DESC)
    WHERE sync_status = 'active';

-- Partial index para filtros por rating
CREATE INDEX IF NOT EXISTS idx_google_reviews_active_rating
    ON google_reviews(rating)
    WHERE sync_status = 'active';

-- ============================================================
-- 4. ÍNDICES GIN PARA BÚSQUEDA DE TEXTO (pg_trgm)
--    Reemplaza LOWER(col) LIKE LOWER($1) y ILIKE con búsqueda eficiente.
--    Requiere la extensión pg_trgm — descomentar si está disponible en Render.
-- ============================================================

-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Búsqueda en reviews de Google (searchReviews usa ILIKE sobre comment y reviewer_name)
-- CREATE INDEX IF NOT EXISTS idx_google_reviews_comment_trgm
--     ON google_reviews USING GIN (comment gin_trgm_ops)
--     WHERE sync_status = 'active';

-- CREATE INDEX IF NOT EXISTS idx_google_reviews_reviewer_trgm
--     ON google_reviews USING GIN (reviewer_name gin_trgm_ops)
--     WHERE sync_status = 'active';

-- Búsqueda en clientes (UserModel.getAll usa ILIKE sobre name, lastname, email)
-- CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
--     ON clients USING GIN (name gin_trgm_ops);

-- CREATE INDEX IF NOT EXISTS idx_clients_lastname_trgm
--     ON clients USING GIN (lastname gin_trgm_ops);

-- ============================================================
-- 5. VERIFICACIÓN — consultar índices creados
-- ============================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('reservations', 'reservation_payments', 'google_reviews', 'clients')
  AND schemaname = 'current_schema()'
ORDER BY tablename, indexname;
