import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { executeSqlFile } from './utils.js';

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

        console.log(`🚀 Ejecutando migración: ${migrationFileName}`);
        await executeSqlFile(filePath);
        console.log(`✅ Migración completada exitosamente`);
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