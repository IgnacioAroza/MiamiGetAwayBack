import YachtModel from '../models/yacht.js'
import { validateYacht, validatePartialYacht } from '../schemas/yachtSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'

class YachtController {
    static async getAllYachts(req, res) {
        try {
            const yachts = await YachtModel.getAll()
            res.status(200).json(yachts)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getYachtById(req, res) {
        try {
            const { id } = req.params
            const yacht = await YachtModel.getYachtById(id)
            if (yacht) {
                res.status(200).json(yacht)
            } else {
                res.status(404).json({ message: 'Yacht not found' })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createYacht(req, res) {
        try {
            const yachtData = {
                name: req.body.name,
                description: req.body.description,
                capacity: parseInt(req.body.capacity),
                price: parseFloat(req.body.price)
            }

            const result = validateYacht(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'yachts' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                yachtData.images = await Promise.all(uploadPromises)
            } else {
                yachtData.images = []
            }

            const newYacht = await YachtModel.createYacht(yachtData)
            res.status(201).json(newYacht)
        } catch (error) {
            console.error('Error in createYacht:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the yacht' })
        }
    }

    static async updateYacht(req, res) {
        try {
            const { id } = req.params
            const yachtData = {
                name: req.body.name,
                description: req.body.description,
                capacity: parseInt(req.body.capacity),
                price: parseFloat(req.body.price)
            }

            const result = validatePartialYacht(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'yachts' },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                yachtData.images = await Promise.all(uploadPromises)
            }

            const updatedYacht = await YachtModel.updateYacht({ id, yachtData })
            res.status(200).json(updatedYacht)
        } catch (error) {
            console.error('Error in updateYacht:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the yacht' })
        }
    }

    static async deleteYacht(req, res) {
        try {
            const { id } = req.params
            const result = await YachtModel.deleteYacht(id)
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

export default YachtController