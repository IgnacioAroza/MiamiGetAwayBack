import { Router } from 'express'
import VillaController from '../controllers/villa.js'
import upload from '../middleware/uploadMiddleware.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', VillaController.getAllVillas)
router.post('/', authMiddleware, upload.array('images', 30), VillaController.createVilla)
router.get('/:id', VillaController.getVillaById)
router.put('/:id', authMiddleware, upload.array('images', 30), VillaController.updateVilla)
router.delete('/:id', authMiddleware, VillaController.deleteVilla)

export default router 