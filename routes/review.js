import express from 'express'
import ReviewController from '../controllers/review.js'

const router = express.Router()

router.get('/', ReviewController.getAllReviews)
router.post('/', ReviewController.createReview)
router.delete('/:id', ReviewController.deleteReview)

export default router