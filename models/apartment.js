import db from '../utils/db_render.js'

export default class AparmentModel {
    static async getAll() {
        try {
            const { rows } = await db.query('SELECT * FROM apartments')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getApartmentById(id) {
        try {
            const { rows } = await db.query('SELECT * FROM apartments WHERE id = $1', [id])
            return rows[0]
        } catch (error) {
            throw error
        }
    }

    static async createApartment(apartmentData) {
        const { name, description, address, capacity, price, images } = apartmentData
        const imagesJson = JSON.stringify(images || [])

        try {
            if (!name || !address || capacity === undefined || price === undefined) {
                throw new Error('Missing required fields')
            }

            const safeDescription = description || null

            const { rows } = await db.query(
                'INSERT INTO apartments (name, description, address, capacity, price, images) VALUES ($1, $2, $3, $4, $5, $6);',
                [name, safeDescription, address, capacity, price, imagesJson]
            )
            return { id: rows.insertId, ...apartmentData, images: images || [] }
        } catch (error) {
            console.log('Error creating apartment:', error)
            throw error
        }
    }

    static async updateApartment({ id, apartmentData }) {
        const { name, description, address, capacity, price, images } = apartmentData
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
            const query = `UPDATE apartments SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues)

            const { rows } = await db.query('SELECT * FROM apartments WHERE id = $1', [id])

            if (rows.length > 0) {
                const updatedApartment = rows[0]
                if (updatedApartment.images) {
                    if (typeof updatedApartment.images === 'string') {
                        try {
                            updatedApartment.images = JSON.parse(updatedApartment.images)
                        } catch (error) {
                            console.error('Error parsing images:', error)
                            updatedApartment.images = []
                        }
                    } else if (!Array.isArray(updatedApartment.images)) {
                        updatedApartment.images = []
                    }
                }
                return updatedApartment
            } else {
                return { message: 'Apartment not found' }
            }
        } catch (error) {
            console.log(error)
            throw new Error('Error updating apartment')
        }
    }

    static async deleteApartment(id) {
        try {
            const { rows } = await db.query('DELETE FROM apartments WHERE id = $1 RETURNING *;', [id])

            if (rows.length > 0) {
                return { success: true, message: 'Apartment deleted successfully' }
            } else {
                return { success: false, message: 'Apartment not found' }
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}