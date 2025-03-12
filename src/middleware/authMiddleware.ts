import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1]
        
        if (!token) {
            res.status(401).json({ message: 'No token provided' })
            return
        }

        const JWT_SECRET = process.env.JWT_SECRET
        
        if (!JWT_SECRET) {
            res.status(500).json({ message: 'JWT_SECRET is not defined in the server' })
            return
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string }
        req.user = decoded
        
        next()
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' })
    }
}

export default authMiddleware