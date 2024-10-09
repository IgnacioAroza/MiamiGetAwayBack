import * as dotenv from 'dotenv'
import express, { json } from 'express'
import carRouter from './routes/car.js'
import apartmentRoutes from './routes/apartment.js'
import yachtRoutes from './routes/yacht.js'
import villaRoutes from './routes/villa.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(json())

//Usa las rutas
app.use('/api/cars', carRouter)
app.use('/api/apartments', apartmentRoutes)
app.use('/api/yachts', yachtRoutes)
app.use('/api/villas', villaRoutes)

app.listen(port, () => {
    console.log(`server running in port ${port}`)
})