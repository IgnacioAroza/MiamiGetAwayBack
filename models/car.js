import db from '../utils/db.js'
import { validateCar } from '../schemas/carSchema.js'

export default class CarModel {
    static async getAll() {
        try {
            const [rows] = await db.execute('SELECT * FROM cars')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getCarById(id) {
        try {
            const [rows] = await db.execute('SELECT * FROM cars WHERE id = ?', [id])
            return rows[0]
        } catch (error) {
            throw error
        }
    }

    static async createCar(body) {
        const { brand, model, description, price, images } = body
        const validateResult = validateCar(body)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!brand || !model || price === undefined) {
                throw new Error('Missing required fields')
            }

            const safeDescription = description || null
            const safeImages = images ? JSON.stringify(images) : null

            const [result] = await db.execute('INSERT INTO cars (brand, model,description, price, images) VALUES (?, ?, ?, ?, ?);', [brand, model, safeDescription, price, safeImages])

            if (result.affectedRows === 1) {
                const [cars] = await db.execute('SELECT * FROM cars WHERE id = LAST_INSERT_ID();')
                return cars[0]
            } else {
                throw new Error('Error creating car')
            }
        } catch (error) {
            console.log('Error creating car:', error)
            throw new Error('Error:', error)
        }
    }

    static async updateCar({ id, input }) {
        const { brand, model, description, price, images } = input
        const updateFields = []
        const updatedValues = []

        if (brand !== undefined) {
            updateFields.push('brand = ?')
            updatedValues.push(brand)
        }
        if (model !== undefined) {
            updateFields.push('model = ?')
            updatedValues.push(model)
        }
        if (description !== undefined) {
            updateFields.push('description = ?')
            updatedValues.push(description)
        }
        if (price !== undefined) {
            updateFields.push('price = ?')
            updatedValues.push(price)
        }
        if (images !== undefined) {
            updateFields.push('images = ?')
            updatedValues.push(images)
        }
        if (updateFields === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const [result] = await db.execute(`UPDATE cars SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                return { message: 'Car updated successfully' }
            } else {
                return { message: 'Car not found' }
            }
        } catch (error) {
            console.log(error)
            throw new Error('Error updating car')
        }
    }

    static async deleteCar(id) {
        try {
            const [result] = await db.execute('DELETE FROM cars WHERE id = ?;', [id])

            if (result.affectedRows > 0) {
                return { success: true, message: 'Car deleted successfully' }
            } else {
                return { success: false, message: 'Car not found' }
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}