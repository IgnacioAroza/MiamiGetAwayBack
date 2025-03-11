import dotenv from 'dotenv';
import pg from 'pg';
import { QueryResult as PgQueryResult } from 'pg';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT_DB ? parseInt(process.env.PORT_DB) : undefined,
    ssl: {
        rejectUnauthorized: false
    },
});

export default {
    query: (text: string, params: any[] = []): Promise<PgQueryResult> => pool.query(text, params)
};