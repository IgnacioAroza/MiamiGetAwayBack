import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../utils/db_render.js'
import { Admin } from '../types/index.js'
import { ok, badRequest, unauthorized, serverError } from '../utils/response.js'

interface LoginRequest {
    username: string;
    password: string;
}

class AuthController {
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body as LoginRequest

            if (!username || !password) {
                badRequest(res, 'Username and password are required')
                return
            }

            const { rows } = await db.query('SELECT * FROM admins WHERE username = $1;', [username])

            if (rows.length === 0) {
                unauthorized(res, 'Invalid credentials')
                return
            }

            const admin = rows[0] as Admin

            const isPasswordValid = await bcrypt.compare(password, admin.password)

            if (!isPasswordValid) {
                unauthorized(res, 'Invalid credentials')
                return
            }

            const JWT_SECRET = process.env.JWT_SECRET
            if (!JWT_SECRET) {
                throw new Error('JWT_SECRET is not defined')
            }

            const token = jwt.sign(
                { id: admin.id, username: admin.username },
                JWT_SECRET,
                { expiresIn: '1h' }
            )

            ok(res, { token, admin: { id: admin.id, username: admin.username } })
        } catch (error: any) {
            console.error('Login error:', error)
            serverError(res, 'An error occurred during login')
        }
    }
}

export default AuthController 