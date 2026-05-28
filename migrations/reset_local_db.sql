-- =====================================================
-- RESET LOCAL DB — Solo para uso en MGA_test_db local
-- Ejecutar en PGAdmin conectado a MGA_test_db
-- =====================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO test;
GRANT ALL ON SCHEMA public TO public;
