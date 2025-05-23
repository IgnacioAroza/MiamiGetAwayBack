import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

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
import cronRoutes from './routes/cron.js'
import monthlySummaryRoutes from './routes/monthlySummary.js'

// Importar el servicio de cron
import { CronService } from './services/cronService.js'

// Configuración de variables de entorno
dotenv.config()

// Crear la aplicación Express
const app = express()
const PORT = process.env.PORT || 3000

// Configuración de middlewares
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 horas
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configuración de rutas
app.use('/api/apartments', apartmentRoutes)
app.use('/api/cars', carRoutes)
app.use('/api/villas', villaRoutes)
app.use('/api/yachts', yachtRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admins', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/reservation-payments', reservationPaymentsRoutes)
app.use('/api/cron', cronRoutes)
app.use('/api/summaries', monthlySummaryRoutes)

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// Manejo de errores global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})

// Iniciar el servidor
app.listen(PORT, () => {
    // Iniciar el servicio de cron
    // const cronService = CronService.getInstance();
    // cronService.startAllJobs();
})

export default app;
