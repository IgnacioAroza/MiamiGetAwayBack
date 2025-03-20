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
import adminApartmentRoutes from './routes/adminApartment.js'

// Configuración de variables de entorno
dotenv.config()

// Crear la aplicación Express
const app = express()
const PORT = process.env.PORT || 3000

// Configuración de middlewares
app.use(cors())
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
app.use('/api/admin-apartments', adminApartmentRoutes)

// Ruta de inicio
app.get('/', (req, res) => {
    res.json({ 
        message: 'Bienvenido a la API de Miami Getaway',
        status: 'Online',
        endpoints: {
            apartments: '/api/apartments',
            cars: '/api/cars',
            villas: '/api/villas',
            yachts: '/api/yachts',
            reviews: '/api/reviews',
            users: '/api/users',
            reservations: '/api/reservations',
            reservationPayments: '/api/reservation-payments',
            adminApartments: '/api/admin-apartments'
        }
    })
})

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' })
})

// Manejo de errores global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack)
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})

// Iniciar el servidor solo si no estamos en modo de prueba
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`)
    })
}

export default app
