import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
    executeSqlFile,
    createMigrationsTableIfNotExists,
    isMigrationApplied,
    registerMigration
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSingleMigration(migrationFileName) {
    try {
        const scriptsDir = path.join(__dirname, 'scripts');
        const filePath = path.join(scriptsDir, migrationFileName);

        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Error: El archivo de migración '${migrationFileName}' no existe`);
            console.log(`Los archivos disponibles son:`);

            const availableFiles = fs.readdirSync(scriptsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            availableFiles.forEach(file => console.log(` - ${file}`));
            process.exit(1);
        }

        // Crear tabla de migraciones si no existe
        console.log('🔍 Verificando tabla de migraciones...');
        await createMigrationsTableIfNotExists();

        // Verificar si la migración ya fue aplicada
        const alreadyApplied = await isMigrationApplied(migrationFileName);
        if (alreadyApplied) {
            console.log(`⚠️  La migración '${migrationFileName}' ya fue aplicada anteriormente`);
            console.log(`✅ No es necesario ejecutarla nuevamente`);
            return;
        }

        console.log(`🚀 Ejecutando migración: ${migrationFileName}`);
        await executeSqlFile(filePath);

        // Registrar la migración como aplicada
        console.log('📝 Registrando migración en la base de datos...');
        await registerMigration(migrationFileName);

        console.log(`✅ Migración completada y registrada exitosamente`);
    } catch (error) {
        console.error(`❌ Error ejecutando la migración:`, error);
        process.exit(1);
    }
}

// Obtener el nombre del archivo de los argumentos de la línea de comandos
const migrationFileName = process.argv[2];

if (!migrationFileName) {
    console.error('❌ Error: Debe especificar el nombre del archivo de migración');
    console.log('Uso: node migrations/runSingle.js nombre_archivo.sql');
    process.exit(1);
}

runSingleMigration(migrationFileName); 