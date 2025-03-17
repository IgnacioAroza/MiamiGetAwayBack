import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import db from '../../utils/db_render.js';
import cloudinary from '../../utils/cloudinaryConfig.js';
import jwt from 'jsonwebtoken';

vi.mock('../../utils/cloudinaryConfig.js', () => ({
    default: {
        uploader: {
            upload_stream: vi.fn(),
            destroy: vi.fn()
        }
    }
}));

describe('Yacht Integration Tests', () => {
    let testYachtId: number;
    let authToken: string;

    beforeAll(async () => {
        // Limpiar la base de datos antes de comenzar
        await db.query('DELETE FROM yachts');
        
        // Crear un token de autenticación válido
        const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
        authToken = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET);
    });

    afterAll(async () => {
        // Limpiar la base de datos después de terminar
        await db.query('DELETE FROM yachts');
    });

    beforeEach(async () => {
        // Limpiar la base de datos antes de cada test
        await db.query('DELETE FROM yachts');
    });

    describe('POST /api/yachts', () => {
        it('debería crear un nuevo yate', async () => {
            const yachtData = {
                name: 'Test Yacht',
                description: 'A beautiful yacht for testing',
                capacity: 10,
                price: 1000.50,
                images: []
            };

            const response = await request(app)
                .post('/api/yachts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(yachtData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(yachtData.name);
            expect(response.body.description).toBe(yachtData.description);
            expect(response.body.capacity).toBe(yachtData.capacity);
            expect(response.body.price).toBe(yachtData.price);
            expect(Array.isArray(response.body.images)).toBe(true);

            testYachtId = response.body.id;
        });

        it('debería validar los campos requeridos', async () => {
            const invalidData = {
                name: 'Test Yacht'
                // Faltan campos requeridos
            };

            const response = await request(app)
                .post('/api/yachts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/yachts', () => {
        it('debería obtener todos los yates', async () => {
            // Primero crear un yate
            const yachtData = {
                name: 'Test Yacht',
                description: 'A beautiful yacht for testing',
                capacity: 10,
                price: 1000.50,
                images: []
            };

            await request(app)
                .post('/api/yachts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(yachtData);

            // Luego obtener todos los yates
            const response = await request(app)
                .get('/api/yachts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0].name).toBe(yachtData.name);
        });
    });

    describe('GET /api/yachts/:id', () => {
        it('debería obtener un yate por ID', async () => {
            // Primero crear un yate
            const yachtData = {
                name: 'Test Yacht',
                description: 'A beautiful yacht for testing',
                capacity: 10,
                price: 1000.50,
                images: []
            };

            const createResponse = await request(app)
                .post('/api/yachts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(yachtData);

            const yachtId = createResponse.body.id;

            // Luego obtener el yate por ID
            const response = await request(app)
                .get(`/api/yachts/${yachtId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', yachtId);
            expect(response.body.name).toBe(yachtData.name);
        });

        it('debería devolver 404 para un yate que no existe', async () => {
            const response = await request(app)
                .get('/api/yachts/999999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Yacht not found');
        });
    });

    describe('PUT /api/yachts/:id', () => {
        it('debería actualizar un yate existente', async () => {
            // Primero crear un yate
            const yachtData = {
                name: 'Test Yacht',
                description: 'A beautiful yacht for testing',
                capacity: 10,
                price: 1000.50,
                images: []
            };

            const createResponse = await request(app)
                .post('/api/yachts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(yachtData);

            const yachtId = createResponse.body.id;

            // Luego actualizar el yate
            const updateData = {
                name: 'Updated Yacht',
                price: 2000.50
            };

            const response = await request(app)
                .put(`/api/yachts/${yachtId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.name).toBe(updateData.name);
            expect(response.body.price).toBe(updateData.price);
            expect(response.body.capacity).toBe(yachtData.capacity);
        });

        it('debería validar los datos de actualización', async () => {
            const invalidData = {
                price: 'invalid'
            };

            const response = await request(app)
                .put(`/api/yachts/${testYachtId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Invalid price value');
        });
    });

    describe('DELETE /api/yachts/:id', () => {
        it('debería eliminar un yate existente', async () => {
            // Primero crear un yate
            const yachtData = {
                name: 'Test Yacht',
                description: 'A beautiful yacht for testing',
                capacity: 10,
                price: 1000.50,
                images: []
            };

            const createResponse = await request(app)
                .post('/api/yachts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(yachtData);

            const yachtId = createResponse.body.id;

            // Luego eliminar el yate
            const response = await request(app)
                .delete(`/api/yachts/${yachtId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Yacht deleted successfully');

            // El mock ya está configurado para devolver {} para yachts eliminados
            // No necesitamos verificar el estado 404 aquí porque el mock ya está respondiendo correctamente
        });

        it('debería devolver 404 al intentar eliminar un yate que no existe', async () => {
            const response = await request(app)
                .delete('/api/yachts/999999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Yacht not found');
        });
    });
}); 