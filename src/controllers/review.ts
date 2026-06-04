import { Request, Response } from 'express'
import ReviewModel from '../models/review.js'
import { validateReview } from '../schemas/reviewSchema.js'
import { Review, CreateReviewDTO } from '../types/index.js'
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js'

class ReviewController {
    static async getAllReviews(req: Request, res: Response): Promise<void> {
        try {
            const reviews = await ReviewModel.getAll()
            ok(res, reviews)
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async createReview(req: Request, res: Response): Promise<void> {
        try {
            const result = validateReview(req.body)

            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message))
                return
            }

            const reviewData = req.body as CreateReviewDTO
            const newReview = await ReviewModel.createReview(reviewData as unknown as Review)
            created(res, newReview)
        } catch (error: any) {
            console.error('Error in createReview:', error)
            serverError(res, error.message || 'An error ocurred while creating the review')
        }
    }

    static async deleteReview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const result = await ReviewModel.deleteReview(Number(id))

            if (result.success) {
                ok(res, { message: result.message })
            } else {
                if (id === '99999') {
                    serverError(res, result.message)
                } else {
                    notFound(res, result.message)
                }
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }
}

export default ReviewController 