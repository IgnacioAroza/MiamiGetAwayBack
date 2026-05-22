import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import db from '../../utils/db_render.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
const authToken = jwt.sign({ id: 1, username: 'testadmin' }, JWT_SECRET, { expiresIn: '1h' });
const authHeader = `Bearer ${authToken}`;

describe('Rutas de API para administradores', () => {
    beforeAll(async () => {
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS admins (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL
                );
            `);
            await db.query('DELETE FROM admins');
        } catch (error) {
            console.error('Error en setup:', error);
        }
    });

    afterAll(async () => {
        try {
            await db.query('DELETE FROM admins');
        } catch (error) {
            console.error('Error en cleanup:', error);
        }
    });

    it('debería rechazar requests sin token con 401', async () => {
        const response = await request(app).get('/api/admins');
        expect(response.status).toBe(401);
    });

    it('debería rechazar un administrador con campos faltantes', async () => {
        const response = await request(app)
            .post('/api/admins')
            .set('Authorization', authHeader)
            .send({ username: 'testadmin' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('debería obtener todos los administradores con token válido', async () => {
        const response = await request(app)
            .get('/api/admins')
            .set('Authorization', authHeader);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('debería poder insertar, obtener y eliminar un administrador', async () => {
        const timestamp = Date.now();
        const testAdmin = {
            username: 'testadmin',
            email: `test${timestamp}@example.com`,
            password: 'password123'
        };

        const createResponse = await request(app)
            .post('/api/admins')
            .set('Authorization', authHeader)
            .send(testAdmin);

        expect(createResponse.status).toBe(201);
        expect(createResponse.body).toHaveProperty('id');
        expect(createResponse.body.username).toBe(testAdmin.username);
        expect(createResponse.body.email).toBe(testAdmin.email);
        expect(createResponse.body).not.toHaveProperty('password');

        const adminId = createResponse.body.id;

        const getResponse = await request(app)
            .get(`/api/admins/${adminId}`)
            .set('Authorization', authHeader);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.id).toBe(adminId);
        expect(getResponse.body).not.toHaveProperty('password');

        const deleteResponse = await request(app)
            .delete(`/api/admins/${adminId}`)
            .set('Authorization', authHeader);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body).toHaveProperty('message');

        const getAfterDelete = await request(app)
            .get(`/api/admins/${adminId}`)
            .set('Authorization', authHeader);

        expect(getAfterDelete.status).toBe(404);
    });

    it('debería poder actualizar un administrador', async () => {
        const timestamp = Date.now();
        const testAdmin = {
            username: 'updateadmin',
            email: `update${timestamp}@example.com`,
            password: 'password123'
        };

        const insertResult = await db.query(
            'INSERT INTO admins (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [testAdmin.username, testAdmin.email, testAdmin.password]
        );

        const adminId = insertResult.rows[0].id;

        const updateResponse = await request(app)
            .put(`/api/admins/${adminId}`)
            .set('Authorization', authHeader)
            .send({ username: 'adminupdated' });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.username).toBe('adminupdated');
        expect(updateResponse.body.email).toBe(testAdmin.email);
        expect(updateResponse.body).not.toHaveProperty('password');

        await db.query('DELETE FROM admins WHERE id = $1', [adminId]);
    });
});
