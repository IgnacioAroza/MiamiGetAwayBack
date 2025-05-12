import pg from 'pg';
import { QueryResult as PgQueryResult } from 'pg';

const { Pool } = pg;

// Función para inicializar la conexión a la base de datos
const initializePool = () => {
    // Determinar si estamos en entorno de producción o desarrollo
    const isProduction = process.env.NODE_ENV === 'production';
    
    let dbConfig;
    
    if (isProduction) {
        // Configuración para producción (Render)
        console.log('Usando configuración de base de datos de PRODUCCIÓN');
        dbConfig = {
            user: process.env.DB_USER,
            host: process.env.HOST,
            database: process.env.DATABASE,
            password: process.env.PASSWORD,
            port: process.env.PORT_DB ? parseInt(process.env.PORT_DB) : 5432,
            ssl: { rejectUnauthorized: true }
        };
    } else {
        // Configuración para desarrollo (Docker)
        console.log('Usando configuración de base de datos LOCAL (Docker)');
        dbConfig = {
            user: 'postgres',
            host: 'localhost',
            database: 'miami_getaway_demo',
            password: 'password',
            port: 5433,
            ssl: false
        };
    }
    
    const pool = new Pool(dbConfig);
    
    return pool;
};

// No inicializamos el pool hasta que sea necesario
let pool: pg.Pool | null = null;

export default {
    query: (text: string, params: any[] = []): Promise<PgQueryResult> => {
        // Si el pool no está inicializado, lo inicializamos
        if (!pool) {
            pool = initializePool();
        }
        return pool.query(text, params);
    },
    
    // Método para cerrar la conexión si es necesario
    close: async (): Promise<void> => {
        if (pool) {
            await pool.end();
            pool = null;
        }
    }
};