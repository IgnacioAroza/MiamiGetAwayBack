import { Request, Response } from 'express'
import YachtModel from '../models/yacht.js'
import { validateYacht, validatePartialYacht } from '../schemas/yachtSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'
import { Yacht, CreateYachtDTO, UpdateYachtDTO } from '../types/index.js'

class YachtController {
    static async getAllYachts(req: Request, res: Response): Promise<void> {
        try {
            const yachts = await YachtModel.getAll()
            res.status(200).json(yachts)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getYachtById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const yacht = await YachtModel.getYachtById(Number(id))
            if (yacht) {
                res.status(200).json(yacht)
            } else {
                res.status(404).json({ message: 'Yacht not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createYacht(req: Request, res: Response): Promise<void> {
        try {
            const yachtData: CreateYachtDTO = {
                name: req.body.name,
                description: req.body.description,
                capacity: parseInt(req.body.capacity),
                price: parseFloat(req.body.price),
                images: []
            }

            const result = validateYacht(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadPromises = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'yachts' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                yachtData.images = await Promise.all(uploadPromises)
            }

            const newYacht = await YachtModel.createYacht(yachtData as unknown as Yacht)
            res.status(201).json(newYacht)
        } catch (error: any) {
            console.error('Error in createYacht:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the yacht' })
        }
    }

    static async updateYacht(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const yachtData: UpdateYachtDTO = {
                name: req.body.name,
                description: req.body.description,
            }

            if (req.body.capacity !== undefined) {
                const parsedCapacity = parseInt(req.body.capacity);
                if (!isNaN(parsedCapacity)) {
                    yachtData.capacity = parsedCapacity;
                } else {
                    res.status(400).json({ message: 'Invalid capacity value' })
                    return
                }
            }

            if (req.body.price !== undefined) {
                const parsedPrice = parseFloat(req.body.price);
                if (!isNaN(parsedPrice)) {
                    yachtData.price = parsedPrice;
                } else {
                    res.status(400).json({ message: 'Invalid price value' })
                    return
                }
            }

            const result = validatePartialYacht(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadPromises = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'yachts' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                yachtData.images = await Promise.all(uploadPromises)
            }

            const updatedYacht = await YachtModel.updateYacht(Number(id), yachtData)
            res.status(200).json(updatedYacht)
        } catch (error: any) {
            console.error('Error in updateYacht:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the yacht' })
        }
    }

    static async deleteYacht(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const yacht = await YachtModel.getYachtById(Number(id))

            if (!yacht) {
                res.status(404).json({ message: 'Yacht not found' })
                return
            }

            // Eliminar imágenes de Cloudinary
            if (yacht.images && Array.isArray(yacht.images)) {
                const deletePromises = yacht.images.map(async (imageUrl: string) => {
                    const publicId = YachtController.getPublicIdFromUrl(imageUrl)
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

            const result = await YachtModel.deleteYacht(Number(id))

            if (result && typeof result === 'object' && 'success' in result && result.success) {
                res.status(200).json({ message: 'Yacht and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting yacht from database' })
            }
        } catch (error: any) {
            console.error('Error in deleteYacht:', error) // Corregido de deleteCar a deleteYacht
            res.status(500).json({ error: error.message || 'An error occurred while deleting the yacht' })
        }
    }

    static getPublicIdFromUrl(url: string): string | null {
        try {
            const parsedUrl = new URL(url)
            const pathnameParts = parsedUrl.pathname.split('/')
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1]
            const filename = path.parse(filenameWithExtension).name
            return `yachts/${filename}`
        } catch (error) {
            console.log('Error parsing URL:', error)
            return null
        }
    }
}

export default YachtController 