import db from '../utils/db_render.js';
import { Cars, CarFilters } from '../types/index.js';
import { validateCar } from '../schemas/carSchema.js';

export default class CarModel {
    static async getAll(): Promise<Cars[]> {
        try {
            const { rows } = await db.query('SELECT * FROM cars');
            return rows.map(car => {
                if (typeof car.images === 'string') {
                    try {
                        car.images = JSON.parse(car.images)
                    } catch (error) {
                        car.images = []
                    }
                } else if (!Array.isArray(car.images)) {
                    car.images = []
                }
                return car
            })
        } catch (error) {
            throw error
        }
    }

    static async getCarsWithFilters(filters: CarFilters): Promise<Cars[]> {
        try {
            let query = 'SELECT * FROM cars WHERE 1=1';
            const queryParams: any[] = [];
            let paramCount = 1;

            // Filtro por precio mínimo
            if (filters.minPrice !== undefined) {
                query += ` AND price >= $${paramCount++}`;
                queryParams.push(filters.minPrice);
            }

            // Filtro por precio máximo
            if (filters.maxPrice !== undefined) {
                query += ` AND price <= $${paramCount++}`;
                queryParams.push(filters.maxPrice);
            }

            // Filtro por cantidad de pasajeros
            if (filters.passengers !== undefined) {
                query += ` AND passengers >= $${paramCount++}`;
                queryParams.push(filters.passengers);
            }

            query += ' ORDER BY id ASC';

            const { rows } = await db.query(query, queryParams);
            
            return rows.map(car => {
                if (typeof car.images === 'string') {
                    try {
                        car.images = JSON.parse(car.images);
                    } catch (error) {
                        car.images = [];
                    }
                } else if (!Array.isArray(car.images)) {
                    car.images = [];
                }
                return car;
            });
        } catch (error) {
            throw error;
        }
    }
    
    static async getCarById(id: number): Promise<Cars | null> {
        try {
            const { rows } = await db.query('SELECT * FROM cars WHERE id = $1', [id])
            if (rows[0]) {
                if (typeof rows[0].images === 'string') {
                    try {
                        rows[0].images = JSON.parse(rows[0].images)
                    } catch (error) {
                        rows[0].images = []
                    }
                } else if (!Array.isArray(rows[0].images)) {
                    rows[0].images = []
                }
                return rows[0]
            }
            return null
        } catch (error) {
            throw error
        }
    }

    static async createCar(carData: Cars): Promise<Cars> {
        const { brand, model, price, description, passengers, images } = carData
        const imagesJson = JSON.stringify(images || [])

        const validateResult = validateCar(carData)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            const { rows } = await db.query(
                'INSERT INTO cars (brand, model, price, description, passengers, images) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;',
                [brand, model, price, description, passengers || null, imagesJson]
            )
            const { id, ...dataWithoutId } = carData
            return { id: rows[0].id, ...dataWithoutId, images: images || [], passengers: passengers || undefined }
        } catch (error) {
            throw error
        }
    }

    static async updateCar(id: number, carData: Partial<Cars>): Promise<Cars> {
        const { brand, model, description, price, passengers, images } = carData
        const updateFields = []
        const updatedValues = []
        let paramCount = 1

        if (brand !== undefined) {
            updateFields.push(`brand = $${paramCount++}`)
            updatedValues.push(brand)
        }
        if (model !== undefined) {
            updateFields.push(`model = $${paramCount++}`)
            updatedValues.push(model)
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramCount++}`)
            updatedValues.push(description)
        }
        if (price !== undefined) {
            updateFields.push(`price = $${paramCount++}`)
            updatedValues.push(price)
        }
        if (passengers !== undefined) {
            updateFields.push(`passengers = $${paramCount++}`)
            updatedValues.push(passengers)
        }
        if (images !== undefined) {
            updateFields.push(`images = $${paramCount++}`)
            updatedValues.push(JSON.stringify(images))
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const query = `UPDATE cars SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues)
            
            const { rows } = await db.query('SELECT * FROM cars WHERE id = $1', [id])

            if (rows.length > 0) {
                const updatedCar = rows[0]
                if (updatedCar.images) {
                    if (typeof updatedCar.images === 'string') {
                        try {
                            updatedCar.images = JSON.parse(updatedCar.images)
                        } catch (error) {
                            console.error('Error parsing images:', error)
                            updatedCar.images = []
                        }
                    } else if (!Array.isArray(updatedCar.images)) {
                        updatedCar.images = []
                    }
                }
                return updatedCar
            } else {
                throw new Error('Car not found')
            }
        } catch (error) {
            throw new Error('Error updating car')
        }
    }

    static async deleteCar(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM cars WHERE id = $1 RETURNING *;', [id])

            if (rows.length > 0) {
                return { message: 'Car deleted successfully' }
            } else {
                throw new Error('Car not found')
            }
        } catch (error) {
            throw new Error('Error deleting car')
        }
    }
}
