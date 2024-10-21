import dotenv from 'dotenv'
import express, { json } from 'express'
import carRouter from './routes/car.js'
import apartmentRoutes from './routes/apartment.js'
import yachtRoutes from './routes/yacht.js'
import villaRoutes from './routes/villa.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/user.js'
import authRoutes from './routes/auth.js'
import { authMiddleware } from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(json())

//Rutas publicas
app.use('/api/auth', authRoutes)

//Usa las rutas
app.use('/api/cars', carRouter)
app.use('/api/apartments', apartmentRoutes)
app.use('/api/yachts', yachtRoutes)
app.use('/api/villas', villaRoutes)
app.use('/api/admins', authMiddleware, adminRoutes)
app.use('/api/users', authMiddleware, userRoutes)

app.listen(port, () => {
    console.log(`server running in port ${port}`)
})