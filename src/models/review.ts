import db from '../utils/db_render.js';
import { Review } from '../types/index.js';
import { validateReview } from '../schemas/reviewSchema.js';

export default class ReviewModel {
    static async getAll(): Promise<Review[]> {
        try {
            const { rows } = await db.query('SELECT * FROM reviews');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getReviewById(id: number): Promise<Review | null> {
        try {
            const { rows } = await db.query('SELECT * FROM reviews WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
    
    static async createReview(reviewData: Review): Promise<Review> {
        const { name, comment } = reviewData;
        const validateResult = validateReview(reviewData);

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            if (!name || !comment) {
                throw new Error('Missing required fields');
            }

            const { rows } = await db.query(
                'INSERT INTO reviews (name, comment) VALUES ($1, $2) RETURNING *;',
                [name, comment]
            );

            const { id, ...dataWithoutId } = reviewData;
            return { id: rows[0].id, ...dataWithoutId };
        } catch (error) {
            console.log('Error creating review:', error);
            throw error;
        }
    }   

    static async updateReview(id: number, reviewData: Partial<Review>): Promise<Review> {
        const { name, comment } = reviewData;
        const updateFields = [];
        const updatedValues = [];
        let paramCount = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramCount++}`);
            updatedValues.push(name);
        }   
        if (comment !== undefined) {
            updateFields.push(`comment = $${paramCount++}`);
            updatedValues.push(comment);
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        try {
            updatedValues.push(id);
            const query = `UPDATE reviews SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues);

            const { rows } = await db.query('SELECT * FROM reviews WHERE id = $1', [id]);

            if (rows.length > 0) {
                const updatedReview = rows[0];
                return updatedReview;
            } else {
                throw new Error('Review not found');
            }
        } catch (error) {
            console.log('Error updating review:', error);
            throw error;
        }
    }

    static async deleteReview(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM reviews WHERE id = $1 RETURNING *;', [id]);

            if (rows.length > 0) {
                return { message: 'Review deleted successfully' };
            } else {
                throw new Error('Review not found');
            }
        } catch (error) {
            console.log('Error deleting review:', error);
            throw error;
        }
    }
}
