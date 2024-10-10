import express from 'express'
import YachtController from '../controllers/yacht.js'

const router = express.Router()

router.get('/', YachtController.getAllYachts)
router.post('/', YachtController.createYacht)
router.get('/:id', YachtController.getYachtById)
router.put('/:id', YachtController.updateYacht)
router.delete('/:id', YachtController.deleteYacht)

export default router