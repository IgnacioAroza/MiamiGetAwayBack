import { Router } from 'express';
import { GoogleMyBusinessController } from '../controllers/googleMyBusiness.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// ===========================================
// RUTAS DE AUTENTICACIÓN
// ===========================================

// Verificar estado de autenticación
router.get('/auth-status', GoogleMyBusinessController.getAuthStatus);

// Iniciar proceso de autenticación OAuth
router.get('/auth/start', authMiddleware, GoogleMyBusinessController.startAuth);

// Callback de OAuth — debe ser público, Google lo invoca directamente
router.get('/callback', GoogleMyBusinessController.handleCallback);

// ===========================================
// RUTAS DE REVIEWS
// ===========================================

// Obtener reviews desde Google API (sin guardar)
router.get('/reviews/fetch', authMiddleware, GoogleMyBusinessController.fetchReviews);

// Sincronizar reviews (fetch + save)
router.post('/reviews/sync', authMiddleware, GoogleMyBusinessController.syncReviews);

// Obtener reviews desde base de datos local
router.get('/reviews', GoogleMyBusinessController.getLocalReviews);

// Obtener estadísticas de reviews
router.get('/reviews/stats', GoogleMyBusinessController.getReviewsStats);

// Buscar reviews por texto
router.get('/reviews/search', GoogleMyBusinessController.searchReviews);

// ===========================================
// RUTAS DE ADMINISTRACIÓN (protegidas)
// ===========================================

// Información de tokens OAuth
router.get('/admin/tokens', authMiddleware, GoogleMyBusinessController.getTokensInfo);

// Información de sincronización
router.get('/admin/sync-info', authMiddleware, GoogleMyBusinessController.getSyncInfo);

// Forzar inicialización
router.post('/admin/initialize', authMiddleware, GoogleMyBusinessController.forceInitialize);

// ===========================================
// UTILIDADES
// ===========================================

// Health check
router.get('/health', GoogleMyBusinessController.healthCheck);

export default router;