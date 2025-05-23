import db from '../utils/db_render.js';
import { Cars } from '../types/index.js';
import { validateCar } from '../schemas/carSchema.js';

export default class CarModel {
    static async getAll(): Promise<Cars[]> {
        try {
            const { rows } = await db.query('SELECT * FROM cars');
            return rows.map(car => {
                try {
                    car.images = JSON.parse(car.images)
                } catch (error) {
                    car.images = car.images ? [car.images] : []
                }
                return car
            })
        } catch (error) {
            throw error
        }
    }
    
    static async getCarById(id: number): Promise<Cars | null> {
        try {
            const { rows } = await db.query('SELECT * FROM cars WHERE id = $1', [id])
            if (rows[0]) {
                try {
                    rows[0].images = JSON.parse(rows[0].images)
                } catch (error) {
                    rows[0].images = rows[0].images ? [rows[0].images] : []
                }
                return rows[0]
            }
            return null
        } catch (error) {
            throw error
        }
    }

    static async createCar(carData: Cars): Promise<Cars> {
        const { brand, model, price, description, images } = carData
        const imagesJson = JSON.stringify(images || [])

        const validateResult = validateCar(carData)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            const { rows } = await db.query(
                'INSERT INTO cars (brand, model, price, description, images) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
                [brand, model, price, description, imagesJson]
            )
            const { id, ...dataWithoutId } = carData
            return { id: rows[0].id, ...dataWithoutId, images: images || [] }
        } catch (error) {
            throw error
        }
    }

    static async updateCar(id: number, carData: Partial<Cars>): Promise<Cars> {
        const { brand, model, description, price, images } = carData
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
