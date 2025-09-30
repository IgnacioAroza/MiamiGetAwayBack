import db from '../utils/db_render.js';
import { 
    GoogleOAuthTokens, 
    GoogleReview, 
    SaveTokensDTO,
    OAuthService 
} from '../types/googleMyBusiness.js';

export class GoogleMyBusinessModel {
    
    // ===========================================
    // MÉTODOS PARA OAUTH TOKENS
    // ===========================================

    /**
     * Guardar tokens OAuth en base de datos
     */
    static async saveOAuthTokens(tokenData: SaveTokensDTO): Promise<GoogleOAuthTokens> {
        const query = `
            INSERT INTO google_oauth_tokens (
                service, access_token, refresh_token, token_type, expires_at, 
                scope, google_account_id, google_email, last_used_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (service, google_account_id) 
            DO UPDATE SET 
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_type = EXCLUDED.token_type,
                expires_at = EXCLUDED.expires_at,
                scope = EXCLUDED.scope,
                google_email = EXCLUDED.google_email,
                updated_at = CURRENT_TIMESTAMP,
                last_used_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const values = [
            OAuthService.GOOGLE_REVIEWS,
            tokenData.access_token,
            tokenData.refresh_token,
            tokenData.token_type,
            tokenData.expires_at,
            tokenData.scope,
            tokenData.google_account_id,
            tokenData.google_email
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Obtener tokens OAuth válidos de la base de datos
     */
    static async getValidOAuthTokens(): Promise<GoogleOAuthTokens | null> {
        const query = `
            SELECT * FROM google_oauth_tokens 
            WHERE service = $1 
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ORDER BY last_used_at DESC 
            LIMIT 1
        `;

        const result = await db.query(query, [OAuthService.GOOGLE_REVIEWS]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Actualizar tokens después de refresh
     */
    static async updateTokens(tokenId: number, accessToken: string, expiresAt: string | null): Promise<void> {
        const query = `
            UPDATE google_oauth_tokens 
            SET access_token = $1, 
                expires_at = $2, 
                updated_at = CURRENT_TIMESTAMP,
                last_used_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `;

        await db.query(query, [accessToken, expiresAt, tokenId]);
    }

    /**
     * Actualizar timestamp de último uso
     */
    static async updateLastUsed(tokenId: number): Promise<void> {
        const query = `
            UPDATE google_oauth_tokens 
            SET last_used_at = CURRENT_TIMESTAMP 
            WHERE id = $1
        `;
        await db.query(query, [tokenId]);
    }

    /**
     * Obtener todos los tokens (para administración)
     */
    static async getAllTokens(): Promise<GoogleOAuthTokens[]> {
        const query = `
            SELECT id, service, token_type, expires_at, scope, 
                   google_account_id, google_email, created_at, 
                   updated_at, last_used_at
            FROM google_oauth_tokens 
            ORDER BY last_used_at DESC
        `;

        const result = await db.query(query);
        return result.rows;
    }

    /**
     * Eliminar tokens por ID
     */
    static async deleteTokens(tokenId: number): Promise<boolean> {
        const query = `DELETE FROM google_oauth_tokens WHERE id = $1`;
        const result = await db.query(query, [tokenId]);
        return (result.rowCount || 0) > 0;
    }

    // ===========================================
    // MÉTODOS PARA GOOGLE REVIEWS
    // ===========================================

    /**
     * Guardar o actualizar review en base de datos
     */
    static async saveOrUpdateReview(review: GoogleReview): Promise<GoogleReview> {
        const query = `
            INSERT INTO google_reviews (
                google_review_id, google_location_id, google_account_id,
                reviewer_name, reviewer_photo_url, rating, comment,
                google_create_time, google_update_time, reply_comment,
                reply_update_time, sync_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (google_review_id)
            DO UPDATE SET
                reviewer_name = EXCLUDED.reviewer_name,
                reviewer_photo_url = EXCLUDED.reviewer_photo_url,
                rating = EXCLUDED.rating,
                comment = EXCLUDED.comment,
                google_update_time = EXCLUDED.google_update_time,
                reply_comment = EXCLUDED.reply_comment,
                reply_update_time = EXCLUDED.reply_update_time,
                local_updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const values = [
            review.google_review_id,
            review.google_location_id,
            review.google_account_id,
            review.reviewer_name,
            review.reviewer_photo_url,
            review.rating,
            review.comment,
            review.google_create_time,
            review.google_update_time,
            review.reply_comment,
            review.reply_update_time,
            review.sync_status
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Obtener reviews desde la base de datos local
     */
    static async getLocalReviews(limit: number = 50, offset: number = 0): Promise<GoogleReview[]> {
        const query = `
            SELECT * FROM google_reviews 
            WHERE sync_status = 'active'
            ORDER BY google_create_time DESC 
            LIMIT $1 OFFSET $2
        `;

        const result = await db.query(query, [limit, offset]);
        return result.rows;
    }

    /**
     * Verificar si una review existe
     */
    static async reviewExists(googleReviewId: string): Promise<boolean> {
        const query = `
            SELECT 1 FROM google_reviews 
            WHERE google_review_id = $1 
            LIMIT 1
        `;

        const result = await db.query(query, [googleReviewId]);
        return result.rows.length > 0;
    }

    /**
     * Obtener estadísticas de reviews
     */
    static async getReviewsStats(): Promise<{
        total: number;
        averageRating: number;
        ratingDistribution: { [key: number]: number };
        recentCount: number;
    }> {
        // Total y promedio
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                ROUND(AVG(rating), 2) as average_rating
            FROM google_reviews 
            WHERE sync_status = 'active'
        `;

        // Distribución por rating
        const distributionQuery = `
            SELECT rating, COUNT(*) as count
            FROM google_reviews 
            WHERE sync_status = 'active'
            GROUP BY rating
            ORDER BY rating DESC
        `;

        // Reviews recientes (últimos 30 días)
        const recentQuery = `
            SELECT COUNT(*) as recent_count
            FROM google_reviews 
            WHERE sync_status = 'active'
            AND google_create_time >= (CURRENT_TIMESTAMP - INTERVAL '30 days')
        `;

        const [statsResult, distributionResult, recentResult] = await Promise.all([
            db.query(statsQuery),
            db.query(distributionQuery),
            db.query(recentQuery)
        ]);

        const stats = statsResult.rows[0];
        const distribution = distributionResult.rows.reduce((acc, row) => {
            acc[row.rating] = parseInt(row.count);
            return acc;
        }, {} as { [key: number]: number });

        return {
            total: parseInt(stats.total),
            averageRating: parseFloat(stats.average_rating) || 0,
            ratingDistribution: distribution,
            recentCount: parseInt(recentResult.rows[0].recent_count)
        };
    }

    /**
     * Obtener reviews por rating
     */
    static async getReviewsByRating(rating: number, limit: number = 10): Promise<GoogleReview[]> {
        const query = `
            SELECT * FROM google_reviews 
            WHERE sync_status = 'active' AND rating = $1
            ORDER BY google_create_time DESC 
            LIMIT $2
        `;

        const result = await db.query(query, [rating, limit]);
        return result.rows;
    }

    /**
     * Buscar reviews por texto
     */
    static async searchReviews(searchTerm: string, limit: number = 20): Promise<GoogleReview[]> {
        const query = `
            SELECT * FROM google_reviews 
            WHERE sync_status = 'active' 
            AND (
                LOWER(comment) LIKE LOWER($1) 
                OR LOWER(reviewer_name) LIKE LOWER($1)
                OR LOWER(reply_comment) LIKE LOWER($1)
            )
            ORDER BY google_create_time DESC 
            LIMIT $2
        `;

        const searchPattern = `%${searchTerm}%`;
        const result = await db.query(query, [searchPattern, limit]);
        return result.rows;
    }

    /**
     * Marcar review como eliminada (soft delete)
     */
    static async markReviewAsDeleted(googleReviewId: string): Promise<boolean> {
        const query = `
            UPDATE google_reviews 
            SET sync_status = 'deleted', local_updated_at = CURRENT_TIMESTAMP
            WHERE google_review_id = $1
        `;

        const result = await db.query(query, [googleReviewId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Obtener última sincronización
     */
    static async getLastSyncInfo(): Promise<{
        lastSync: string | null;
        totalSynced: number;
    }> {
        const query = `
            SELECT 
                MAX(local_created_at) as last_sync,
                COUNT(*) as total_synced
            FROM google_reviews 
            WHERE sync_status = 'active'
        `;

        const result = await db.query(query);
        const row = result.rows[0];

        return {
            lastSync: row.last_sync,
            totalSynced: parseInt(row.total_synced)
        };
    }

    /**
     * Limpiar reviews antiguas (opcional - para mantenimiento)
     */
    static async cleanupOldReviews(daysOld: number = 365): Promise<number> {
        const query = `
            DELETE FROM google_reviews 
            WHERE sync_status = 'deleted' 
            AND local_updated_at < (CURRENT_TIMESTAMP - INTERVAL '${daysOld} days')
        `;

        const result = await db.query(query);
        return result.rowCount || 0;
    }
}