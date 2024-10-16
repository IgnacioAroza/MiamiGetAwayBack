import db from '../utils/db_render.js'
import { validateUser } from '../schemas/userSchema.js'

export default class UserModel {
    static async getAll() {
        try {
            const { rows } = await db.query('SELECT * FROM clients')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async createUser(body) {
        const { name, lastName, email } = body
        const validateResult = validateUser(body)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!name || !lastName || !email) {
                throw new Error('Missing required fields')
            }

            const { rows } = await db.query(
                'INSERT INTO clients (name, lastName, email) VALUES ( $1, $2, $3) RETURNING *;',
                [name, lastName, email]
            )

            return rows
        } catch (error) {
            console.log('Error creating user:', error)
            throw error
        }
    }
}