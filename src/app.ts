import express from 'express'
import multer from 'multer'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import dotenv from 'dotenv'
import morgan from 'morgan'

// Importar rutas
import apartmentRoutes from './routes/apartment.js'
import carRoutes from './routes/car.js'
import villaRoutes from './routes/villa.js'
import yachtRoutes from './routes/yacht.js'
import reviewRoutes from './routes/review.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import reservationRoutes from './routes/reservation.js'
import reservationPaymentsRoutes from './routes/reservationPayments.js'
import supplierRoutes, { supplierPaymentsRouter } from './routes/suppliers.js'
import cronRoutes from './routes/cron.js'
import monthlySummaryRoutes from './routes/monthlySummary.js'
import googleMyBusinessRoutes from './routes/googleMyBusiness.js'

// Importar el servicio de cron
import { CronService } from './services/cronService.js'

// Configuración de variables de entorno
// Determinar qué archivo de entorno cargar antes de importar dotenv
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
dotenv.config({ path: envFile, override: true })

// Logs solo en desarrollo y test
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log(`🔧 Loading environment from: ${envFile} (NODE_ENV: ${process.env.NODE_ENV})`);
}

// Crear la aplicación Express
const app = express()
const PORT = process.env.PORT || 3000

// Trust the first proxy (required for express-rate-limit behind Render/load balancers)
app.set('trust proxy', 1)

// Configuración de middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean)
const corsOptions = {
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
}

const globalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
})

const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    message: { error: 'Too many upload requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
})

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 10,
    message: { message: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
})

app.use(helmet())
app.use(cors(corsOptions))
app.use(globalRateLimit)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging solo en desarrollo y test
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    app.use(morgan('dev'))
}

// Configuración de rutas
app.use('/api/apartments', uploadRateLimit, apartmentRoutes)
app.use('/api/cars', uploadRateLimit, carRoutes)
app.use('/api/villas', uploadRateLimit, villaRoutes)
app.use('/api/yachts', uploadRateLimit, yachtRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admins', adminRoutes)
app.use('/api/auth', loginRateLimit, authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/reservation-payments', reservationPaymentsRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/supplier-payments', supplierPaymentsRouter)
app.use('/api/cron', cronRoutes)
app.use('/api/summaries', monthlySummaryRoutes)
app.use('/api/google-mybusiness', googleMyBusinessRoutes)

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// Manejo de errores global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large. Maximum size is 10MB'
            : err.message
        res.status(400).json({ error: message })
        return
    }
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})

// Iniciar el servidor (no en test — supertest maneja el binding)
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
            console.log(`📍 Database: ${process.env.DATABASE_URL || 'Not configured'}`);
        }
        // const cronService = CronService.getInstance();
        // cronService.startAllJobs();
    })
}

export default app;
