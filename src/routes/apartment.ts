import { Router } from 'express'
import ApartmentController from '../controllers/aparment.js'
import upload from '../middleware/uploadMiddleware.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', ApartmentController.getAllApartments)
router.post('/', authMiddleware, upload.array('images', 30), ApartmentController.createApartment)
router.get('/:id', ApartmentController.getApartmentById)
router.put('/:id', authMiddleware, upload.array('images', 30), ApartmentController.updateApartment)
router.delete('/:id', authMiddleware, ApartmentController.deleteApartment)

export default router 