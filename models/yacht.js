import db from '../utils/db_render.js'
import { validateYacht } from '../schemas/yachtSchema.js'

export default class YachtModel {
    static async getAll() {
        try {
            const { rows } = await db.query('SELECT * FROM yachts')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getYachtById(id) {
        try {
            const { rows } = await db.query('SELECT * FROM yachts WHERE id = $1', [id])
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

            const { rows } = await db.query(
                'INSERT INTO yachts (name, description, capacity, price, images) VALUES ($1, $2, $3, $4, $5);',
                [name, safeDescription, capacity, price, imagesJson]
            )
            return { id: rows.insertId, ...yachtData, images: images || [] }
        } catch (error) {
            console.log('Error creating yacht:', error)
            throw error
        }
    }

    static async updateYacht({ id, yachtData }) {
        const { name, description, capacity, price, images } = yachtData
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
        if (capacity !== undefined) {
            updateFields.push(`capacity = $${paramCount++}`)
            updatedValues.push(capacity)
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
            const query = `UPDATE yachts SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues)

            const { rows } = await db.query('SELECT * FROM yachts WHERE id = $1;', [id])

            if (rows.length > 0) {
                const updatedYacht = rows[0]
                if (updatedYacht.images) {
                    if (typeof updatedYacht.images === 'string') {
                        try {
                            updatedYacht.images = JSON.parse(updatedYacht.images)
                        } catch (error) {
                            console.error('Error parsing images:', error)
                            updatedYacht.images = []
                        }
                    } else if (!Array.isArray(updatedYacht.images)) {
                        updatedYacht.images = []
                    }
                }
                return updatedYacht
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
            const { rows } = await db.query('DELETE FROM yachts WHERE id = $1 RETURNING *;', [id])

            if (rows.length > 0) {
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