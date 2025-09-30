import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GoogleMyBusinessModel } from '../models/googleMyBusiness.js';
import { 
    GoogleOAuthTokens, 
    GoogleReview, 
    GoogleBusinessInfo,
    AuthenticationStatus,
    SyncResult,
    SaveTokensDTO,
    CreateGoogleReviewDTO,
    OAuthService 
} from '../types/googleMyBusiness.js';

export default class GoogleMyBusinessService {
    private oauth2Client!: OAuth2Client;
    private credentials: any;
    private static readonly SCOPES = [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    constructor() {
        this.loadCredentials();
        this.initializeOAuth();
    }

    private loadCredentials(): void {
        try {
            // Cargar desde variables de entorno
            if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
                throw new Error('Google OAuth credentials not found. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
            }

            this.credentials = {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                project_id: process.env.GOOGLE_PROJECT_ID,
                auth_uri: process.env.GOOGLE_AUTH_URI,
                token_uri: process.env.GOOGLE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL
            };
        } catch (error) {
            console.error('❌ Error loading credentials:', error);
            throw error;
        }
    }

    private initializeOAuth(): void {
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/google-mybusiness/callback';
        
        this.oauth2Client = new OAuth2Client(
            this.credentials.client_id,
            this.credentials.client_secret,
            redirectUri
        );
    }

    // ===========================================
    // MÉTODOS DE AUTENTICACIÓN Y TOKENS
    // ===========================================

    /**
     * Inicializar servicio con tokens almacenados
     */
    async initializeWithStoredTokens(): Promise<boolean> {
        try {
            const storedTokens = await GoogleMyBusinessModel.getValidOAuthTokens();
            if (storedTokens) {
                this.oauth2Client.setCredentials({
                    access_token: storedTokens.access_token,
                    refresh_token: storedTokens.refresh_token,
                    token_type: storedTokens.token_type,
                    expiry_date: storedTokens.expires_at ? new Date(storedTokens.expires_at).getTime() : undefined
                });
                
                // Actualizar último uso
                await GoogleMyBusinessModel.updateLastUsed(storedTokens.id!);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error initializing with stored tokens:', error);
            return false;
        }
    }

    /**
     * Verificar si hay autenticación válida
     */
    async isAuthenticated(): Promise<AuthenticationStatus> {
        try {
            const tokens = await GoogleMyBusinessModel.getValidOAuthTokens();
            if (!tokens) {
                return { isAuthenticated: false, hasValidTokens: false, needsReauth: true };
            }

            // Verificar si el token está próximo a expirar (menos de 5 minutos)
            const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null;
            const now = new Date();
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
            
            if (expiresAt && expiresAt < fiveMinutesFromNow) {
                // Intentar renovar token
                const renewed = await this.refreshTokenIfNeeded(tokens);
                if (!renewed) {
                    return { isAuthenticated: false, hasValidTokens: false, needsReauth: true };
                }
            }

            return {
                isAuthenticated: true,
                hasValidTokens: true,
                accountEmail: tokens.google_email,
                accountId: tokens.google_account_id,
                lastSync: tokens.last_used_at,
                tokenExpiresAt: tokens.expires_at,
                needsReauth: false
            };
        } catch (error) {
            console.error('Error checking authentication:', error);
            return { isAuthenticated: false, hasValidTokens: false, needsReauth: true };
        }
    }

    /**
     * Generar URL de autorización OAuth
     */
    getAuthUrl(): string {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: GoogleMyBusinessService.SCOPES,
            prompt: 'consent'
        });
    }

    /**
     * Intercambiar código de autorización por tokens y guardarlos
     */
    async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // Obtener información del usuario
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            const userInfo = await oauth2.userinfo.get();

            // Preparar datos para guardar
            const tokenData: SaveTokensDTO = {
                access_token: tokens.access_token!,
                refresh_token: tokens.refresh_token || undefined,
                token_type: tokens.token_type || 'Bearer',
                expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
                scope: GoogleMyBusinessService.SCOPES.join(' '),
                google_account_id: userInfo.data.id || undefined,
                google_email: userInfo.data.email || undefined
            };

            // Guardar en base de datos
            const savedTokens = await GoogleMyBusinessModel.saveOAuthTokens(tokenData);
            console.log('✅ Tokens saved successfully');

            return savedTokens;
        } catch (error) {
            console.error('❌ Error exchanging code for tokens:', error);
            throw error;
        }
    }

    // ===========================================
    // MÉTODOS DE BASE DE DATOS - TOKENS
    // ===========================================

    /**
     * Renovar token si es necesario
     */
    private async refreshTokenIfNeeded(tokens: GoogleOAuthTokens): Promise<boolean> {
        try {
            if (!tokens.refresh_token) {
                console.warn('No refresh token available');
                return false;
            }

            this.oauth2Client.setCredentials({
                refresh_token: tokens.refresh_token
            });

            const { credentials } = await this.oauth2Client.refreshAccessToken();
            
            // Actualizar tokens en base de datos usando el modelo
            const expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null;
            await GoogleMyBusinessModel.updateTokens(tokens.id!, credentials.access_token!, expiresAt);

            console.log('✅ Token refreshed successfully');
            return true;
        } catch (error) {
            console.error('❌ Error refreshing token:', error);
            return false;
        }
    }

    // ===========================================
    // MÉTODOS AUXILIARES
    // ===========================================

    /**
     * Convertir rating de string a número
     */
    private convertRatingToNumber(rating: any): number {
        if (typeof rating === 'number') {
            return rating;
        }
        
        if (typeof rating === 'string') {
            const ratingMap: { [key: string]: number } = {
                'ONE': 1,
                'TWO': 2,
                'THREE': 3,
                'FOUR': 4,
                'FIVE': 5
            };
            return ratingMap[rating.toUpperCase()] || 0;
        }
        
        return 0;
    }

    // ===========================================
    // MÉTODOS DE GOOGLE MY BUSINESS API
    // ===========================================

    /**
     * Obtener reviews de Google My Business (solo array de reviews)
     */
    async getReviews(): Promise<GoogleReview[]> {
        try {
            const fullResponse = await this.getReviewsWithMetadata();
            return fullResponse.data.reviews.map((review: any) => ({
                google_review_id: review.id,
                google_location_id: review.google_location_id,
                google_account_id: review.google_account_id,
                reviewer_name: review.author,
                reviewer_photo_url: review.reviewerProfilePhotoUrl,
                rating: review.rating, // Ya convertido a número
                comment: review.text || '',
                google_create_time: review.createTime || new Date().toISOString(),
                google_update_time: review.updateTime,
                reply_comment: review.reply_comment,
                reply_update_time: review.reply_update_time,
                sync_status: 'active' as const
            }));
        } catch (error) {
            console.error('❌ Error getting reviews:', error);
            throw error;
        }
    }

    /**
     * Obtener reviews con metadatos completos (igual que googleBusinessService.ts)
     */
    async getReviewsWithMetadata(): Promise<any> {
        try {
            // Asegurar que tenemos tokens válidos
            const authStatus = await this.isAuthenticated();
            if (!authStatus.isAuthenticated) {
                throw new Error('Not authenticated. Please authenticate first.');
            }

            // IMPORTANTE: Cargar tokens antes de hacer llamadas a APIs
            await this.initializeWithStoredTokens();

            // Obtener accountId y locationId usando el método que funciona
            const accounts = await this.getAccounts();
            if (!accounts.length) {
                throw new Error('No accounts found');
            }

            const accountId = accounts[0].name.split('/')[1];
            const locations = await this.getLocations(accountId);
            if (!locations.length) {
                throw new Error('No locations found');
            }

            // El formato del name en API v1 es: accounts/{accountId}/locations/{locationId}
            console.log('🔍 Location name format:', locations[0].name);
            const locationNameParts = locations[0].name.split('/');
            const locationId = locationNameParts[locationNameParts.length - 1];
            console.log('🎯 Extracted locationId:', locationId);

            if (!locationId || locationId === 'undefined') {
                throw new Error(`Invalid locationId extracted from: ${locations[0].name}`);
            }

            // Obtener reviews usando la API v4 que sabemos que funciona
            const reviewsResponse = await this.oauth2Client.request({
                url: `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
                method: 'GET',
                params: {
                    pageSize: 50,
                    orderBy: 'updateTime desc'
                }
            });

            const data = reviewsResponse.data as any;
            const reviews = data?.reviews || [];
            
            // Mapear usando el mismo formato que googleBusinessService.ts
            return {
                success: true,
                message: 'Reviews obtenidas exitosamente con Google My Business API v4',
                data: {
                    total: data.totalReviewCount ?? null,
                    averageRating: data.averageRating ?? null,
                    reviewCount: reviews.length || 0,
                    reviews: reviews.map((r: any) => ({
                        id: r.reviewId,
                        stars: this.convertRatingToNumber(r.starRating),
                        text: r.comment,
                        author: r.reviewer?.displayName || 'Usuario',
                        when: r.updateTime,
                        createTime: r.createTime,
                        updateTime: r.updateTime,
                        reviewerProfilePhotoUrl: r.reviewer?.profilePhotoUrl,
                        isAnonymous: r.reviewer?.isAnonymous,
                        // Campos adicionales para compatibilidad con la BD
                        google_review_id: r.reviewId,
                        google_location_id: locationId,
                        google_account_id: accountId,
                        reviewer_name: r.reviewer?.displayName || 'Usuario',
                        reviewer_photo_url: r.reviewer?.profilePhotoUrl,
                        rating: this.convertRatingToNumber(r.starRating),
                        comment: r.comment || '',
                        google_create_time: r.createTime || new Date().toISOString(),
                        google_update_time: r.updateTime,
                        reply_comment: r.reviewReply?.comment,
                        reply_update_time: r.reviewReply?.updateTime,
                        sync_status: 'active' as const
                    })),
                    nextPageToken: data.nextPageToken || null,
                    locationName: `accounts/${accountId}/locations/${locationId}`,
                    limitation: 'Google My Business API v4 - OAuth - Todas las reviews disponibles'
                }
            };

        } catch (error) {
            console.error('❌ Error getting reviews:', error);
            throw error;
        }
    }

    /**
     * Sincronizar reviews con la base de datos
     */
    async syncReviews(): Promise<SyncResult> {
        try {
            const reviews = await this.getReviews();
            let newReviews = 0;
            let updatedReviews = 0;
            const errors: string[] = [];

            for (const review of reviews) {
                try {
                    await GoogleMyBusinessModel.saveOrUpdateReview(review);
                    
                    // Determinar si es nueva o actualizada
                    const exists = await GoogleMyBusinessModel.reviewExists(review.google_review_id);
                    
                    if (!exists) {
                        newReviews++;
                    } else {
                        updatedReviews++;
                    }
                } catch (error) {
                    errors.push(`Error syncing review ${review.google_review_id}: ${error}`);
                }
            }

            return {
                success: true,
                reviewsCount: reviews.length,
                newReviews,
                updatedReviews,
                errors: errors.length > 0 ? errors : undefined,
                lastSync: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error syncing reviews:', error);
            return {
                success: false,
                reviewsCount: 0,
                newReviews: 0,
                updatedReviews: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                lastSync: new Date().toISOString()
            };
        }
    }

    // ===========================================
    // MÉTODOS DE BASE DE DATOS - REVIEWS
    // ===========================================

    /**
     * Obtener reviews desde la base de datos local
     */
    async getLocalReviews(limit: number = 50, offset: number = 0): Promise<GoogleReview[]> {
        return await GoogleMyBusinessModel.getLocalReviews(limit, offset);
    }

    /**
     * Obtener estadísticas de reviews
     */
    async getReviewsStats() {
        return await GoogleMyBusinessModel.getReviewsStats();
    }

    /**
     * Buscar reviews por texto
     */
    async searchReviews(searchTerm: string, limit: number = 20): Promise<GoogleReview[]> {
        return await GoogleMyBusinessModel.searchReviews(searchTerm, limit);
    }

    // ===========================================
    // MÉTODOS AUXILIARES (de la implementación anterior)
    // ===========================================

    private async getAccounts(): Promise<any[]> {
        const mybusiness = google.mybusinessaccountmanagement({ version: 'v1', auth: this.oauth2Client });
        const response = await mybusiness.accounts.list();
        return response.data.accounts || [];
    }

    private async getLocations(accountId: string): Promise<any[]> {
        const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth: this.oauth2Client });
        const response = await mybusiness.accounts.locations.list({
            parent: `accounts/${accountId}`,
            readMask: 'name,title,storefrontAddress,phoneNumbers,categories,websiteUri,regularHours,metadata.placeId'
        });
        return response.data.locations || [];
    }
}