import pg from 'pg';
import { QueryResult as PgQueryResult } from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

// Función para crear el pool solo cuando se necesite
function getPool(): pg.Pool {
    if (!pool) {
        pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.HOST,
            database: process.env.DATABASE,
            password: process.env.PASSWORD,
            port: process.env.PORT_DB ? parseInt(process.env.PORT_DB) : undefined,
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: false
            } : false,
        });

        pool.on('connect', (client) => {
            client.query("SET datestyle = 'ISO, MDY'");
        });
    }
    return pool;
}

export default {
    query: (text: string, params: any[] = []): Promise<PgQueryResult> => getPool().query(text, params)
};