import { Router } from 'express'
import YachtController from '../controllers/yacht.js'
import upload from '../middleware/uploadMiddleware.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', YachtController.getAllYachts)
router.post('/', authMiddleware, upload.array('images', 30), YachtController.createYacht)
router.get('/:id', YachtController.getYachtById)
router.put('/:id', authMiddleware, upload.array('images', 30), YachtController.updateYacht)
router.delete('/:id', authMiddleware, YachtController.deleteYacht)

export default router 