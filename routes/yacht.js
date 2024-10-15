import express from 'express'
import YachtController from '../controllers/yacht.js'
import upload from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.get('/', YachtController.getAllYachts)
router.post('/', upload.array('images', 30), YachtController.createYacht)
router.get('/:id', YachtController.getYachtById)
router.put('/:id', upload.array('images', 30), YachtController.updateYacht)
router.delete('/:id', YachtController.deleteYacht)

export default router