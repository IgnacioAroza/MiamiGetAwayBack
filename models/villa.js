import db from '../utils/db_render.js'
import { validateVilla } from '../schemas/villaSchema.js'

export default class VillaModel {
    static async getAll() {
        try {
            const { rows } = await db.query('SELECT * FROM villas')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getVillaById(id) {
        try {
            const { rows } = await db.query('SELECT * FROM villas WHERE id = $1', [id])
            return rows[0]
        } catch (error) {
            throw error
        }
    }

    static async createVilla(villaData) {
        const { name, description, address, capacity, bathrooms, rooms, price, images } = villaData
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

            const { rows } = await db.query(
                'INSERT INTO villas (name, description, address, capacity, bathrooms, rooms, price, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);',
                [name, safeDescription, address, capacity, bathrooms, rooms, price, imagesJson]
            )
            return { id: rows.insertId, ...villaData, images: images || [] }
        } catch (error) {
            console.log('Error creating villa:', error)
            throw error
        }
    }

    static async updateVilla({ id, villaData }) {
        const { name, description, address, capacity, bathrooms, rooms, price, images } = villaData
        const updateFields = []
        const updatedValues = []
        let paramCount = 1

        if (name !== undefined) {
            updateFields.push(`name = $${paramCount++}`)
            updatedValues.push(name)
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramCount++}`)
            updatedValues.push(description)
        }
        if (address !== undefined) {
            updateFields.push(`address = $${paramCount++}`)
            updatedValues.push(address)
        }
        if (capacity !== undefined) {
            updateFields.push(`capacity = $${paramCount++}`)
            updatedValues.push(capacity)
        }
        if (bathrooms !== undefined) {
            updateFields.push(`bathrooms = $${paramCount++}`)
            updatedValues.push(bathrooms)
        }
        if (rooms !== undefined) {
            updateFields.push(`rooms = $${paramCount++}`)
            updatedValues.push(rooms)
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
            const query = `UPDATE villas SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues)

            const { rows } = await db.query('SELECT * FROM villas WHERE id = $1;', [id])

            if (rows.length > 0) {
                const updatedVilla = rows[0]
                if (updatedVilla.images) {
                    if (typeof updatedVilla.imiages === 'string') {
                        try {
                            updatedVilla.images = JSON.parse(updatedVilla.images)
                        } catch (error) {
                            console.error('Error parsing images:', error)
                            updatedVilla.images = []
                        }
                    } else if (!Array.isArray(updatedVilla.images)) {
                        updatedVilla.images = []
                    }
                }
                return updatedVilla
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
            const { rows } = await db.query('DELETE FROM villas WHERE id = $1 RETURNING *;', [id])

            if (rows.length > 0) {
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