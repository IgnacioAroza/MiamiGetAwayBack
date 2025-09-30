import { Request, Response } from 'express';
import GoogleMyBusinessService from '../services/googleMyBusinessService.js';
import { GoogleMyBusinessModel } from '../models/googleMyBusiness.js';
import { 
    AuthenticationStatus, 
    SyncResult, 
    GoogleReview 
} from '../types/googleMyBusiness.js';

export class GoogleMyBusinessController {
    
    // ===========================================
    // AUTENTICACIÓN Y ESTADO
    // ===========================================

    /**
     * Verificar estado de autenticación
     * GET /api/google-mybusiness/auth-status
     */
    static async getAuthStatus(req: Request, res: Response): Promise<void> {
        try {
            const service = new GoogleMyBusinessService();
            const authStatus: AuthenticationStatus = await service.isAuthenticated();
            
            res.status(200).json({
                success: true,
                data: authStatus
            });
        } catch (error: any) {
            console.error('Error checking auth status:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error verificando estado de autenticación'
            });
        }
    }

    /**
     * Iniciar proceso de autenticación OAuth
     * GET /api/google-mybusiness/auth/start
     */
    static async startAuth(req: Request, res: Response): Promise<void> {
        try {
            const service = new GoogleMyBusinessService();
            
            // Verificar si ya está autenticado
            const authStatus = await service.isAuthenticated();
            if (authStatus.isAuthenticated) {
                res.status(200).json({
                    success: true,
                    message: 'Ya está autenticado',
                    data: authStatus
                });
                return;
            }

            // Generar URL de autorización
            const authUrl = service.getAuthUrl();
            
            res.status(200).json({
                success: true,
                message: 'Redirigir al usuario para autorización',
                data: {
                    authUrl,
                    instructions: 'El usuario debe visitar esta URL para autorizar la aplicación'
                }
            });
        } catch (error: any) {
            console.error('Error starting auth:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error iniciando proceso de autenticación'
            });
        }
    }

    /**
     * Callback de OAuth - procesar código de autorización
     * GET /api/google-mybusiness/callback?code=xxx
     */
    static async handleCallback(req: Request, res: Response): Promise<void> {
        try {
            const { code } = req.query;

            if (!code || typeof code !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Código de autorización requerido'
                });
                return;
            }

            const service = new GoogleMyBusinessService();
            const tokens = await service.exchangeCodeForTokens(code);

            res.status(200).json({
                success: true,
                message: 'Autenticación completada exitosamente',
                data: {
                    tokenId: tokens.id,
                    accountEmail: tokens.google_email,
                    expiresAt: tokens.expires_at
                }
            });
        } catch (error: any) {
            console.error('Error handling callback:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error procesando autorización'
            });
        }
    }

    // ===========================================
    // REVIEWS - OBTENER Y SINCRONIZAR
    // ===========================================

    /**
     * Obtener reviews desde Google API
     * GET /api/google-mybusiness/reviews/fetch
     */
    static async fetchReviews(req: Request, res: Response): Promise<void> {
        try {
            const service = new GoogleMyBusinessService();
            
            // Verificar autenticación
            const authStatus = await service.isAuthenticated();
            if (!authStatus.isAuthenticated) {
                res.status(401).json({
                    success: false,
                    error: 'No autenticado',
                    message: 'Debe autenticarse primero',
                    needsAuth: true
                });
                return;
            }

            // Obtener reviews desde Google con metadatos completos
            const reviewsData = await service.getReviewsWithMetadata();
            
            res.status(200).json(reviewsData);
        } catch (error: any) {
            console.error('Error fetching reviews:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error obteniendo reviews desde Google'
            });
        }
    }

    /**
     * Sincronizar reviews (fetch + save to database)
     * POST /api/google-mybusiness/reviews/sync
     */
    static async syncReviews(req: Request, res: Response): Promise<void> {
        try {
            const service = new GoogleMyBusinessService();
            
            // Verificar autenticación
            const authStatus = await service.isAuthenticated();
            if (!authStatus.isAuthenticated) {
                res.status(401).json({
                    success: false,
                    error: 'No autenticado',
                    message: 'Debe autenticarse primero',
                    needsAuth: true
                });
                return;
            }

            // Sincronizar reviews
            const syncResult: SyncResult = await service.syncReviews();
            
            if (syncResult.success) {
                res.status(200).json({
                    success: true,
                    message: 'Sincronización completada exitosamente',
                    data: syncResult
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Error durante la sincronización',
                    data: syncResult
                });
            }
        } catch (error: any) {
            console.error('Error syncing reviews:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error sincronizando reviews'
            });
        }
    }

    // ===========================================
    // REVIEWS - BASE DE DATOS LOCAL
    // ===========================================

    /**
     * Obtener reviews desde la base de datos local
     * GET /api/google-mybusiness/reviews?limit=50&offset=0
     */
    static async getLocalReviews(req: Request, res: Response): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            // Validar parámetros
            if (limit < 1 || limit > 100) {
                res.status(400).json({
                    success: false,
                    error: 'Limit debe ser entre 1 y 100'
                });
                return;
            }

            if (offset < 0) {
                res.status(400).json({
                    success: false,
                    error: 'Offset debe ser mayor o igual a 0'
                });
                return;
            }

            const service = new GoogleMyBusinessService();
            const reviews = await service.getLocalReviews(limit, offset);
            
            res.status(200).json({
                success: true,
                message: `${reviews.length} reviews obtenidas desde base de datos local`,
                data: {
                    reviews,
                    count: reviews.length,
                    limit,
                    offset
                }
            });
        } catch (error: any) {
            console.error('Error getting local reviews:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error obteniendo reviews desde base de datos local'
            });
        }
    }

    /**
     * Obtener estadísticas de reviews
     * GET /api/google-mybusiness/reviews/stats
     */
    static async getReviewsStats(req: Request, res: Response): Promise<void> {
        try {
            const service = new GoogleMyBusinessService();
            const stats = await service.getReviewsStats();
            
            res.status(200).json({
                success: true,
                message: 'Estadísticas de reviews obtenidas',
                data: stats
            });
        } catch (error: any) {
            console.error('Error getting reviews stats:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error obteniendo estadísticas de reviews'
            });
        }
    }

    /**
     * Buscar reviews por texto
     * GET /api/google-mybusiness/reviews/search?q=excelente&limit=20
     */
    static async searchReviews(req: Request, res: Response): Promise<void> {
        try {
            const searchTerm = req.query.q as string;
            const limit = parseInt(req.query.limit as string) || 20;

            if (!searchTerm || searchTerm.trim().length < 2) {
                res.status(400).json({
                    success: false,
                    error: 'Término de búsqueda requerido (mínimo 2 caracteres)'
                });
                return;
            }

            if (limit < 1 || limit > 50) {
                res.status(400).json({
                    success: false,
                    error: 'Limit debe ser entre 1 y 50'
                });
                return;
            }

            const service = new GoogleMyBusinessService();
            const reviews = await service.searchReviews(searchTerm.trim(), limit);
            
            res.status(200).json({
                success: true,
                message: `${reviews.length} reviews encontradas para "${searchTerm}"`,
                data: {
                    reviews,
                    count: reviews.length,
                    searchTerm,
                    limit
                }
            });
        } catch (error: any) {
            console.error('Error searching reviews:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error buscando reviews'
            });
        }
    }

    // ===========================================
    // ADMINISTRACIÓN
    // ===========================================

    /**
     * Obtener información de tokens OAuth (admin)
     * GET /api/google-mybusiness/admin/tokens
     */
    static async getTokensInfo(req: Request, res: Response): Promise<void> {
        try {
            const tokens = await GoogleMyBusinessModel.getAllTokens();
            
            res.status(200).json({
                success: true,
                message: 'Información de tokens OAuth',
                data: {
                    tokens,
                    count: tokens.length
                }
            });
        } catch (error: any) {
            console.error('Error getting tokens info:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error obteniendo información de tokens'
            });
        }
    }

    /**
     * Obtener información de última sincronización
     * GET /api/google-mybusiness/admin/sync-info
     */
    static async getSyncInfo(req: Request, res: Response): Promise<void> {
        try {
            const syncInfo = await GoogleMyBusinessModel.getLastSyncInfo();
            
            res.status(200).json({
                success: true,
                message: 'Información de sincronización',
                data: syncInfo
            });
        } catch (error: any) {
            console.error('Error getting sync info:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error obteniendo información de sincronización'
            });
        }
    }

    /**
     * Forzar inicialización con tokens almacenados
     * POST /api/google-mybusiness/admin/initialize
     */
    static async forceInitialize(req: Request, res: Response): Promise<void> {
        try {
            const service = new GoogleMyBusinessService();
            const initialized = await service.initializeWithStoredTokens();
            
            if (initialized) {
                const authStatus = await service.isAuthenticated();
                res.status(200).json({
                    success: true,
                    message: 'Servicio inicializado con tokens almacenados',
                    data: authStatus
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'No se encontraron tokens válidos para inicializar',
                    needsAuth: true
                });
            }
        } catch (error: any) {
            console.error('Error forcing initialization:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error inicializando servicio'
            });
        }
    }

    // ===========================================
    // UTILIDADES Y SALUD DEL SISTEMA
    // ===========================================

    /**
     * Health check del servicio
     * GET /api/google-mybusiness/health
     */
    static async healthCheck(req: Request, res: Response): Promise<void> {
        try {
            const service = new GoogleMyBusinessService();
            const authStatus = await service.isAuthenticated();
            const syncInfo = await GoogleMyBusinessModel.getLastSyncInfo();
            const stats = await service.getReviewsStats();

            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                authentication: {
                    isAuthenticated: authStatus.isAuthenticated,
                    hasValidTokens: authStatus.hasValidTokens,
                    needsReauth: authStatus.needsReauth,
                    accountEmail: authStatus.accountEmail
                },
                database: {
                    lastSync: syncInfo.lastSync,
                    totalReviews: syncInfo.totalSynced,
                    averageRating: stats.averageRating
                }
            };

            res.status(200).json({
                success: true,
                message: 'Sistema Google My Business operativo',
                data: health
            });
        } catch (error: any) {
            console.error('Error in health check:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                message: 'Error verificando salud del sistema',
                status: 'unhealthy',
                timestamp: new Date().toISOString()
            });
        }
    }
}