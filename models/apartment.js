import db from '../utils/db.js'
import { validateApartment } from '../schemas/apartmentSchema.js'

export default class AparmentModel {
    static async getAll() {
        try {
            const [rows] = await db.execute('SELECT * FROM apartments')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getApartmentById(id) {
        try {
            const [rows] = await db.execute('SELECT * FROM apartments WHERE id = ?', [id])
            return rows[0]
        } catch (error) {
            throw error
        }
    }

    static async createApartment(body) {
        const { name, description, address, capacity, price, images } = body
        const validateResult = validateApartment(body)

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
                'INSERT INTO apartments (name, description, address, capacity, price, images) VALUES (?, ?, ?, ?, ?, ?);',
                [name, safeDescription, address, capacity, price, safeImages]
            )

            if (result.affectedRows === 1) {
                const [apartments] = await db.execute('SELECT * FROM apartments WHERE id = LAST_INSERT_ID();')
                return apartments[0]
            } else {
                throw new Error('Error creating apartment')
            }
        } catch (error) {
            console.log('Error creating apartment:', error)
            throw error
        }
    }

    static async updateApartment({ id, input }) {
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
            const [result] = await db.execute(`UPDATE apartments SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                return { message: 'Apartment updated successfully' }
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
            const [result] = await db.execute('DELETE FROM apartments WHERE id = ?;', [id])

            if (result.affectedRows > 0) {
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