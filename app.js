import dotenv from 'dotenv'
import express, { json } from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import carRouter from './routes/car.js'
import apartmentRoutes from './routes/apartment.js'
import yachtRoutes from './routes/yacht.js'
import villaRoutes from './routes/villa.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/user.js'
import authRoutes from './routes/auth.js'
import reviewRoutes from './routes/review.js'
import { authMiddleware } from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) {
            return callback(null, true);
        }

        // Remove any trailing slashes from the origin
        const normalizedOrigin = origin.replace(/\/$/, '');

        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(json())

//Rutas publicas
app.use('/auth', authRoutes)

//Usa las rutas
app.use('/cars', carRouter)
app.use('/apartments', apartmentRoutes)
app.use('/yachts', yachtRoutes)
app.use('/villas', villaRoutes)
app.use('/admins', authMiddleware, adminRoutes)
app.use('/users', userRoutes)
app.use('/reviews', reviewRoutes)

app.use((err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).send('Internal server error')
})

app.listen(port, () => {
    console.log(`server running in port ${port}`)
})