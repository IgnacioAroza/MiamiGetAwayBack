-- Script simplificado para modificar la tabla apartments
-- Solo añadimos unit_number y reutilizamos los campos existentes:
-- - name = building_name
-- - price = price_per_night

-- Añadir únicamente el campo unit_number
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100);

-- Actualizar el campo unit_number para que tenga un valor por defecto (ID como texto)
UPDATE apartments 
SET unit_number = CASE WHEN unit_number IS NULL THEN id::text ELSE unit_number END;

-- Añadir restricción NOT NULL
ALTER TABLE apartments 
ALTER COLUMN unit_number SET NOT NULL;

-- Añadir un índice para búsquedas por name y unit_number
CREATE INDEX IF NOT EXISTS idx_apartments_name_unit
ON apartments(name, unit_number);

-- Log completado
SELECT 'Migración 001: Tabla apartments modificada, añadido unit_number' as message; 