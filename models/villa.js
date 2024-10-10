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

    static async createVilla(villaData) {
        const { name, description, address, capacity, price, images } = villaData
        const imagesJson = JSON.stringify(images || [])

        const validateResult = validateVilla(villaData)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!name || !address || capacity === undefined || price === undefined) {
                throw new Error('Missing required fields')
            }

            const safeDescription = description || null

            const [result] = await db.execute(
                'INSERT INTO villas (name, description, address, capacity, price, images) VALUES (?, ?, ?, ?, ?, ?);',
                [name, safeDescription, address, capacity, price, imagesJson]
            )
            return { id: result.insertId, ...villaData, images: images || [] }
        } catch (error) {
            console.log('Error creating villa:', error)
            throw error
        }
    }

    static async updateVilla({ id, villaData }) {
        const { name, description, address, capacity, price, images } = villaData
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
            updatedValues.push(JSON.stringify(villaData.images))
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const [result] = await db.execute(`UPDATE villas SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                const [updatedVilla] = await db.execute('SELECT * FROM villas WHERE id = ?;', [id])
                if (updatedVilla[0].images !== null && updatedVilla[0].images !== undefined) {
                    updatedVilla[0].images = updatedVilla[0].images
                }
                return updatedVilla[0]
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