import CarModel from '../models/car.js'
import { validateCar, validatePartialCar } from '../schemas/carSchema.js'

class CarController {
    static async getAllCars(req, res) {
        try {
            const cars = await CarModel.getAll()
            res.send(cars)
        } catch (error) {
            res.status(500).send(error.message)
        }
    }

    static async getCarById(req, res) {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(id)
            res.status(200).send(car)
        } catch (error) {
            res.status(500).send(error.message)
        }
    }

    static async createCar(req, res) {
        try {
            const result = validateCar(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const newCar = await CarModel.createCar(req.body)
            res.status(200).send(newCar)
        } catch (error) {
            console.log('Error in createCar:', error)
            res.status(500).json({ error: error.message || 'An error ocurred while creating the car' })
        }
    }

    static async updateCar(req, res) {
        const result = validatePartialCar(req.body)

        if (!result.success) {
            return res.status(400).json({ error: JSON.parse(result.error.message) })
        }
        const { id } = req.params
        const updatedCar = await CarModel.updateCar({ id, input: result.data })
        res.status(200).json(updatedCar)
    }

    static async deleteCar(req, res) {
        try {
            await CarModel.deleteCar(req.params.id)
            res.status(200).send('Car deleted')
        } catch (error) {
            res.status(500).send(error.message)
        }
    }
}

export default CarController