import db from '../utils/db_render.js'
import { validateAdmin } from '../schemas/adminSchema.js'
import bcrypt from 'bcrypt'

export default class AdminModel {
    static async getAll() {
        try {
            const { rows } = await db.query('SELECT id, username, email FROM admins')
            return rows
        } catch (error) {
            throw error
        }
    }

    static async getAdminById(id) {
        try {
            const { rows } = await db.query('SELECT id, username, email FROM admins WHERE id = $1', [id])
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

            const { rows } = await db.query('SELECT id FROM admins WHERE username = $1 OR email = $2;', [username, email])
            if (rows.length > 0) {
                throw new Error('username o main already exists')
            }

            if (typeof password !== 'string' || password.length === 0) {
                throw new Error('Invalid password format')
            }

            const hashedPassword = await bcrypt.hash(password, 10)

            const { rows: newAdmin } = await db.query(
                'INSERT INTO admins (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email;',
                [username, email, hashedPassword]
            )

            return newAdmin[0]
        } catch (error) {
            console.log('Error creating admin:', error)
            throw error
        }
    }

    static async updateAdmin({ id, input }) {
        const { username, email, password } = input
        const updateFields = []
        const updatedValues = []
        let countParam = 1

        if (username !== undefined) {
            updateFields.push(`username = $${countParam}`)
            updatedValues.push(username)
            countParam++
        }
        if (email !== undefined) {
            updateFields.push(`email = $${countParam}`)
            updatedValues.push(email)
            countParam++
        }
        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10)
            updateFields.push(`password = $${countParam}`)
            updatedValues.push(hashedPassword)
            countParam++
        }

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const { rowCount } = await db.query(`UPDATE admins SET ${updateFields.join(', ')} WHERE id = $${countParam};`, updatedValues)

            if (rowCount > 0) {
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
            const { rowCount } = await db.query('DELETE FROM admins WHERE id = $1;', [id])

            if (rowCount > 0) {
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