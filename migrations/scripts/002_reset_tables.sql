-- Script para eliminar datos y resetear secuencias
-- ADVERTENCIA: Este script eliminará TODOS los datos de las tablas mencionadas

-- Eliminar datos de reservations y tablas relacionadas
TRUNCATE TABLE reservation_payments CASCADE;
TRUNCATE TABLE reservations CASCADE;
TRUNCATE TABLE monthly_summaries CASCADE;

-- Resetear las secuencias de ID a 1
ALTER SEQUENCE reservations_id_seq RESTART WITH 1;
ALTER SEQUENCE reservation_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE monthly_summaries_id_seq RESTART WITH 1;

-- Log completado
SELECT 'Reset de tablas completado. Todos los datos han sido eliminados.' as message; 