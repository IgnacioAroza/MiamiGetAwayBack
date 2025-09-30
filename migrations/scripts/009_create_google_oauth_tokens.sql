-- Migración 009: Crear tabla para almacenar tokens OAuth de Google
-- Fecha: 2025-09-29
-- Descripción: Tabla para persistir tokens de autenticación de Google APIs

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL DEFAULT 'google_reviews', -- Tipo de servicio: 'google_reviews', 'google_calendar', etc.
    access_token TEXT NOT NULL,                            -- Token de acceso (expira en ~1 hora)
    refresh_token TEXT,                                    -- Token de refresh (para renovar access_token)
    token_type VARCHAR(20) DEFAULT 'Bearer',               -- Tipo de token (normalmente 'Bearer')
    expires_at TIMESTAMP,                                  -- Cuándo expira el access_token
    scope TEXT,                                           -- Scopes autorizados (ej: 'business.manage userinfo.profile')
    
    -- Información del usuario/cuenta asociada
    google_account_id VARCHAR(255),                       -- ID de la cuenta de Google
    google_email VARCHAR(255),                            -- Email de la cuenta autorizada
    
    -- Timestamps de control
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Última vez que se usó el token
    
    -- Índices únicos para evitar duplicados
    UNIQUE(service, google_account_id),
    UNIQUE(service, google_email)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_google_oauth_tokens_service ON google_oauth_tokens(service);
CREATE INDEX idx_google_oauth_tokens_expires_at ON google_oauth_tokens(expires_at);
CREATE INDEX idx_google_oauth_tokens_google_account_id ON google_oauth_tokens(google_account_id);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_google_oauth_tokens_updated_at
    BEFORE UPDATE ON google_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE google_oauth_tokens IS 'Almacena tokens OAuth2 de Google APIs para autenticación persistente';
COMMENT ON COLUMN google_oauth_tokens.service IS 'Tipo de servicio de Google (google_reviews, google_calendar, etc.)';
COMMENT ON COLUMN google_oauth_tokens.access_token IS 'Token de acceso que expira en ~1 hora';
COMMENT ON COLUMN google_oauth_tokens.refresh_token IS 'Token para renovar el access_token automáticamente';
COMMENT ON COLUMN google_oauth_tokens.expires_at IS 'Timestamp de expiración del access_token';
COMMENT ON COLUMN google_oauth_tokens.google_account_id IS 'ID único de la cuenta de Google asociada';
COMMENT ON COLUMN google_oauth_tokens.last_used_at IS 'Última vez que se utilizó este token';