import db from '../utils/db.js'
import { validateYacht } from '../schemas/yachtSchema.js'

export default class YachtModel {
    static async getAll() {
        try {
            const [rows] = await db.execute('SELECT * FROM yachts')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getYachtById(id) {
        try {
            const [rows] = await db.execute('SELECT * FROM yachts WHERE id = ?', [id])
            return rows[0]
        } catch (error) {
            throw error
        }
    }

    static async createYacht(body) {
        const { name, description, capacity, price, images } = body
        const validateResult = validateYacht(body)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!name || capacity === undefined || price === undefined) {
                throw new Error('Missing required fields')
            }

            const safeDescription = description || null
            const safeImages = images ? JSON.stringify(images) : null

            const [result] = await db.execute(
                'INSERT INTO yachts (name, description, capacity, price, images) VALUES (?, ?, ?, ?, ?);',
                [name, safeDescription, capacity, price, safeImages]
            )

            if (result.affectedRows === 1) {
                const [yachts] = await db.execute('SELECT * FROM yachts WHERE id = LAST_INSERT_ID();')
                return yachts[0]
            } else {
                throw new Error('Error creating yacht')
            }
        } catch (error) {
            console.log('Error creating yacht:', error)
            throw error
        }
    }

    static async updateYacht({ id, input }) {
        const { name, description, capacity, price, images } = input
        const updateFields = []
        const updatedValues = []

        if (name !== undefined) {
            updateFields.push('name = ?')
            updatedValues.push(name)
        }
        if (description !== undefined) {
            updateFields.push('description = ?')
            updatedValues.push(description)
        }
        if (capacity !== undefined) {
            updateFields.push('capacity = ?')
            updatedValues.push(capacity)
        }
        if (price !== undefined) {
            updateFields.push('price = ?')
            updatedValues.push(price)
        }
        if (images !== undefined) {
            updateFields.push('images = ?')
            updatedValues.push(JSON.stringify(images))
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const [result] = await db.execute(`UPDATE yachts SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                return { message: 'Yacht updated successfully' }
            } else {
                return { message: 'Yacht not found' }
            }
        } catch (error) {
            console.log(error)
            throw new Error('Error updating yacht')
        }
    }

    static async deleteYacht(id) {
        try {
            const [result] = await db.execute('DELETE FROM yachts WHERE id = ?;', [id])

            if (result.affectedRows > 0) {
                return { success: true, message: 'Yacht deleted successfully' }
            } else {
                return { success: false, message: 'Yacht not found' }
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}