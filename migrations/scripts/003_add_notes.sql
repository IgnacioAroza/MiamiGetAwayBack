-- Agregar columna notes a la tabla reservations
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS notes TEXT;