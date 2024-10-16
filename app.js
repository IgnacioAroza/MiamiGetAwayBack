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
import pool from './utils/db_render.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(json())

app.get('/ping', async (req, res) => {
    const result = await pool.query('SELECT NOW()')
    return res.json(result.rows[0])
})

//Rutas publicas
app.use('/api/auth', authRoutes)

//Usa las rutas
app.use('/api/cars', authMiddleware, carRouter)
app.use('/api/apartments', authMiddleware, apartmentRoutes)
app.use('/api/yachts', authMiddleware, yachtRoutes)
app.use('/api/villas', authMiddleware, villaRoutes)
app.use('/api/admins', adminRoutes)
app.use('/api/users', userRoutes)

app.listen(port, () => {
    console.log(`server running in port ${port}`)
})