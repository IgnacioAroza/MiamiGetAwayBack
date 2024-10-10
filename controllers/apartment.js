import ApartmentModel from '../models/apartment.js'
import { validateApartment, validatePartialApartment } from '../schemas/apartmentSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'

class ApartmentController {
    static async getAllApartments(req, res) {
        try {
            const apartments = await ApartmentModel.getAll()
            res.status(200).json(apartments)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getApartmentById(req, res) {
        try {
            const { id } = req.params
            const apartment = await ApartmentModel.getApartmentById(id)
            if (apartment) {
                res.status(200).json(apartment)
            } else {
                res.status(404).json({ message: 'Apartment not found' })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createApartment(req, res) {
        try {
            const apartmentData = {
                name: req.body.name,
                description: req.body.description,
                address: req.body.address,
                capacity: parseInt(req.body.capacity),
                price: parseFloat(req.body.price)
            }

            const result = validateApartment(apartmentData)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'apartments' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                apartmentData.images = await Promise.all(uploadPromises)
            } else {
                apartmentData.images = []
            }

            const newApartment = await ApartmentModel.createApartment(apartmentData)
            res.status(201).json(newApartment)
        } catch (error) {
            console.error('Error in createApartment:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the apartment' })
        }
    }

    static async updateApartment(req, res) {
        try {
            const { id } = req.params
            const apartmentData = {
                name: req.body.name,
                description: req.body.description,
                address: req.body.address,
                capacity: parseInt(req.body.capacity),
                price: parseFloat(req.body.price)
            }

            const result = validatePartialApartment(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'apartments' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                apartmentData.images = await Promise.all(uploadPromises)
            }

            const updatedApartment = await ApartmentModel.updateApartment({ id, apartmentData })
            res.status(200).json(updatedApartment)
        } catch (error) {
            console.error('Error in updateApartment:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the apartment' })
        }
    }

    static async deleteApartment(req, res) {
        try {
            const { id } = req.params
            const result = await ApartmentModel.deleteApartment(id)
            if (result.success) {
                res.status(200).json({ message: result.message })
            } else {
                res.status(404).json({ message: result.message })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }
}

export default ApartmentController