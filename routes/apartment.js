import express from 'express'
import ApartmentController from '../controllers/apartment.js'

const router = express.Router()

router.get('/', ApartmentController.getAllApartments)
router.post('/', ApartmentController.createApartment)
router.get('/:id', ApartmentController.getApartmentById)
router.put('/:id', ApartmentController.updateApartment)
router.delete('/:id', ApartmentController.deleteApartment)

export default router