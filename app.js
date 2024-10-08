require('dotenv').config()
const express = require('express')
const db = require('./utils/db.js')

const app = express()
const port = process.env.PORT || 3000

app.get('/test-db', async (req, res) => {
    try {
        const [rows, fields] = await db.promise().query('SELECT 1 + 1 AS solution')
        res.send(`La solucion es: ${rows[0].solution}`)
    } catch (error) {
        console.log('error al conectar a la base de datos: ', error)
        res.status(500).send('error al conectar a la base de datos')
    }
})

app.get('/', (req, res) => {
    res.send('servidor funcionando correctamente')
})

app.listen(port, () => {
    console.log(`server running in port ${port}`)
})