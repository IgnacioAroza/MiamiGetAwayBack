import db from '../utils/db_render.js'
import { validateReview } from '../schemas/reviewSchema.js'

export default class ReviewModel {
    static async getAll() {
        try {
            const { rows } = await db.query('SELECT * FROM reviews;')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async createReview(body) {
        const { name, comment } = body
        const validateResult = validateReview(body)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!name || !comment) {
                throw new Error('Missing required fields')
            }

            const { rows } = await db.query(
                'INSERT INTO reviews (name, comment) VALUES ($1, $2) RETURNING *;', [name, comment]
            )
            return rows
        } catch (error) {
            console.log('Error creating review:', error)
            throw error
        }
    }

    static async deleteReview(id) {
        try {
            const { rowCount } = await db.query('DELETE FROM reviews WHERE id = $1;', [id])

            if (rowCount > 0) {
                return { success: true, message: 'Review deleted successfully' }
            } else {
                return { success: false, message: 'Review not found' }
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}