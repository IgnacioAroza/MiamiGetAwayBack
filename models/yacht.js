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

    static async createYacht(yachtData) {
        const { name, description, capacity, price, images } = yachtData
        const imagesJson = JSON.stringify(images || [])
        const validateResult = validateYacht(yachtData)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!name || capacity === undefined || price === undefined) {
                throw new Error('Missing required fields')
            }

            const safeDescription = description || null

            const [result] = await db.execute(
                'INSERT INTO yachts (name, description, capacity, price, images) VALUES (?, ?, ?, ?, ?);',
                [name, safeDescription, capacity, price, imagesJson]
            )
            return { id: result.insertId, ...yachtData, images: images || [] }
        } catch (error) {
            console.log('Error creating yacht:', error)
            throw error
        }
    }

    static async updateYacht({ id, yachtData }) {
        const { name, description, capacity, price, images } = yachtData
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
            updatedValues.push(JSON.stringify(yachtData.images))
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const [result] = await db.execute(`UPDATE yachts SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                const [updatedYacht] = await db.execute('SELECT * FROM yachts WHERE id = ?;', [id])
                if (updatedYacht[0].images !== null && updatedYacht[0].images !== undefined) {
                    updatedYacht[0].images = updatedYacht[0].images
                }
                return updatedYacht[0]
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