import express from 'express'
import ApartmentController from '../controllers/apartment.js'
import upload from '../middleware/uploadMiddleware.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', ApartmentController.getAllApartments)
router.post('/', authMiddleware, upload.array('images', 30), ApartmentController.createApartment)
router.get('/:id', ApartmentController.getApartmentById)
router.put('/:id', authMiddleware, upload.array('images', 30), ApartmentController.updateApartment)
router.delete('/:id', authMiddleware, ApartmentController.deleteApartment)

export default router