import db from '../utils/db.js'
import { validateVilla } from '../schemas/villaSchema.js'

export default class VillaModel {
    static async getAll() {
        try {
            const [rows] = await db.execute('SELECT * FROM villas')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getVillaById(id) {
        try {
            const [rows] = await db.execute('SELECT * FROM villas WHERE id = ?', [id])
            return rows[0]
        } catch (error) {
            throw error
        }
    }

    static async createVilla(body) {
        const { name, description, address, capacity, price, images } = body
        const validateResult = validateVilla(body)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!name || !address || capacity === undefined || price === undefined) {
                throw new Error('Missing required fields')
            }

            const safeDescription = description || null
            const safeImages = images ? JSON.stringify(images) : null

            const [result] = await db.execute(
                'INSERT INTO villas (name, description, address, capacity, price, images) VALUES (?, ?, ?, ?, ?, ?);',
                [name, safeDescription, address, capacity, price, safeImages]
            )

            if (result.affectedRows === 1) {
                const [villas] = await db.execute('SELECT * FROM villas WHERE id = LAST_INSERT_ID();')
                return villas[0]
            } else {
                throw new Error('Error creating villa')
            }
        } catch (error) {
            console.log('Error creating villa:', error)
            throw error
        }
    }

    static async updateVilla({ id, input }) {
        const { name, description, address, capacity, price, images } = input
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
        if (address !== undefined) {
            updateFields.push('address = ?')
            updatedValues.push(address)
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
            const [result] = await db.execute(`UPDATE villas SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                return { message: 'Villa updated successfully' }
            } else {
                return { message: 'Villa not found' }
            }
        } catch (error) {
            console.log(error)
            throw new Error('Error updating villa')
        }
    }

    static async deleteVilla(id) {
        try {
            const [result] = await db.execute('DELETE FROM villas WHERE id = ?;', [id])

            if (result.affectedRows > 0) {
                return { success: true, message: 'Villa deleted successfully' }
            } else {
                return { success: false, message: 'Villa not found' }
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}