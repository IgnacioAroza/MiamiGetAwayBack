-- Agregar campo passengers a la tabla cars
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS passengers INTEGER CHECK (passengers > 0);

-- Agregar comentario para documentar
COMMENT ON COLUMN cars.passengers IS 'Number of seats/passengers the car can carry';