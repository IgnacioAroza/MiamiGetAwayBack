import db from '../utils/db.js'

export default class CarModel {
    static async getAll() {
        try {
            const [rows] = await db.execute('SELECT * FROM cars')
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
            const [rows] = await db.execute('SELECT * FROM cars WHERE id = ?', [id])
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
            const [result] = await db.query(
                'INSERT INTO cars (brand, model, price, description, images) VALUES (?, ?, ?, ?, ?);',
                [brand, model, price, description, imagesJson]
            )
            return { id: result.insertId, ...carData, images: images || [] }
        } catch (error) {
            console.error('Error in createCar:', error)
            throw new Error('Failed to create car: ' + error.message)
        }
    }

    static async updateCar({ id, carData }) {
        const { brand, model, description, price, images } = carData
        const updateFields = []
        const updatedValues = []

        if (brand !== undefined) {
            updateFields.push('brand = ?')
            updatedValues.push(brand)
        }
        if (model !== undefined) {
            updateFields.push('model = ?')
            updatedValues.push(model)
        }
        if (description !== undefined) {
            updateFields.push('description = ?')
            updatedValues.push(description)
        }
        if (price !== undefined) {
            updateFields.push('price = ?')
            updatedValues.push(price)
        }
        if (images !== undefined) {
            updateFields.push('images = ?')
            updatedValues.push(JSON.stringify(carData.images))
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const [result] = await db.execute(`UPDATE cars SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                const [updatedCar] = await db.execute('SELECT * FROM cars WHERE id = ?;', [id])
                if (updatedCar[0].images !== null && updatedCar[0].images !== undefined) {
                    updatedCar[0].images = updatedCar[0].images
                }
                return updatedCar[0]
            } else {
                return { message: 'Car not found' }
            }
        } catch (error) {
            console.log(error)
            throw new Error('Error updating car')
        }
    }

    static async deleteCar(id) {
        try {
            const [car] = await db.execute('SELECT images FROM cars WHERE id = ?;', [id])
            if (car.length === 0) {
                return { success: false, message: 'Car not found' }
            }

            const [result] = await db.execute('DELETE FROM cars WHERE id = ?;', [id])

            if (result.affectedRows > 0) {
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