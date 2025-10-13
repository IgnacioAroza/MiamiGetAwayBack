import { Request, Response } from 'express'
import ApartmentModel, { ApartmentFilters } from '../models/apartment.js'
import { validateApartment, validatePartialApartment, validateApartmentFilters } from '../schemas/apartmentSchema.js'
import ImageService from '../services/imageService.js'
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
            
            // Optimizar imágenes para listado (contexto 'list')
            const optimizedApartments = apartments.map(apartment => {
                if (apartment.images && Array.isArray(apartment.images)) {
                    const optimizedImages = ImageService.optimizeForContext(apartment.images, 'list');
                    return {
                        ...apartment,
                        images: optimizedImages.images // URLs optimizadas para listado
                    };
                }
                return apartment;
            });

            res.status(200).json(optimizedApartments)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getApartmentById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const apartment = await ApartmentModel.getApartmentById(Number(id))
            if (apartment) {
                // Optimizar imágenes para vista detalle (contexto 'detail')
                if (apartment.images && Array.isArray(apartment.images)) {
                    const optimizedImages = ImageService.optimizeForContext(apartment.images, 'detail');
                    const apartmentWithOptimizedImages = {
                        ...apartment,
                        images: optimizedImages.images, // URLs principales optimizadas
                        responsiveImages: optimizedImages.responsiveImages // Todas las variantes de tamaño
                    };
                    res.status(200).json(apartmentWithOptimizedImages);
                } else {
                    res.status(200).json(apartment);
                }
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

            // Procesar imágenes usando el servicio centralizado
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'apartments'
                });

                if (!uploadResult.success) {
                    res.status(400).json({ 
                        error: 'Error uploading images', 
                        details: uploadResult.errors 
                    });
                    return;
                }

                apartmentData.images = uploadResult.urls;
            }

            const newApartment = await ApartmentModel.createApartment(apartmentData as unknown as Apartment)
            res.status(201).json(newApartment)
        } catch (error: any) {
            console.error('Error in createApartment:', error)
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

            // Procesar imágenes usando el servicio centralizado
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'apartments'
                });

                if (!uploadResult.success) {
                    res.status(400).json({ 
                        error: 'Error uploading images', 
                        details: uploadResult.errors 
                    });
                    return;
                }

                apartmentData.images = uploadResult.urls;
            }

            const updatedApartment = await ApartmentModel.updateApartment(Number(id), apartmentData)
            res.status(200).json(updatedApartment)
        } catch (error: any) {
            console.error('Error in updateApartment:', error)
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

            // Eliminar imágenes usando el servicio centralizado
            if (apartment.images && Array.isArray(apartment.images)) {
                const deleteResult = await ImageService.deleteImages(apartment.images, 'apartments');
                
                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                    // Continuamos con la eliminación del apartamento aunque algunas imágenes fallen
                }
            }

            const result = await ApartmentModel.deleteApartment(Number(id))

            // Verificamos la estructura de la respuesta
            if (result && typeof result === 'object' && 'message' in result) {
                res.status(200).json({ message: 'Apartment and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting apartment from database' })
            }
        } catch (error: any) {
            console.error('Error in deleteApartment:', error)
            res.status(500).json({ error: error.message || 'An error occurred while deleting the apartment' })
        }
    }
}

export default ApartmentController
