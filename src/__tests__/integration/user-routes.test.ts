import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import db from '../../utils/db_render.js';
import dotenv from 'dotenv';

dotenv.config();

describe('Rutas de API para usuarios', () => {
    beforeAll(async () => {
        // Configurar la tabla de usuarios para pruebas
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS clients (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    lastname VARCHAR(100) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL
                );
            `);
            
            // Limpiar los datos existentes
            await db.query('DELETE FROM clients');
        } catch (error) {
            console.error('Error en setup:', error);
        }
    });

    afterAll(async () => {
        try {
            // Limpiar después de todas las pruebas
            await db.query('DELETE FROM clients');
        } catch (error) {
            console.error('Error en cleanup:', error);
        }
    });

    it('debería rechazar un usuario con campos faltantes', async () => {
        const incompleteUser = {
            name: 'Incomplete'
            // Sin apellido ni correo electrónico
        };
        
        const response = await request(app)
            .post('/api/users')
            .send(incompleteUser);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('debería obtener todos los usuarios (array vacío o con usuarios)', async () => {
        // Solicitar los usuarios directamente
        const response = await request(app).get('/api/users');
        
        console.log('Respuesta GET /users:', response.body);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        // Puede ser un array vacío o con usuarios, ambos son válidos
    });
}); 