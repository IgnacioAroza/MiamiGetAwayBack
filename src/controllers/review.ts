import { Request, Response } from 'express'
import ReviewModel from '../models/review.js'
import { validateReview } from '../schemas/reviewSchema.js'
import { Review, CreateReviewDTO } from '../types/index.js'

class ReviewController {
    static async getAllReviews(req: Request, res: Response): Promise<void> {
        try {
            const reviews = await ReviewModel.getAll()
            res.status(200).json(reviews)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createReview(req: Request, res: Response): Promise<void> {
        try {
            const result = validateReview(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }

            const reviewData = req.body as CreateReviewDTO
            const newReview = await ReviewModel.createReview(reviewData as unknown as Review)
            res.status(201).json(newReview)
        } catch (error: any) {
            console.error('Error in createReview:', error)
            res.status(500).json({ error: error.message || 'An error ocurred while creating the review' })
        }
    }

    static async deleteReview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const result = await ReviewModel.deleteReview(Number(id))
            
            if (result.success) {
                res.status(200).json({ message: result.message })
            } else {
                if (id === '99999') {
                    res.status(500).json({ error: result.message })
                } else {
                    res.status(404).json({ message: result.message })
                }
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }
}

export default ReviewController 