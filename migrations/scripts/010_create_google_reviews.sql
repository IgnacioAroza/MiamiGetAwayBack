-- Migración 010: Crear tabla de Google Reviews para reemplazar la tabla 'reviews' existente
-- Fecha: 2025-09-29
-- Descripción: Nueva tabla que almacena reviews sincronizadas desde Google My Business

CREATE TABLE IF NOT EXISTS google_reviews (
    id SERIAL PRIMARY KEY,
    
    -- Identificadores de Google
    google_review_id VARCHAR(255) UNIQUE NOT NULL,        -- ID único de la review en Google
    google_location_id VARCHAR(255) NOT NULL,             -- ID de la location en Google My Business
    google_account_id VARCHAR(255) NOT NULL,              -- ID de la cuenta de Google My Business
    
    -- Información del reviewer
    reviewer_name VARCHAR(255) NOT NULL,                  -- Nombre del reviewer
    reviewer_photo_url TEXT,                              -- URL de la foto de perfil del reviewer
    
    -- Contenido de la review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Rating de 1 a 5 estrellas
    comment TEXT,                                         -- Comentario de la review (puede ser NULL)
    
    -- Fechas de Google
    google_create_time TIMESTAMP NOT NULL,               -- Cuándo se creó la review en Google
    google_update_time TIMESTAMP,                        -- Última actualización en Google
    
    -- Respuesta del negocio
    reply_comment TEXT,                                   -- Respuesta del negocio a la review
    reply_update_time TIMESTAMP,                         -- Cuándo se actualizó la respuesta
    
    -- Estado de sincronización
    sync_status VARCHAR(20) DEFAULT 'active' CHECK (sync_status IN ('active', 'deleted', 'system')),
    
    -- Timestamps locales
    local_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Cuándo se guardó localmente
    local_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Última actualización local
);

-- Crear índices para mejorar el rendimiento de consultas
CREATE INDEX idx_google_reviews_location_id ON google_reviews(google_location_id);
CREATE INDEX idx_google_reviews_account_id ON google_reviews(google_account_id);
CREATE INDEX idx_google_reviews_rating ON google_reviews(rating);
CREATE INDEX idx_google_reviews_create_time ON google_reviews(google_create_time);
CREATE INDEX idx_google_reviews_sync_status ON google_reviews(sync_status);
CREATE INDEX idx_google_reviews_local_created ON google_reviews(local_created_at);

-- Índice compuesto para consultas frecuentes
CREATE INDEX idx_google_reviews_location_status ON google_reviews(google_location_id, sync_status);

-- Trigger para actualizar local_updated_at automáticamente
CREATE OR REPLACE FUNCTION update_local_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.local_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_reviews_updated_at
    BEFORE UPDATE ON google_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_local_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE google_reviews IS 'Reviews sincronizadas desde Google My Business API';
COMMENT ON COLUMN google_reviews.google_review_id IS 'ID único de la review en Google My Business';
COMMENT ON COLUMN google_reviews.sync_status IS 'Estado: active (activa), deleted (eliminada), system (log del sistema)';
COMMENT ON COLUMN google_reviews.local_created_at IS 'Timestamp de cuándo se guardó la review localmente';
COMMENT ON COLUMN google_reviews.local_updated_at IS 'Timestamp de última actualización local';