import { Request, Response } from 'express'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../utils/db_render.js'
import { Admin } from '../types/index.js'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set in the envoriment variables')
}

interface LoginRequest {
    username: string;
    password: string;
}

class AuthController {
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body as LoginRequest

            if (!username || !password) {
                res.status(400).json({ message: 'Username and password are required' })
                return
            }

            const { rows } = await db.query('SELECT * FROM admins WHERE username = $1;', [username])

            if (rows.length === 0) {
                res.status(401).json({ message: 'Invalid credentials' })
                return
            }

            const admin = rows[0] as Admin

            const isPasswordValid = await bcrypt.compare(password, admin.password)

            if (!isPasswordValid) {
                res.status(401).json({ message: 'Invalid credentials' })
                return
            }

            if (!JWT_SECRET) {
                throw new Error('JWT_SECRET is not defined')
            }

            const token = jwt.sign(
                { id: admin.id, username: admin.username },
                JWT_SECRET,
                { expiresIn: '1h' }
            )

            res.json({ token, admin: { id: admin.id, username: admin.username } })
        } catch (error: any) {
            res.status(500).json({ message: 'An error occurred during login' })
        }
    }
}

export default AuthController 