import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv
// Permite seleccionar archivo de entorno según NODE_ENV o variables ENV_FILE/DOTENV_CONFIG_PATH
(() => {
    const cwd = process.cwd();
    const explicitEnvFile = process.env.ENV_FILE || process.env.DOTENV_CONFIG_PATH;
    let envPath;

    if (explicitEnvFile) {
        envPath = path.isAbsolute(explicitEnvFile)
            ? explicitEnvFile
            : path.resolve(cwd, explicitEnvFile);
    } else if (process.env.NODE_ENV === 'development') {
        const devEnv = path.resolve(cwd, '.env.demo');
        if (fs.existsSync(devEnv)) envPath = devEnv;
    }

    if (envPath && fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
    } else {
        dotenv.config();
    }
})();

// Configurar la conexión a la base de datos
const { Pool } = pg;

// Resolver variables de conexión con prioridad DB_* y fallback a las antiguas
const dbUser = process.env.DB_USER || process.env.USER;
const dbHost = process.env.DB_HOST || process.env.HOST;
const dbName = process.env.DB_NAME || process.env.DATABASE;
const dbPassword = process.env.DB_PASSWORD || process.env.PASSWORD;
const dbPort = process.env.DB_PORT || process.env.PORT_DB;

const useSsl = (process.env.DB_SSL === 'true') || (process.env.NODE_ENV === 'production');

const pool = new Pool({
    user: dbUser,
    host: dbHost,
    database: dbName,
    password: dbPassword,
    port: dbPort ? parseInt(dbPort) : undefined,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// Cliente de base de datos para usar en migraciones
const db = {
    query: (text, params = []) => pool.query(text, params),
    connect: () => pool.connect()
};

// Función para ejecutar un archivo SQL
export async function executeSqlFile(filePath) {
    try {
        const fullPath = path.resolve(filePath);
        const sql = fs.readFileSync(fullPath, 'utf8');

        console.log(`Ejecutando script SQL: ${path.basename(filePath)}`);
        await db.query(sql);
        console.log(`✅ Script ejecutado exitosamente`);

        return true;
    } catch (error) {
        console.error(`❌ Error ejecutando script SQL: ${error.message}`);
        throw error;
    }
}

// Función para ejecutar una serie de queries SQL en una transacción
export async function executeQueries(queries) {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        for (const query of queries) {
            console.log(`Ejecutando query: ${query.substring(0, 50)}...`);
            await client.query(query);
        }

        await client.query('COMMIT');
        console.log('✅ Queries ejecutadas exitosamente en una transacción');

        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error ejecutando queries: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
}

// Función para listar los archivos de migración en orden
export function getMigrationFiles() {
    const scriptsDir = path.join(__dirname, 'scripts');
    const files = fs.readdirSync(scriptsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Los archivos se ordenarán alfabéticamente (001_, 002_, etc.)

    return files.map(file => path.join(scriptsDir, file));
}

// Función para verificar si existe la tabla de migraciones
export async function createMigrationsTableIfNotExists() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS db_migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabla de migraciones verificada');
        return true;
    } catch (error) {
        console.error('❌ Error creando tabla de migraciones:', error.message);
        throw error;
    }
}

// Función para verificar si una migración ya fue aplicada
export async function isMigrationApplied(migrationName) {
    try {
        const { rows } = await db.query(
            'SELECT COUNT(*) FROM db_migrations WHERE name = $1',
            [migrationName]
        );
        return parseInt(rows[0].count) > 0;
    } catch (error) {
        // Si la tabla no existe, ninguna migración ha sido aplicada
        if (error.code === '42P01') { // UNDEFINED_TABLE
            return false;
        }
        throw error;
    }
}

// Función para registrar una migración como aplicada
export async function registerMigration(migrationName) {
    await db.query(
        'INSERT INTO db_migrations (name) VALUES ($1)',
        [migrationName]
    );
    console.log(`✅ Migración registrada: ${migrationName}`);
} 
