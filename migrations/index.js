import path from 'path';
import {
    getMigrationFiles,
    executeSqlFile,
    createMigrationsTableIfNotExists,
    isMigrationApplied,
    registerMigration
} from './utils.js';

async function runMigrations() {
    try {
        console.log('🚀 Iniciando proceso de migraciones...');

        // Crear tabla de migraciones si no existe
        await createMigrationsTableIfNotExists();

        // Obtener todos los archivos de migración
        const migrationFiles = getMigrationFiles();

        if (migrationFiles.length === 0) {
            console.log('No hay archivos de migración para ejecutar.');
            return;
        }

        console.log(`Encontrados ${migrationFiles.length} archivos de migración`);

        // Ejecutar cada migración si no ha sido aplicada aún
        for (const file of migrationFiles) {
            const migrationName = path.basename(file);
            const isApplied = await isMigrationApplied(migrationName);

            if (!isApplied) {
                console.log(`\n🔄 Aplicando migración: ${migrationName}`);
                await executeSqlFile(file);
                await registerMigration(migrationName);
                console.log(`✅ Migración ${migrationName} aplicada exitosamente`);
            } else {
                console.log(`⏩ Migración ${migrationName} ya fue aplicada, omitiendo`);
            }
        }

        console.log('\n✅ Proceso de migraciones completado exitosamente');
    } catch (error) {
        console.error('\n❌ Error durante el proceso de migraciones:');
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar migraciones
runMigrations(); 