import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../utils/db_render.js'

dotenv.config()

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

            const token = jwt.sign(
                { id: admin.id, username: admin.username },
                process.env.JWT_SECRET,
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