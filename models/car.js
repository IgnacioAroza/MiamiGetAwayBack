import dbPostgre from '../utils/db_render.js'

export default class CarModel {
    static async getAll() {
        try {
            const { rows } = await dbPostgre.query('SELECT * FROM cars')
            return rows.map(car => {
                try {
                    car.images = JSON.parse(car.images)
                } catch (error) {
                    car.images = car.images ? [car.images] : []
                }
                return car
            })
        } catch (error) {
            console.log('Error in getAll:', error)
            throw error
        }
    }

    static async getCarById(id) {
        try {
            const { rows } = await dbPostgre.query('SELECT * FROM cars WHERE id = $1', [id])
            if (rows[0]) {
                try {
                    rows[0].images = JSON.parse(rows[0].images)
                } catch (error) {
                    rows[0].images = rows[0].images ? [rows[0].images] : []
                }
                return rows[0]
            }
            return rows[0]
        } catch (error) {
            console.log('Error in getById:', error)
            throw error
        }
    }

    static async createCar(carData) {
        const { brand, model, price, description, images } = carData
        const imagesJson = JSON.stringify(images || [])

        try {
            const { rows } = await dbPostgre.query(
                'INSERT INTO cars (brand, model, price, description, images) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
                [brand, model, price, description, imagesJson]
            )
            return { id: rows.insertId, ...carData, images: images || [] }
        } catch (error) {
            console.error('Error in createCar:', error)
            throw new Error('Failed to create car: ' + error.message)
        }
    }

    static async updateCar({ id, carData }) {
        const { brand, model, description, price, images } = carData
        const updateFields = []
        const updatedValues = []
        let paramCount = 1

        if (brand !== undefined) {
            updateFields.push(`brand = $${paramCount++}`)
            updatedValues.push(brand)
        }
        if (model !== undefined) {
            updateFields.push(`model = $${paramCount++}`)
            updatedValues.push(model)
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramCount++}`)
            updatedValues.push(description)
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
            const query = `UPDATE cars SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await dbPostgre.query(query, updatedValues)

            const { rows } = await dbPostgre.query('SELECT * FROM cars WHERE id = $1', [id]);
            if (rows.length > 0) {
                const updatedCar = rows[0]
                if (updatedCar.images) {
                    if (typeof updatedCar.images === 'string') {
                        try {
                            updatedCar.images = JSON.parse(updatedCar.images);
                        } catch (error) {
                            console.error('Error parsing images:', error)
                            updatedCar.images = []
                        }
                    } else if (!Array.isArray(updatedCar.images)) {
                        updatedCar.images = []
                    }
                }
                return updatedCar
            } else {
                return { message: 'Car not found' };
            }
        } catch (error) {
            console.log(error)
            throw new Error('Error updating car')
        }
    }

    static async deleteCar(id) {
        try {
            const { rows } = await dbPostgre.query('DELETE FROM cars WHERE id = $1 RETURNING *;', [id])

            if (rows.length > 0) {
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