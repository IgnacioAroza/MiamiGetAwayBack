import CarModel from '../models/car.js'
import { validateCar, validatePartialCar } from '../schemas/carSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'

class CarController {
    static async getAllCars(req, res) {
        try {
            const cars = await CarModel.getAll()
            res.status(200).json({ cars })
        } catch (error) {
            console.error('Error in getAllCars:', error)
            res.status(500).json({ error: 'An error occurred while fetching cars' })
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
            const carData = {
                brand: req.body.brand,
                model: req.body.model,
                price: parseFloat(req.body.price),
                description: req.body.description
            }

            const result = validateCar(carData)
            if (!result.success) {
                return res.status(400).json({ message: 'Invalid car data', errors: result.error.flatten() })
            }

            // Handle image uploads
            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'cars' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                carData.images = await Promise.all(uploadPromises)
            } else {
                carData.images = []
            }

            const newCar = await CarModel.createCar(carData)
            res.status(201).json(newCar)
        } catch (error) {
            console.error('Error in createCar:', error)
            res.status(500).json({ message: 'Error creating car', error: error.message })
        }
    }

    static async updateCar(req, res) {
        try {
            const { id } = req.params
            const carData = {
                brand: req.body.brand,
                model: req.body.model,
                price: parseFloat(req.body.price),
                description: req.body.description
            }

            const result = validatePartialCar(req.body)

            if (!result.success) {
                return res.status(400).json({ message: 'Error updating car', error: JSON.parse(result.error.message) })
            }

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'cars' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                carData.images = await Promise.all(uploadPromises)
            }

            const updatedCar = await CarModel.updateCar({ id, carData })
            res.status(200).json(updatedCar)
        } catch (error) {
            console.log('Error in updateCar:', error)
            res.status(500).json({ error: error.message || 'An error ocurred while updating the car' })
        }
    }

    static async deleteCar(req, res) {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(id)

            if (!car) {
                return res.status(404).json({ message: 'Car not found' })
            }

            // Eliminar imágenes de Cloudinary
            if (car.images && Array.isArray(car.images)) {
                const deletePromises = car.images.map(async imageUrl => {
                    const publicId = CarController.getPublicIdFromUrl(imageUrl)
                    try {
                        await cloudinary.uploader.destroy(publicId)
                        return console.log(`Image deleted from Cloudinary: ${publicId}`)
                    } catch (error) {
                        return console.error(`Error deleting image from Cloudinary: ${error.message}`)
                    }
                })
                await Promise.all(deletePromises)
            }

            const result = await CarModel.deleteCar(id)

            if (result.success) {
                res.status(200).json({ message: 'Car and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting car from database' })
            }
        } catch (error) {
            console.error('Error in deleteCar:', error)
            res.status(500).json({ error: error.message || 'An error occurred while deleting the car' })
        }
    }

    static getPublicIdFromUrl(url) {
        try {
            const parsedUrl = new URL(url)
            const pathnameParts = parsedUrl.pathname.split('/')
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1]
            const filename = path.parse(filenameWithExtension).name
            return `cars/${filename}`
        } catch (error) {
            console.log('Erro parsing URL:', error)
            return null
        }
    }
}

export default CarController