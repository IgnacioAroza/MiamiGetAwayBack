import { Router } from 'express'
import ReviewController from '../controllers/review.js'

const router = Router()

router.get('/', ReviewController.getAllReviews)
router.post('/', ReviewController.createReview)
router.delete('/:id', ReviewController.deleteReview)

export default router 