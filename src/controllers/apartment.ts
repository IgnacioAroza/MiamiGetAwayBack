import { Request, Response } from 'express'
import ApartmentModel, { ApartmentFilters } from '../models/apartment.js'
import { validateApartment, validatePartialApartment, validateApartmentFilters } from '../schemas/apartmentSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'
import { Apartment, CreateApartmentDTO, UpdateApartmentDTO } from '../types/index.js'

class ApartmentController {
    static async getAllApartments(req: Request, res: Response): Promise<void> {
        try {
            const filters: ApartmentFilters = {}

            if (req.query.minPrice !== undefined) {
                const n = Number(req.query.minPrice)
                if (!isNaN(n)) filters.minPrice = n
            }
            if (req.query.maxPrice !== undefined) {
                const n = Number(req.query.maxPrice)
                if (!isNaN(n)) filters.maxPrice = n
            }
            if (req.query.capacity !== undefined) {
                const n = Number(req.query.capacity)
                if (!isNaN(n) && n > 0) filters.capacity = n
            }
            if (req.query.q !== undefined && typeof req.query.q === 'string' && req.query.q.trim() !== '') {
                filters.q = req.query.q.trim()
            }

            // Validar filtros si hay alguno presente
            if (Object.keys(filters).length > 0) {
                const validationResult = validateApartmentFilters(filters);
                if (!validationResult.success) {
                    res.status(400).json({ 
                        message: 'Invalid filters', 
                        error: validationResult.error.flatten() 
                    });
                    return;
                }
            }

            const apartments = await ApartmentModel.getAll(Object.keys(filters).length ? filters : undefined)
            res.status(200).json(apartments)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getApartmentById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const apartment = await ApartmentModel.getApartmentById(Number(id))
            if (apartment) {
                res.status(200).json(apartment)
            } else {
                res.status(404).json({ message: 'Apartment not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createApartment(req: Request, res: Response): Promise<void> {
        try {
            const apartmentData: CreateApartmentDTO = {
                name: req.body.name,
                unitNumber: req.body.unitNumber,
                description: req.body.description,
                address: req.body.address,
                capacity: parseInt(req.body.capacity),
                bathrooms: parseInt(req.body.bathrooms),
                rooms: parseInt(req.body.rooms),
                price: parseFloat(req.body.price),
                images: []
            }

            const result = validateApartment(apartmentData)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const files = req.files as any[];
                const uploadPromises = files.map(file =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'apartments' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                apartmentData.images = await Promise.all(uploadPromises)
            }

            const newApartment = await ApartmentModel.createApartment(apartmentData as unknown as Apartment)
            res.status(201).json(newApartment)
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'An error occurred while creating the apartment' })
        }
    }

    static async updateApartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const apartmentData: UpdateApartmentDTO = {}

            const updatableFields = ['name', 'unitNumber', 'description', 'address', 'capacity', 'bathrooms', 'rooms', 'price'];
            
            // Validar campos numéricos primero, antes de procesar cualquier dato
            for (const field of updatableFields) {
                if (req.body[field] !== undefined) {
                    if (['capacity', 'bathrooms', 'rooms'].includes(field)) {
                        const parsedValue = parseInt(req.body[field]);
                        if (isNaN(parsedValue)) {
                            res.status(400).json({ message: `Valor inválido para ${field}` });
                            return;
                        }
                    } else if (field === 'price') {
                        const parsedPrice = parseFloat(req.body[field]);
                        if (isNaN(parsedPrice)) {
                            res.status(400).json({ message: 'Invalid price value' });
                            return;
                        }
                    }
                }
            }
            
            // Una vez validados, añadir los campos al objeto de datos
            for (const field of updatableFields) {
                if (req.body[field] !== undefined) {
                    if (['capacity', 'bathrooms', 'rooms'].includes(field)) {
                        (apartmentData as any)[field] = parseInt(req.body[field]);
                    } else if (field === 'price') {
                        apartmentData.price = parseFloat(req.body[field]);
                    } else {
                        apartmentData[field as keyof UpdateApartmentDTO] = req.body[field];
                    }
                }
            }
            
            const result = validatePartialApartment(apartmentData)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const files = req.files as any[];
                const uploadPromises = files.map(file =>
                    new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'apartments' },
                            (error: any, result: any) => {
                                if (error) reject(error)
                                else resolve(result.secure_url)
                            }
                        )
                        uploadStream.end(file.buffer)
                    })
                )
                apartmentData.images = await Promise.all(uploadPromises)
            }

            const updatedApartment = await ApartmentModel.updateApartment(Number(id), apartmentData)
            res.status(200).json(updatedApartment)
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'An error occurred while updating the apartment' })
        }
    }

    static async deleteApartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const apartment = await ApartmentModel.getApartmentById(Number(id))

            if (!apartment) {
                res.status(404).json({ message: 'Apartment not found' })
                return
            }

            // Eliminar imágenes de Cloudinary
            if (apartment.images && Array.isArray(apartment.images)) {
                const deletePromises = apartment.images.map(async (imageUrl: string) => {
                    const publicId = ApartmentController.getPublicIdFromUrl(imageUrl)
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

            const result = await ApartmentModel.deleteApartment(Number(id))

            // Verificamos la estructura de la respuesta
            if (result && typeof result === 'object' && 'message' in result) {
                res.status(200).json({ message: 'Apartment and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting apartment from database' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'An error occurred while deleting the apartment' })
        }
    }

    static getPublicIdFromUrl(url: string): string | null {
        try {
            const parsedUrl = new URL(url)
            const pathnameParts = parsedUrl.pathname.split('/')
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1]
            const filename = path.parse(filenameWithExtension).name
            return `apartments/${filename}`
        } catch (error) {
            return null
        }
    }
}

export default ApartmentController
