import express from 'express'
import ApartmentController from '../controllers/apartment.js'
import upload from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.get('/', ApartmentController.getAllApartments)
router.post('/', upload.array('images', 30), ApartmentController.createApartment)
router.get('/:id', ApartmentController.getApartmentById)
router.put('/:id', upload.array('images', 30), ApartmentController.updateApartment)
router.delete('/:id', ApartmentController.deleteApartment)

export default router