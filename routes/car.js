import { Router } from 'express'
import CarController from '../controllers/car.js'

const router = Router()

router.get('/', CarController.getAllCars)
router.post('/', CarController.createCar)
router.get('/:id', CarController.getCarById)
router.put('/:id', CarController.updateCar)
router.delete('/:id', CarController.deleteCar)

export default router