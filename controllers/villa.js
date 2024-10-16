import VillaModel from '../models/villa.js'
import { validateVilla, validatePartialVilla } from '../schemas/villaSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'

class VillaController {
    static async getAllVillas(req, res) {
        try {
            const villas = await VillaModel.getAll()
            res.status(200).json(villas)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getVillaById(req, res) {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(id)
            if (villa) {
                res.status(200).json(villa)
            } else {
                res.status(404).json({ message: 'Villa not found' })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createVilla(req, res) {
        try {
            const villaData = {
                name: req.body.name,
                description: req.body.description,
                address: req.body.address,
                capacity: parseInt(req.body.capacity),
                price: parseFloat(req.body.price)
            }

            const result = validateVilla(villaData)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'villas' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                villaData.images = await Promise.all(uploadPromises)
            } else {
                villaData.images = []
            }

            const newVilla = await VillaModel.createVilla(villaData)
            res.status(201).json(newVilla)
        } catch (error) {
            console.error('Error in createVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the villa' })
        }
    }

    static async updateVilla(req, res) {
        try {
            const { id } = req.params
            const villaData = {
                name: req.body.name,
                description: req.body.description,
                address: req.body.address,
            }

            if (req.body.capacity !== undefined) {
                const parsedCapacity = parseInt(req.body.capacity);
                if (!isNaN(parsedCapacity)) {
                    villaData.capacity = parsedCapacity;
                } else {
                    return res.status(400).json({ message: 'Invalid price value' });
                }
            }

            if (req.body.price !== undefined) {
                const parsedPrice = parseFloat(req.body.price);
                if (!isNaN(parsedPrice)) {
                    villaData.price = parsedPrice;
                } else {
                    return res.status(400).json({ message: 'Invalid price value' });
                }
            }

            const result = validatePartialVilla(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'villas' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                villaData.images = await Promise.all(uploadPromises)
            }

            const updatedVilla = await VillaModel.updateVilla({ id, villaData })
            res.status(200).json(updatedVilla)
        } catch (error) {
            console.error('Error in updateVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the villa' })
        }
    }

    static async deleteVilla(req, res) {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(id)

            if (!villa) {
                return res.status(404).json({ message: 'Villa not found' })
            }

            // Eliminar imágenes de Cloudinary
            if (villa.images && Array.isArray(villa.images)) {
                const deletePromises = villa.images.map(async imageUrl => {
                    const publicId = VillaController.getPublicIdFromUrl(imageUrl)
                    try {
                        await cloudinary.uploader.destroy(publicId)
                        return console.log(`Image deleted from Cloudinary: ${publicId}`)
                    } catch (error) {
                        return console.error(`Error deleting image from Cloudinary: ${error.message}`)
                    }
                })
                await Promise.all(deletePromises)
            }

            const result = await VillaModel.deleteVilla(id)

            if (result.success) {
                res.status(200).json({ message: 'Villa and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting Villa from database' })
            }
        } catch (error) {
            console.error('Error in deleteVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while deleting the villa' })
        }
    }

    static getPublicIdFromUrl(url) {
        try {
            const parsedUrl = new URL(url)
            const pathnameParts = parsedUrl.pathname.split('/')
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1]
            const filename = path.parse(filenameWithExtension).name
            return `villas/${filename}`
        } catch (error) {
            console.log('Erro parsing URL:', error)
            return null
        }
    }
}

export default VillaController