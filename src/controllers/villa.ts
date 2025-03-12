import { Request, Response } from 'express'
import VillaModel from '../models/villa.js'
import { validateVilla, validatePartialVilla } from '../schemas/villaSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'
import { Villa, CreateVillaDTO, UpdateVillaDTO } from '../types/index.js'

interface MulterFile {
  buffer: Buffer
  [key: string]: any
}

class VillaController {
    static async getAllVillas(req: Request, res: Response): Promise<void> {
        try {
            const villas = await VillaModel.getAll()
            res.status(200).json(villas)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getVillaById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(Number(id))
            if (villa) {
                res.status(200).json(villa)
            } else {
                res.status(404).json({ message: 'Villa not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createVilla(req: Request, res: Response): Promise<void> {
        try {
            const villaData: CreateVillaDTO = {
                name: req.body.name,
                description: req.body.description,
                address: req.body.address,
                capacity: parseInt(req.body.capacity),
                bathrooms: parseInt(req.body.bathrooms),
                rooms: parseInt(req.body.rooms),
                price: parseFloat(req.body.price),
                images: []
            }

            const result = validateVilla(villaData)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadPromises = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'villas' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                villaData.images = await Promise.all(uploadPromises)
            }

            const newVilla = await VillaModel.createVilla(villaData as unknown as Villa)
            res.status(201).json(newVilla)
        } catch (error: any) {
            console.error('Error in createVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the villa' })
        }
    }

    static async updateVilla(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const villaData: UpdateVillaDTO = {
                name: req.body.name,
                description: req.body.description,
                address: req.body.address
            }

            if (req.body.capacity !== undefined) {
                const parsedCapacity = parseInt(req.body.capacity);
                if (!isNaN(parsedCapacity)) {
                    villaData.capacity = parsedCapacity;
                } else {
                    res.status(400).json({ message: 'Invalid capacity value' })
                    return
                }
            }

            if (req.body.bathrooms !== undefined) {
                const parsedBathrooms = parseInt(req.body.bathrooms);
                if (!isNaN(parsedBathrooms)) {
                    villaData.bathrooms = parsedBathrooms; // Corregido de capacity a bathrooms
                } else {
                    res.status(400).json({ message: 'Invalid bathrooms value' })
                    return
                }
            }

            if (req.body.rooms !== undefined) {
                const parsedRooms = parseInt(req.body.rooms);
                if (!isNaN(parsedRooms)) {
                    villaData.rooms = parsedRooms; // Corregido de capacity a rooms
                } else {
                    res.status(400).json({ message: 'Invalid rooms value' })
                    return
                }
            }

            if (req.body.price !== undefined) {
                const parsedPrice = parseFloat(req.body.price);
                if (!isNaN(parsedPrice)) {
                    villaData.price = parsedPrice;
                } else {
                    res.status(400).json({ message: 'Invalid price value' })
                    return
                }
            }

            const result = validatePartialVilla(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadPromises = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'villas' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                villaData.images = await Promise.all(uploadPromises)
            }

            const updatedVilla = await VillaModel.updateVilla(Number(id), villaData)
            res.status(200).json(updatedVilla)
        } catch (error: any) {
            console.error('Error in updateVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the villa' })
        }
    }

    static async deleteVilla(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(Number(id))

            if (!villa) {
                res.status(404).json({ message: 'Villa not found' })
                return
            }

            // Eliminar imágenes de Cloudinary
            if (villa.images && Array.isArray(villa.images)) {
                const deletePromises = villa.images.map(async (imageUrl: string) => {
                    const publicId = VillaController.getPublicIdFromUrl(imageUrl)
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

            const result = await VillaModel.deleteVilla(Number(id))

            if (result && typeof result === 'object' && 'success' in result && result.success) {
                res.status(200).json({ message: 'Villa and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting Villa from database' })
            }
        } catch (error: any) {
            console.error('Error in deleteVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while deleting the villa' })
        }
    }

    static getPublicIdFromUrl(url: string): string | null {
        try {
            const parsedUrl = new URL(url)
            const pathnameParts = parsedUrl.pathname.split('/')
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1]
            const filename = path.parse(filenameWithExtension).name
            return `villas/${filename}`
        } catch (error) {
            console.log('Error parsing URL:', error)
            return null
        }
    }
}

export default VillaController 