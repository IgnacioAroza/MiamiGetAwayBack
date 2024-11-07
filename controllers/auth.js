import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../utils/db_render.js'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set in the envoriment variables')
}

class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body

            if (!username || !password) {
                return res.status(400).json({ message: 'Username and password are required' })
            }

            const { rows } = await db.query('SELECT * FROM admins WHERE username = $1;', [username])

            if (rows.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials' })
            }

            const admin = rows[0]

            const isPasswordValid = await bcrypt.compare(password, admin.password)

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid credentials' })
            }

            if (!JWT_SECRET) {
                throw new Error('JWT_SECRET is not defined')
            }

            const token = jwt.sign(
                { id: admin.id, username: admin.username },
                JWT_SECRET,
                { expiresIn: '1h' }
            )

            res.json({ token, admin: { id: admin.id, username: admin } })
        } catch (error) {
            console.log('Login error:', error)
            res.status(500).json({ message: 'An error occurred during login' })
        }
    }
}

export default AuthController