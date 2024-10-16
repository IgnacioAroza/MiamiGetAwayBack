import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import db from '../utils/db_render.js'

dotenv.config()

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]

        if (!token) {
            return res.status(401).json({ message: 'Authorization required' })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const { rows } = await db.query('SELECT id, username FROM admins WHERE id = $1;', [decoded.id])

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid token' })
        }

        req.rows = rows[0]
        next()
    } catch (error) {
        console.log('Auth error:', error)
        res.status(401).json({ message: 'Invalid token' })
    }
}