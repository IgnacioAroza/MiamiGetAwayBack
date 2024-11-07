import ReviewModel from '../models/review.js'
import { validateReview } from '../schemas/reviewSchema.js'

class ReviewController {
    static async getAllReviews(req, res) {
        try {
            const reviews = await ReviewModel.getAll()
            res.status(200).json(reviews)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createReview(req, res) {
        try {
            const result = validateReview(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }

            const newReview = await ReviewModel.createReview(req.body)
            res.status(201).json(newReview)
        } catch (error) {
            console.error('Error in createReview:', error)
            res.status(500).json({ error: error.message || 'An error ocurred while creating the review' })
        }
    }

    static async deleteReview(req, res) {
        try {
            const { id } = req.params
            const result = await ReviewModel.deleteReview(id)
            if (result.success) {
                res.status(200).json({ message: result.message })
            } else {
                res.status(404).json({ message: result.message })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }
}

export default ReviewController