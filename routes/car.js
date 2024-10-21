import { Router } from 'express'
import CarController from '../controllers/car.js'
import upload from '../middleware/uploadMiddleware.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', CarController.getAllCars)
router.post('/', authMiddleware, upload.array('images', 30), CarController.createCar)
router.get('/:id', CarController.getCarById)
router.put('/:id', authMiddleware, upload.array('images', 30), CarController.updateCar)
router.delete('/:id', authMiddleware, CarController.deleteCar)

export default router