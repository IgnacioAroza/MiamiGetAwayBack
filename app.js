import dotenv from 'dotenv'
import express, { json } from 'express'
import cors from 'cors'
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

const allowedOrigins = ['http://localhost:5173', 'https://miamigetawayfront.onrender.com/'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));


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

app.listen(port, () => {
    console.log(`server running in port ${port}`)
})