import CarModel from '../models/car.js'
import { validateCar, validatePartialCar } from '../schemas/carSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'
import crypto from 'crypto'

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
            console.log('Received data:', req.body)
            console.log('Received files:', req.files)

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

            console.log('Processed car data:', carData)

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
            await CarModel.deleteCar(req.params.id)
            res.status(200).send('Car deleted')
        } catch (error) {
            res.status(500).send(error.message)
        }
    }

    static async uploadImage(file) {
        const maxLength = 200 // Maximum length for the entire filename
        const ext = path.extname(file.originalname)
        const baseFilename = path.basename(file.originalname, ext)

        // Generate a short hash
        const hash = crypto.createHash('md5').update(baseFilename + Date.now()).digest('hex').substring(0, 8)

        // Truncate the original filename if necessary
        const truncatedFilename = baseFilename.length > (maxLength - hash.length - ext.length - 1)
            ? baseFilename.substring(0, maxLength - hash.length - ext.length - 1)
            : baseFilename

        // Construct the new filename
        const newFilename = `${truncatedFilename}-${hash}${ext}`.toLowerCase()

        return cloudinary.uploader.upload(file.buffer.toString('base64'), {
            folder: 'cars',
            resource_type: 'auto',
            public_id: newFilename
        })
    }
}

export default CarController