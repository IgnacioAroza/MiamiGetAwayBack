require('dotenv').config()
const mysql = require('mysql2')

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}

const db = mysql.createPool(dbConfig)

module.exports = db