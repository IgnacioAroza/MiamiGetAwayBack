import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import db from '../utils/db_render.js';
dotenv.config();
// Interfaz para extender Request
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
    };
}
// Interfaz para el payload del token
interface JwtPayload {
    id: string;
    [key: string]: any;
}
export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authorization required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        const { rows } = await db.query('SELECT id, username FROM admins WHERE id = $1;', [decoded.id]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = rows[0];
        next();
    } catch (error) {
        console.log('Auth error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};