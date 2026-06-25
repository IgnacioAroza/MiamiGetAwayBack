import { Request, Response } from 'express'
import ApartmentModel, { ApartmentFilters } from '../models/apartment.js'
import { validateApartment, validatePartialApartment, validateApartmentFilters } from '../schemas/apartmentSchema.js'
import ImageService from '../services/imageService.js'
import { Apartment, CreateApartmentDTO, UpdateApartmentDTO } from '../types/index.js'
import { parsePagination, paginatedResponse } from '../utils/pagination.js'
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js'

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
                    badRequest(res, 'Invalid filters', validationResult.error.flatten());
                    return;
                }
            }

            const pagination = parsePagination(req.query);
            const { rows, total } = await ApartmentModel.getAll(Object.keys(filters).length ? filters : undefined, pagination ?? undefined);
            const optimizedApartments = rows.map(apartment => {
                if (apartment.images && Array.isArray(apartment.images)) {
                    return { ...apartment, images: ImageService.optimizeForContext(apartment.images, 'list').images };
                }
                return apartment;
            });
            if (pagination) {
                ok(res, paginatedResponse(optimizedApartments, total, pagination));
            } else {
                ok(res, optimizedApartments);
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async getApartmentById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const apartment = await ApartmentModel.getApartmentById(Number(id))
            if (apartment) {
                if (apartment.images && Array.isArray(apartment.images)) {
                    const optimizedImages = ImageService.optimizeForContext(apartment.images, 'detail');
                    ok(res, {
                        ...apartment,
                        images: optimizedImages.images,
                        responsiveImages: optimizedImages.responsiveImages
                    });
                } else {
                    ok(res, apartment);
                }
            } else {
                notFound(res, 'Apartment not found')
            }
        } catch (error: any) {
            serverError(res, error.message)
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
                badRequest(res, JSON.parse(result.error.message))
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'apartments'
                });

                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }

                apartmentData.images = uploadResult.urls;
            }

            const newApartment = await ApartmentModel.createApartment(apartmentData as unknown as Apartment)
            created(res, newApartment)
        } catch (error: any) {
            console.error('Error in createApartment:', error)
            serverError(res, error.message || 'An error occurred while creating the apartment')
        }
    }

    static async updateApartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const apartmentData: UpdateApartmentDTO = {}

            const updatableFields = ['name', 'unitNumber', 'description', 'address', 'capacity', 'bathrooms', 'rooms', 'price'];

            for (const field of updatableFields) {
                if (req.body[field] !== undefined) {
                    if (['capacity', 'bathrooms', 'rooms'].includes(field)) {
                        const parsedValue = parseInt(req.body[field]);
                        if (isNaN(parsedValue)) {
                            badRequest(res, `Valor inválido para ${field}`);
                            return;
                        }
                    } else if (field === 'price') {
                        const parsedPrice = parseFloat(req.body[field]);
                        if (isNaN(parsedPrice)) {
                            badRequest(res, 'Invalid price value');
                            return;
                        }
                    }
                }
            }

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
                badRequest(res, JSON.parse(result.error.message))
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'apartments'
                });

                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }

                apartmentData.images = uploadResult.urls;
            }

            const updatedApartment = await ApartmentModel.updateApartment(Number(id), apartmentData)
            ok(res, updatedApartment)
        } catch (error: any) {
            console.error('Error in updateApartment:', error)
            serverError(res, error.message || 'An error occurred while updating the apartment')
        }
    }

    static async deleteApartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const apartment = await ApartmentModel.getApartmentById(Number(id))

            if (!apartment) {
                notFound(res, 'Apartment not found')
                return
            }

            if (apartment.images && Array.isArray(apartment.images)) {
                const deleteResult = await ImageService.deleteImages(apartment.images, 'apartments');

                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                }
            }

            await ApartmentModel.deleteApartment(Number(id))

            ok(res, { message: 'Apartment and associated images deleted successfully' })
        } catch (error: any) {
            console.error('Error in deleteApartment:', error)
            serverError(res, error.message || 'An error occurred while deleting the apartment')
        }
    }
}

export default ApartmentController
