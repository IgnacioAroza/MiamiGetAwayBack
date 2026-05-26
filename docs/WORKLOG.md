# WORKLOG — MiamiGetAway Backend

Bitácora cronológica de trabajo técnico.

---

## 2026-05-22

- Configurado entorno local: PostgreSQL 18 instalado, base `MGA_test_db` con usuario `test`. `.env.test` actualizado con variables individuales (`DB_USER`, `HOST`, `DATABASE`, `PASSWORD`, `PORT_DB`).
- Corregidas migraciones para setup local: `IF NOT EXISTS` en ADD COLUMN, `DROP TRIGGER IF EXISTS` en 004, eliminado `CONCURRENTLY` de 011, creada `000b_create_missing_tables.sql` con tablas faltantes (admins, cars, villas, yachts, reviews) y columnas faltantes en clients/reservations/apartments.
- Fix de seguridad (PR #34, mergeado a `development`):
  - `AdminModel`: todas las queries usan `SELECT id, username, email` — nunca se expone el password ni el hash.
  - Rutas `/api/admins`: protegidas con `authMiddleware` vía `router.use()` (antes estaban completamente públicas).
  - `auth.ts`: `JWT_SECRET` se leía a nivel de módulo antes de que `app.ts` cargara el `.env` correcto — movido dentro de la función `login`.
  - CORS: fallback a `false` cuando `ALLOWED_ORIGINS` no está seteado (antes abría todos los orígenes).
  - Agregado `helmet` para headers de seguridad HTTP.
  - Rate limiting en `/api/auth`: máximo 10 intentos de login por 15 minutos.

## 2026-05-14

- Instalados 8 agentes en `.claude/agents/` (typescript-pro, backend-developer, api-designer, postgres-pro, database-optimizer, security-auditor, test-automator, code-reviewer) y 2 skills (pdf, skill-creator).
- Creada estructura de documentación `docs/analysis/`, `docs/decisions/`.
- Generado análisis arquitectónico completo (`docs/analysis/001-arquitectura-general.md`): detectados 11 issues categorizados por severidad, 11 refactors priorizados por impacto/esfuerzo.
- Issues P0 identificados: lógica financiera en controller (`reservation.ts:209-430`) y fechas como strings con doble formato en DB.
- Generado API design review (`docs/analysis/002-api-design-review.md`): 10 hallazgos, el más crítico es `/api/admins` completamente sin auth (5 endpoints). También: verbos en URLs, sin versionado, sin paginación, DELETE devolviendo 200 en vez de 204.
- Generado análisis de queries PostgreSQL (`docs/analysis/003-postgres-queries.md`): 11 hallazgos. FK indexes faltantes en `reservations.client_id` y `reservation_payments.reservation_id`, SQL injection real en `cleanupOldReviews`, 4 patrones N+1 sin transacción. Creada migración `011_add_performance_indexes.sql` con los CREATE INDEX faltantes.
- Generado security audit (`docs/analysis/004-security-audit.md`): 3 vulnerabilidades críticas — (1) `AdminModel.createAdmin` devuelve password en texto plano, (2) rutas de admins sin auth, (3) OAuth callback sin validación de `state` (CSRF). También: CORS abre a todos los orígenes si `ALLOWED_ORIGINS` no está en `.env`, sin `helmet`, sin rate limiting en login.
