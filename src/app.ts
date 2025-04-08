import express from 'express'
import cors from 'cors'
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
import cronRoutes from './routes/cron.js'

// Importar el servicio de cron
import { CronService } from './services/cronService.js'

// Configuración de variables de entorno
dotenv.config()

// Crear la aplicación Express
const app = express()
const PORT = process.env.PORT || 3000

// Configuración de middlewares
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080',
        'https://miamigetaway.com',
        'https://www.miamigetaway.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 horas
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev')) // Logging

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

// Ruta de inicio
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to the Miami Getaway API',
        status: 'Online',
        endpoints: {
            apartments: '/api/apartments',
            cars: '/api/cars',
            villas: '/api/villas',
            yachts: '/api/yachts',
            reviews: '/api/reviews',
            users: '/api/users',
            reservations: '/api/reservations',
            reservationPayments: '/api/reservation-payments'
        }
    })
})

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// Manejo de errores global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack)
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})

// Iniciar el servidor solo si no estamos en modo de prueba
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
        
        // Iniciar el servicio de cron
        const cronService = CronService.getInstance();
        cronService.startAllJobs();
        console.log('Cron service started');
    })
}

export default app;
