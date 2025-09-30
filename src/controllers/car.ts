import { Request, Response } from 'express'
import CarModel from '../models/car.js'
import { validateCar, validatePartialCar, validateCarFilters } from '../schemas/carSchema.js'
import ImageService from '../services/imageService.js'
import { Cars, CreateCarsDTO, UpdateCarsDTO, CarFilters } from '../types/index.js'

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
                    res.status(400).json({ 
                        message: 'Invalid filters', 
                        error: validationResult.error.flatten() 
                    });
                    return;
                }
            }

            // Obtener cars con o sin filtros
            const cars = Object.keys(cleanFilters).length > 0 
                ? await CarModel.getCarsWithFilters(cleanFilters)
                : await CarModel.getAll();
                
            res.status(200).json(cars);
        } catch (error: any) {
            console.error('Error in getAllCars:', error);
            res.status(500).json({ error: 'An error occurred while fetching cars' });
        }
    }

    static async getCarById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(Number(id))
            res.status(200).send(car)
        } catch (error: any) {
            res.status(500).send(error.message)
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
                res.status(400).json({ message: 'Invalid car data', errors: result.error.flatten() })
                return
            }

            // Procesar imágenes usando el servicio centralizado
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'cars'
                });

                if (!uploadResult.success) {
                    res.status(400).json({ 
                        error: 'Error uploading images', 
                        details: uploadResult.errors 
                    });
                    return;
                }

                carData.images = uploadResult.urls;
            }

            const newCar = await CarModel.createCar(carData as unknown as Cars)
            res.status(201).json(newCar)
        } catch (error: any) {
            console.error('Error in createCar:', error)
            res.status(500).json({ message: 'Error creating car', error: error.message })
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

            // Manejar price
            if (req.body.price !== undefined) {
                const parsedPrice = typeof req.body.price === 'string' ? parseFloat(req.body.price) : req.body.price;
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                    carData.price = parsedPrice;
                } else {
                    res.status(400).json({ message: 'Invalid price value' });
                    return
                }
            }

            // Manejar passengers
            if (req.body.passengers !== undefined) {
                const parsedPassengers = typeof req.body.passengers === 'string' ? parseInt(req.body.passengers) : req.body.passengers;
                if (!isNaN(parsedPassengers) && parsedPassengers > 0) {
                    carData.passengers = parsedPassengers;
                } else if (req.body.passengers === null || req.body.passengers === '') {
                    carData.passengers = undefined; // Para limpiar el campo
                } else {
                    res.status(400).json({ message: 'Invalid passengers value. Must be a positive integer.' });
                    return
                }
            }

            const result = validatePartialCar(carData) // Cambiar a carData en lugar de req.body

            if (!result.success) {
                res.status(400).json({ message: 'Error updating car', error: result.error.flatten() })
                return
            }

            // Procesar imágenes usando el servicio centralizado
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'cars'
                });

                if (!uploadResult.success) {
                    res.status(400).json({ 
                        error: 'Error uploading images', 
                        details: uploadResult.errors 
                    });
                    return;
                }

                carData.images = uploadResult.urls;
            }

            const updatedCar = await CarModel.updateCar(parseInt(id), carData);
            
            if (updatedCar) {
                res.json(updatedCar);
            } else {
                res.status(404).json({ message: 'Car not found' });
            }
        } catch (error) {
            console.error('Error in updateCar:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async deleteCar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const car = await CarModel.getCarById(Number(id))

            if (!car) {
                res.status(404).json({ message: 'Car not found' })
                return
            }

            // Eliminar imágenes usando el servicio centralizado
            if (car.images && Array.isArray(car.images)) {
                const deleteResult = await ImageService.deleteImages(car.images, 'cars');
                
                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                    // Continuamos con la eliminación del coche aunque algunas imágenes fallen
                }
            }

            const result = await CarModel.deleteCar(Number(id))

            // Verificamos la estructura de la respuesta
            if (result && typeof result === 'object' && 'message' in result) {
                res.status(200).json({ message: 'Car and associated images deleted successfully' })
            } else {
                res.status(500).json({ message: 'Error deleting car from database' })
            }
        } catch (error: any) {
            console.error('Error in deleteCar:', error)
            res.status(500).json({ error: error.message || 'An error occurred while deleting the car' })
        }
    }
}

export default CarController 