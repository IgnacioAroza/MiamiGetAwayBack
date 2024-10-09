import db from '../utils/db.js'
import { validateAdmin } from '../schemas/adminSchema.js'
import bcrypt from 'bcrypt'

export default class AdminModel {
    static async getAll() {
        try {
            const [rows] = await db.execute('SELECT id, username, email FROM admins')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getAdminById(id) {
        try {
            const [rows] = await db.execute('SELECT id, username, email FROM admins WHERE id = ?', [id])
            return rows[0]
        } catch (error) {
            throw error
        }
    }

    static async createAdmin(body) {
        const { username, email, password } = body
        const validateResult = validateAdmin(body)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!username || !email || !password) {
                throw new Error('Missing required fields')
            }

            const hashedPassword = await bcrypt.hash(password, 10)

            const [result] = await db.execute(
                'INSERT INTO admins (username, email, password) VALUES (?, ?, ?);',
                [username, email, hashedPassword]
            )

            if (result.affectedRows === 1) {
                const [admins] = await db.execute('SELECT id, username, email FROM admins WHERE id = LAST_INSERT_ID();')
                return admins[0]
            } else {
                throw new Error('Error creating admin')
            }
        } catch (error) {
            console.log('Error creating admin:', error)
            throw error
        }
    }

    static async updateAdmin({ id, input }) {
        const { username, email, password } = input
        const updateFields = []
        const updatedValues = []

        if (username !== undefined) {
            updateFields.push('username = ?')
            updatedValues.push(username)
        }
        if (email !== undefined) {
            updateFields.push('email = ?')
            updatedValues.push(email)
        }
        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10)
            updateFields.push('password = ?')
            updatedValues.push(hashedPassword)
        }

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const [result] = await db.execute(`UPDATE admins SET ${updateFields.join(', ')} WHERE id = ?;`, updatedValues)

            if (result.affectedRows > 0) {
                return { message: 'Admin updated successfully' }
            } else {
                return { message: 'Admin not found' }
            }
        } catch (error) {
            console.log(error)
            throw new Error('Error updating admin')
        }
    }

    static async deleteAdmin(id) {
        try {
            const [result] = await db.execute('DELETE FROM admins WHERE id = ?;', [id])

            if (result.affectedRows > 0) {
                return { success: true, message: 'Admin deleted successfully' }
            } else {
                return { success: false, message: 'Admin not found' }
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}