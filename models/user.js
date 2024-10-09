import db from '../utils/db.js'
import { validateUser } from '../schemas/userSchema.js'

export default class UserModel {
    static async getAll() {
        try {
            const [rows] = await db.execute('SELECT * FROM clients')
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

            const [result] = await db.execute(
                'INSERT INTO clients (name, lastName, email) VALUES ( ?, ?, ?);',
                [name, lastName, email]
            )

            if (result.affectedRows === 1) {
                const [users] = await db.execute('SELECT * FROM clients WHERE id = LAST_INSERT_ID();')
                return users[0]
            } else {
                throw new Error('Error creating user')
            }
        } catch (error) {
            console.log('Error creating user:', error)
            throw error
        }
    }
}