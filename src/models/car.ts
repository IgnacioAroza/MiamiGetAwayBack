import db from '../utils/db_render.js';
import { Cars, CarFilters } from '../types/index.js';
import { validateCar } from '../schemas/carSchema.js';
import { PaginationParams } from '../utils/pagination.js';
import { normalizeImageArray } from '../utils/imageUtils.js';

export default class CarModel {
    private static processCarImages(rows: any[]): Cars[] {
        return rows.map(car => {
            if (typeof car.images === 'string') {
                try { car.images = normalizeImageArray(JSON.parse(car.images)); }
                catch { car.images = []; }
            } else if (Array.isArray(car.images)) {
                car.images = normalizeImageArray(car.images);
            } else {
                car.images = [];
            }
            return car;
        });
    }

    static async getAll(pagination?: PaginationParams): Promise<{ rows: Cars[], total: number }> {
        try {
            const base = 'SELECT * FROM cars ORDER BY id ASC';
            if (pagination) {
                const [data, count] = await Promise.all([
                    db.query(base + ' LIMIT $1 OFFSET $2', [pagination.limit, pagination.offset]),
                    db.query('SELECT COUNT(*) FROM cars'),
                ]);
                return { rows: this.processCarImages(data.rows), total: parseInt(count.rows[0].count) };
            }
            const { rows } = await db.query(base);
            return { rows: this.processCarImages(rows), total: rows.length };
        } catch (error) {
            throw error;
        }
    }

    static async getCarsWithFilters(filters: CarFilters, pagination?: PaginationParams): Promise<{ rows: Cars[], total: number }> {
        try {
            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (filters.minPrice !== undefined) {
                queryParams.push(filters.minPrice);
                conditions.push(`price >= $${queryParams.length}`);
            }
            if (filters.maxPrice !== undefined) {
                queryParams.push(filters.maxPrice);
                conditions.push(`price <= $${queryParams.length}`);
            }
            if (filters.passengers !== undefined) {
                queryParams.push(filters.passengers);
                conditions.push(`passengers >= $${queryParams.length}`);
            }

            const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

            if (pagination) {
                const [data, count] = await Promise.all([
                    db.query(`SELECT * FROM cars${whereClause} ORDER BY id ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`, [...queryParams, pagination.limit, pagination.offset]),
                    db.query(`SELECT COUNT(*) FROM cars${whereClause}`, queryParams),
                ]);
                return { rows: this.processCarImages(data.rows), total: parseInt(count.rows[0].count) };
            }
            const { rows } = await db.query(`SELECT * FROM cars${whereClause} ORDER BY id ASC`, queryParams);
            return { rows: this.processCarImages(rows), total: rows.length };
        } catch (error) {
            throw error;
        }
    }
    
    static async getCarById(id: number): Promise<Cars | null> {
        try {
            const { rows } = await db.query('SELECT * FROM cars WHERE id = $1', [id])
            if (rows[0]) {
                const car = rows[0];
                if (typeof car.images === 'string') {
                    try {
                        car.images = normalizeImageArray(JSON.parse(car.images));
                    } catch (error) {
                        console.error('Error parsing car images:', error);
                        car.images = [];
                    }
                } else if (Array.isArray(car.images)) {
                    car.images = normalizeImageArray(car.images);
                } else {
                    car.images = [];
                }
                return car;
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
                // Normalizar imágenes
                if (typeof updatedCar.images === 'string') {
                    try {
                        updatedCar.images = normalizeImageArray(JSON.parse(updatedCar.images));
                    } catch (error) {
                        console.error('Error parsing car images:', error);
                        updatedCar.images = [];
                    }
                } else if (Array.isArray(updatedCar.images)) {
                    updatedCar.images = normalizeImageArray(updatedCar.images);
                } else {
                    updatedCar.images = [];
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
