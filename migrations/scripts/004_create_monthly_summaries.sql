-- Script para crear la tabla de resúmenes mensuales
-- Esta tabla almacenará los resúmenes de reservas y pagos por mes

-- Crear la tabla monthly_summaries
CREATE TABLE IF NOT EXISTS monthly_summaries (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_reservations INTEGER NOT NULL DEFAULT 0,
    total_payments DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice único para evitar duplicados de mes/año
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_summaries_month_year
ON monthly_summaries(month, year);

-- Crear índice para búsquedas por año
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_year
ON monthly_summaries(year);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monthly_summaries_updated_at
    BEFORE UPDATE ON monthly_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Log completado
SELECT 'Migración 004: Tabla monthly_summaries creada con éxito' as message;