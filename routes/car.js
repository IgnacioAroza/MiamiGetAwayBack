import { Router } from 'express'
import CarController from '../controllers/car.js'
import upload from '../middleware/uploadMiddleware.js'

const router = Router()

router.get('/', CarController.getAllCars)
router.post('/', upload.array('images', 30), CarController.createCar)
router.get('/:id', CarController.getCarById)
router.put('/:id', upload.array('images', 30), CarController.updateCar)
router.delete('/:id', CarController.deleteCar)

export default router