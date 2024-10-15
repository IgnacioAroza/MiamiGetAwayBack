import db from '../utils/db.js'

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

    static async createApartment(apartmentData) {
        const { name, description, address, capacity, price, images } = apartmentData
        const imagesJson = JSON.stringify(images || [])

        try {
            if (!name || !address || capacity === undefined || price === undefined) {
                throw new Error('Missing required fields')
            }

            const safeDescription = description || null

            const [result] = await db.query(
                'INSERT INTO apartments (name, description, address, capacity, price, images) VALUES (?, ?, ?, ?, ?, ?);',
                [name, safeDescription, address, capacity, price, imagesJson]
            )
            return { id: result.insertId, ...apartmentData, images: images || [] }
        } catch (error) {
            console.log('Error creating apartment:', error)
            throw error
        }
    }

    static async updateApartment({ id, apartmentData }) {
        const { name, description, address, capacity, price, images } = apartmentData
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
            updatedValues.push(JSON.stringify(apartmentData.images))
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const [result] = await db.execute(`UPDATE apartments SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                const [updatedApartment] = await db.execute('SELECT * FROM apartments WHERE id = ?;', [id])
                if (updatedApartment[0].images !== null && updatedApartment[0].images !== undefined) {
                    updatedApartment[0].images = updatedApartment[0].images
                }
                console.log(updatedApartment[0]);
                return updatedApartment[0]
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
            const [apartment] = await db.execute('SELECT images FROM apartments WHERE id = ?;', [id])
            if (apartment.length === 0) {
                return { success: false, message: 'Apartment not found' }
            }

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