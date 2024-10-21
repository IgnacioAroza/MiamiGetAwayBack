import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
    user: 'admin',
    host: 'dpg-cs7c1hlumphs73a47qog-a.oregon-postgres.render.com',
    database: 'miamigetaway_db_dkf2',
    password: 'Wu8rqgDxuLyea6hZT7ohChyWclSknFdd',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    },
})

export default {
    query: (text, params) => pool.query(text, params)
}