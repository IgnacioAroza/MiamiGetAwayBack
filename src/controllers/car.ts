import { Request, Response } from 'express'
import CarModel from '../models/car.js'
import { validateCar, validatePartialCar } from '../schemas/carSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'
import { Cars, CreateCarsDTO, UpdateCarsDTO } from '../types/index.js'

class CarController {
    static async getAllCars(req: Request, res: Response): Promise<void> {
        try {
            const cars = await CarModel.getAll()
            res.status(200).json(cars)
        } catch (error: any) {
            console.error('Error in getAllCars:', error)
            res.status(500).json({ error: 'An error occurred while fetching cars' })
        }
    }

    static async getCarById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(Number(id))
            res.status(200).send(car)
        } catch (error: any) {
            res.status(500).send(error.message)
        }
    }

    static async createCar(req: Request, res: Response): Promise<void> {
        try {
            const carData: CreateCarsDTO = {
                brand: req.body.brand,
                model: req.body.model,
                price: parseFloat(req.body.price),
                description: req.body.description,
                images: []
            }

            const result = validateCar(carData)
            if (!result.success) {
                res.status(400).json({ message: 'Invalid car data', errors: result.error.flatten() })
                return
            }

            // Handle image uploads
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadPromises = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'cars' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                carData.images = await Promise.all(uploadPromises)
            }

            const newCar = await CarModel.createCar(carData as unknown as Cars)
            res.status(201).json(newCar)
        } catch (error: any) {
            console.error('Error in createCar:', error)
            res.status(500).json({ message: 'Error creating car', error: error.message })
        }
    }

    static async updateCar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const carData: UpdateCarsDTO = {
                brand: req.body.brand,
                model: req.body.model,
                description: req.body.description
            }

            if (req.body.price !== undefined) {
                const parsedPrice = parseFloat(req.body.price);
                if (!isNaN(parsedPrice)) {
                    carData.price = parsedPrice;
                } else {
                    res.status(400).json({ message: 'Invalid price value' });
                    return
                }
            }

            const result = validatePartialCar(req.body)

            if (!result.success) {
                res.status(400).json({ message: 'Error updating car', error: JSON.parse(result.error.message) })
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadPromises = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'cars' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                carData.images = await Promise.all(uploadPromises)
            }

            const updatedCar = await CarModel.updateCar(Number(id), carData)
            res.status(200).json(updatedCar)
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'An error ocurred while updating the car' })
        }
    }

    static async deleteCar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(Number(id))

            if (!car) {
                res.status(404).json({ message: 'Car not found' })
                return
            }

            // Eliminar imágenes de Cloudinary
            if (car.images && Array.isArray(car.images)) {
                const deletePromises = car.images.map(async (imageUrl: string) => {
                    const publicId = CarController.getPublicIdFromUrl(imageUrl)
                    try {
                        if (publicId) { // Verificar que publicId no es null
                            await cloudinary.uploader.destroy(publicId)
                            console.log(`Image deleted from Cloudinary: ${publicId}`)
                        }
                    } catch (error: any) {
                        console.error(`Error deleting image from Cloudinary: ${error.message}`)
                    }
                })
                await Promise.all(deletePromises)
            }

            const result = await CarModel.deleteCar(Number(id))

            // Verificamos la estructura de la respuesta
            if (result && typeof result === 'object' && 'message' in result) {
                res.status(200).json({ message: 'Car and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting car from database' })
            }
        } catch (error: any) {
            console.error('Error in deleteCar:', error)
            res.status(500).json({ error: error.message || 'An error occurred while deleting the car' })
        }
    }

    static getPublicIdFromUrl(url: string): string | null {
        try {
            const parsedUrl = new URL(url)
            const pathnameParts = parsedUrl.pathname.split('/')
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1]
            const filename = path.parse(filenameWithExtension).name
            return `cars/${filename}`
        } catch (error) {
            return null
        }
    }
}

export default CarController 