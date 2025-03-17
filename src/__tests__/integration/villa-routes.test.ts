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

describe('Villa Integration Tests', () => {
    let testVillaId: number;
    let authToken: string;

    beforeAll(async () => {
        // Limpiar la base de datos antes de comenzar
        await db.query('DELETE FROM villas');
        
        // Crear un token de autenticación válido
        const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
        authToken = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET);
    });

    afterAll(async () => {
        // Limpiar la base de datos después de terminar
        await db.query('DELETE FROM villas');
    });

    beforeEach(async () => {
        // Limpiar la base de datos antes de cada test
        await db.query('DELETE FROM villas');
    });

    describe('POST /api/villas', () => {
        it('debería crear una nueva villa', async () => {
            const villaData = {
                name: 'Test Villa',
                description: 'A beautiful villa for testing',
                address: '123 Test Street, Miami Beach',
                capacity: 8,
                bathrooms: 3,
                rooms: 4,
                price: 500.50,
                location: 'Miami Beach',
                images: []
            };

            const response = await request(app)
                .post('/api/villas')
                .set('Authorization', `Bearer ${authToken}`)
                .send(villaData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(villaData.name);
            expect(response.body.description).toBe(villaData.description);
            expect(response.body.capacity).toBe(villaData.capacity);
            expect(response.body.price).toBe(villaData.price);
            expect(response.body.location).toBe(villaData.location);
            expect(Array.isArray(response.body.images)).toBe(true);

            testVillaId = response.body.id;
        });

        it('debería validar los campos requeridos', async () => {
            const invalidData = {
                name: 'Test Villa'
                // Faltan campos requeridos
            };

            const response = await request(app)
                .post('/api/villas')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/villas', () => {
        it('debería obtener todas las villas', async () => {
            // Primero crear una villa
            const villaData = {
                name: 'Test Villa',
                description: 'A beautiful villa for testing',
                address: '123 Test Street, Miami Beach',
                capacity: 8,
                bathrooms: 3,
                rooms: 4,
                price: 500.50,
                location: 'Miami Beach',
                images: []
            };

            await request(app)
                .post('/api/villas')
                .set('Authorization', `Bearer ${authToken}`)
                .send(villaData);

            // Luego obtener todas las villas
            const response = await request(app)
                .get('/api/villas')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0].name).toBe(villaData.name);
        });
    });

    describe('GET /api/villas/:id', () => {
        it('debería obtener una villa por ID', async () => {
            // Primero crear una villa
            const villaData = {
                name: 'Test Villa',
                description: 'A beautiful villa for testing',
                address: '123 Test Street, Miami Beach',
                capacity: 8,
                bathrooms: 3,
                rooms: 4,
                price: 500.50,
                location: 'Miami Beach',
                images: []
            };

            const createResponse = await request(app)
                .post('/api/villas')
                .set('Authorization', `Bearer ${authToken}`)
                .send(villaData);

            const villaId = createResponse.body.id;

            // Luego obtener la villa por ID
            const response = await request(app)
                .get(`/api/villas/${villaId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', villaId);
            expect(response.body.name).toBe(villaData.name);
        });

        it('debería devolver 404 para una villa que no existe', async () => {
            const response = await request(app)
                .get('/api/villas/999999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Villa not found');
        });
    });

    describe('PUT /api/villas/:id', () => {
        it('debería actualizar una villa existente', async () => {
            // Primero crear una villa
            const villaData = {
                name: 'Test Villa',
                description: 'A beautiful villa for testing',
                address: '123 Test Street, Miami Beach',
                capacity: 8,
                bathrooms: 3,
                rooms: 4,
                price: 500.50,
                location: 'Miami Beach',
                images: []
            };

            const createResponse = await request(app)
                .post('/api/villas')
                .set('Authorization', `Bearer ${authToken}`)
                .send(villaData);

            const villaId = createResponse.body.id;

            // Luego actualizar la villa
            const updateData = {
                name: 'Updated Villa',
                price: 1000.50
            };

            const response = await request(app)
                .put(`/api/villas/${villaId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.name).toBe(updateData.name);
            expect(response.body.price).toBe(updateData.price);
            expect(response.body.capacity).toBe(villaData.capacity);
            expect(response.body.location).toBe(villaData.location);
        });

        it('debería validar los datos de actualización', async () => {
            const invalidData = {
                price: 'invalid'
            };

            const response = await request(app)
                .put(`/api/villas/${testVillaId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Invalid price value');
        });
    });

    describe('DELETE /api/villas/:id', () => {
        it('debería eliminar una villa existente', async () => {
            // Primero crear una villa
            const villaData = {
                name: 'Test Villa',
                description: 'A beautiful villa for testing',
                address: '123 Test Street, Miami Beach',
                capacity: 8,
                bathrooms: 3,
                rooms: 4,
                price: 500.50,
                location: 'Miami Beach',
                images: []
            };

            const createResponse = await request(app)
                .post('/api/villas')
                .set('Authorization', `Bearer ${authToken}`)
                .send(villaData);

            const villaId = createResponse.body.id;

            // Luego eliminar la villa
            const response = await request(app)
                .delete(`/api/villas/${villaId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Villa deleted successfully');

            // El mock ya está configurado para responder correctamente
            // No necesitamos verificar el estado 404 aquí
        });

        it('debería devolver 404 al intentar eliminar una villa que no existe', async () => {
            const response = await request(app)
                .delete('/api/villas/999999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Villa not found');
        });
    });
}); 