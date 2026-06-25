import { Request, Response } from 'express'
import CarModel from '../models/car.js'
import { validateCar, validatePartialCar, validateCarFilters } from '../schemas/carSchema.js'
import ImageService from '../services/imageService.js'
import { Cars, CreateCarsDTO, UpdateCarsDTO, CarFilters } from '../types/index.js'
import { parsePagination, paginatedResponse } from '../utils/pagination.js'
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js'

class CarController {
    static async getAllCars(req: Request, res: Response): Promise<void> {
        try {
            // Extraer parámetros de query para filtros
            const filters: CarFilters = {
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
                passengers: req.query.passengers ? parseInt(req.query.passengers as string) : undefined,
            };

            // Limpiar filtros undefined
            const cleanFilters: CarFilters = {};
            if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
                cleanFilters.minPrice = filters.minPrice;
            }
            if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
                cleanFilters.maxPrice = filters.maxPrice;
            }
            if (filters.passengers !== undefined && !isNaN(filters.passengers)) {
                cleanFilters.passengers = filters.passengers;
            }

            // Validar filtros si hay alguno presente
            if (Object.keys(cleanFilters).length > 0) {
                const validationResult = validateCarFilters(cleanFilters);
                if (!validationResult.success) {
                    badRequest(res, 'Invalid filters', validationResult.error.flatten());
                    return;
                }
            }

            const pagination = parsePagination(req.query);
            const { rows, total } = Object.keys(cleanFilters).length > 0
                ? await CarModel.getCarsWithFilters(cleanFilters, pagination ?? undefined)
                : await CarModel.getAll(pagination ?? undefined);

            const optimizedCars = rows.map(car => {
                if (car.images && Array.isArray(car.images)) {
                    return { ...car, images: ImageService.optimizeForContext(car.images, 'list').images };
                }
                return car;
            });

            if (pagination) {
                ok(res, paginatedResponse(optimizedCars, total, pagination));
            } else {
                ok(res, optimizedCars);
            }
        } catch (error: any) {
            console.error('Error in getAllCars:', error);
            serverError(res, 'An error occurred while fetching cars');
        }
    }

    static async getCarById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(Number(id))

            if (car) {
                if (car.images && Array.isArray(car.images)) {
                    const optimizedImages = ImageService.optimizeForContext(car.images, 'detail');
                    ok(res, {
                        ...car,
                        images: optimizedImages.images,
                        responsiveImages: optimizedImages.responsiveImages
                    });
                } else {
                    ok(res, car);
                }
            } else {
                notFound(res, 'Car not found');
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async createCar(req: Request, res: Response): Promise<void> {
        try {
            const carData: CreateCarsDTO = {
                brand: req.body.brand,
                model: req.body.model,
                price: typeof req.body.price === 'string' ? parseFloat(req.body.price) : req.body.price,
                description: req.body.description,
                passengers: req.body.passengers ?
                    (typeof req.body.passengers === 'string' ? parseInt(req.body.passengers) : req.body.passengers)
                    : undefined,
                images: []
            }

            const result = validateCar(carData)
            if (!result.success) {
                badRequest(res, 'Invalid car data', result.error.flatten())
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'cars'
                });

                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }

                carData.images = uploadResult.urls;
            }

            const newCar = await CarModel.createCar(carData as unknown as Cars)
            created(res, newCar)
        } catch (error: any) {
            console.error('Error in createCar:', error)
            serverError(res, error.message || 'Error creating car')
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
                const parsedPrice = typeof req.body.price === 'string' ? parseFloat(req.body.price) : req.body.price;
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                    carData.price = parsedPrice;
                } else {
                    badRequest(res, 'Invalid price value');
                    return
                }
            }

            if (req.body.passengers !== undefined) {
                const parsedPassengers = typeof req.body.passengers === 'string' ? parseInt(req.body.passengers) : req.body.passengers;
                if (!isNaN(parsedPassengers) && parsedPassengers > 0) {
                    carData.passengers = parsedPassengers;
                } else if (req.body.passengers === null || req.body.passengers === '') {
                    carData.passengers = undefined;
                } else {
                    badRequest(res, 'Invalid passengers value. Must be a positive integer.');
                    return
                }
            }

            const result = validatePartialCar(carData)

            if (!result.success) {
                badRequest(res, 'Error updating car', result.error.flatten())
                return
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'cars'
                });

                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }

                carData.images = uploadResult.urls;
            }

            const updatedCar = await CarModel.updateCar(parseInt(id), carData);

            if (updatedCar) {
                ok(res, updatedCar);
            } else {
                notFound(res, 'Car not found');
            }
        } catch (error) {
            console.error('Error in updateCar:', error);
            serverError(res, 'Internal server error');
        }
    }

    static async deleteCar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(Number(id))

            if (!car) {
                notFound(res, 'Car not found')
                return
            }

            if (car.images && Array.isArray(car.images)) {
                const deleteResult = await ImageService.deleteImages(car.images, 'cars');

                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                }
            }

            await CarModel.deleteCar(Number(id))

            ok(res, { message: 'Car and associated images deleted successfully' })
        } catch (error: any) {
            console.error('Error in deleteCar:', error)
            serverError(res, error.message || 'An error occurred while deleting the car')
        }
    }
}

export default CarController 