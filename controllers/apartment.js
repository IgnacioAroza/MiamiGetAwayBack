import ApartmentModel from '../models/apartment.js'
import { validateApartment, validatePartialApartment } from '../schemas/apartmentSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'

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
                bathrooms: parseInt(req.body.bathrooms),
                rooms: parseInt(req.body.rooms),
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
            const apartmentData = {}

            const updatableFields = ['name', 'description', 'address', 'capacity', 'bathrooms', 'rooms', 'price'];

            updatableFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (['capacity', 'bathrooms', 'rooms'].includes(field)) {
                        const parsedValue = parseInt(req.body[field]);
                        if (!isNaN(parsedValue)) {
                            apartmentData[field] = parsedValue;
                        } else {
                            return res.status(400).json({ message: `Valor inválido para ${field}` });
                        }
                    } else if (field === 'price') {
                        const parsedPrice = parseFloat(req.body[field]);
                        if (!isNaN(parsedPrice)) {
                            apartmentData[field] = parsedPrice;
                        } else {
                            return res.status(400).json({ message: 'Valor de precio inválido' });
                        }
                    } else {
                        apartmentData[field] = req.body[field];
                    }
                }
            });

            if (req.body.price !== undefined) {
                const parsedPrice = parseFloat(req.body.price);
                if (!isNaN(parsedPrice)) {
                    apartmentData.price = parsedPrice;
                } else {
                    return res.status(400).json({ message: 'Invalid price value' });
                }
            }
            const result = validatePartialApartment(apartmentData)

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
            const apartment = await ApartmentModel.getApartmentById(id)

            if (!apartment) {
                return res.status(404).json({ message: 'Apartment not found' })
            }

            // Eliminar imágenes de Cloudinary
            if (apartment.images && Array.isArray(apartment.images)) {
                const deletePromises = apartment.images.map(async imageUrl => {
                    const publicId = ApartmentController.getPublicIdFromUrl(imageUrl)
                    try {
                        await cloudinary.uploader.destroy(publicId)
                        return console.log(`Image deleted from Cloudinary: ${publicId}`)
                    } catch (error) {
                        return console.error(`Error deleting image from Cloudinary: ${error.message}`)
                    }
                })
                await Promise.all(deletePromises)
            }

            const result = await ApartmentModel.deleteApartment(id)

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
            return `apartments/${filename}`
        } catch (error) {
            console.log('Erro parsing URL:', error)
            return null
        }
    }
}

export default ApartmentController