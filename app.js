import * as dotenv from 'dotenv'
import express, { json } from 'express'
import carRouter from './routes/car.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(json())

//Usa las rutas
app.use('/api/cars', carRouter)

app.get('/', (req, res) => {
    res.send('servidor funcionando correctamente')
})

app.listen(port, () => {
    console.log(`server running in port ${port}`)
})