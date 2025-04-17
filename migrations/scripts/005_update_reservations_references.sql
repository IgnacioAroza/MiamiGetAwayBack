-- Script para actualizar las referencias en reservations y eliminar admin_apartments

-- Eliminar la clave foránea actual
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_apartment_id_fkey;

-- Eliminar los datos de reservas actuales si no son necesarios
TRUNCATE TABLE reservations CASCADE;

-- Limpiar pagos relacionados con reservas
TRUNCATE TABLE reservation_payments CASCADE;

-- Actualizar la referencia para apuntar a la tabla apartments
ALTER TABLE reservations
ADD CONSTRAINT reservations_apartment_id_fkey
FOREIGN KEY (apartment_id) REFERENCES apartments(id);

-- Eliminar la tabla admin_apartments si ya no es necesaria
DROP TABLE IF EXISTS admin_apartments;

-- Log completado
SELECT 'Migración 002: Referencias de reservations actualizadas y tabla admin_apartments eliminada' as message; 