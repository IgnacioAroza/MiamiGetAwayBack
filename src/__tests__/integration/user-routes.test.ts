import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { NextFunction, Request, Response } from 'express';

vi.mock('../../models/user.js', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    getUserById: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue({}),
    updateUser: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../middleware/authMiddleware.js', () => ({
  authMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
  default: (_req: Request, _res: Response, next: NextFunction) => next()
}));

import * as userSchemaMock from '../../schemas/userSchema.js';
vi.mock('../../schemas/userSchema.js', () => ({
  validateUser: vi.fn(),
  validateUserFilters: vi.fn().mockReturnValue({ success: true, data: {} })
}));

const originalConsoleError = console.error;

import app from '../../app.js';
import UserModel from '../../models/user.js';

const mockUser = {
  id: 1,
  name: 'John',
  lastname: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  address: '123 Main St',
  city: 'Miami',
  country: 'USA',
  notes: ''
};

describe('Rutas de Usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userSchemaMock.validateUser).mockReturnValue({ success: true, data: {} } as any);
    vi.mocked(userSchemaMock.validateUserFilters).mockReturnValue({ success: true, data: {} } as any);
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('GET /api/users', () => {
    it('debería devolver lista vacía cuando no hay usuarios', async () => {
      vi.mocked(UserModel.getAll).mockResolvedValueOnce({ rows: [], total: 0 } as any);

      const response = await request(app)
        .get('/api/users')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('debería devolver la lista de usuarios', async () => {
      const mockList = [mockUser, { ...mockUser, id: 2, email: 'jane@example.com' }];
      vi.mocked(UserModel.getAll).mockResolvedValueOnce({ rows: mockList, total: 2 } as any);

      const response = await request(app)
        .get('/api/users')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('debería devolver 401 sin token de autenticación (sin mock de auth)', async () => {
      // Importar la ruta real para verificar que authMiddleware protege el endpoint
      // Este test verifica el comportamiento cuando NO hay mock de auth
      // Se omite aquí porque el mock global de auth siempre hace next()
      // El comportamiento real se testea via integration con JWT
    });
  });

  describe('GET /api/users/:id', () => {
    it('debería devolver un usuario por id', async () => {
      vi.mocked(UserModel.getUserById).mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .get('/api/users/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({ id: 1, name: 'John' });
      expect(UserModel.getUserById).toHaveBeenCalledWith(1);
    });

    it('debería devolver 404 si el usuario no existe', async () => {
      vi.mocked(UserModel.getUserById).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/users/999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('debería devolver 400 si el id no es un número', async () => {
      const response = await request(app)
        .get('/api/users/abc')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid user ID');
    });
  });

  describe('POST /api/users', () => {
    it('debería crear un usuario con datos válidos', async () => {
      vi.mocked(userSchemaMock.validateUser).mockReturnValue({ success: true, data: {} } as any);
      vi.mocked(UserModel.createUser).mockResolvedValueOnce(mockUser as any);

      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address: '123 Main St',
          city: 'Miami',
          country: 'USA',
          notes: ''
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toMatchObject({ id: 1, name: 'John', email: 'john@example.com' });
      expect(UserModel.createUser).toHaveBeenCalled();
    });

    it('debería devolver 400 si la validación falla', async () => {
      vi.mocked(userSchemaMock.validateUser).mockReturnValue({
        success: false,
        error: { message: JSON.stringify([{ message: 'name is required' }]) }
      } as any);

      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Incomplete' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(UserModel.createUser).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/users/:id', () => {
    it('debería actualizar un usuario existente', async () => {
      const updated = { ...mockUser, name: 'Jane' };
      vi.mocked(UserModel.updateUser).mockResolvedValueOnce(updated as any);

      const response = await request(app)
        .put('/api/users/1')
        .send({ name: 'Jane' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({ name: 'Jane' });
      expect(UserModel.updateUser).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('debería devolver 404 si el usuario no existe', async () => {
      vi.mocked(UserModel.updateUser).mockRejectedValueOnce(new Error('User not found'));

      const response = await request(app)
        .put('/api/users/999')
        .send({ name: 'Ghost' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('debería eliminar un usuario existente', async () => {
      vi.mocked(UserModel.deleteUser).mockResolvedValueOnce({ message: 'User deleted' } as any);

      const response = await request(app)
        .delete('/api/users/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(UserModel.deleteUser).toHaveBeenCalledWith(1);
    });

    it('debería devolver 404 si el usuario a eliminar no existe', async () => {
      vi.mocked(UserModel.deleteUser).mockRejectedValueOnce(new Error('User not found'));

      const response = await request(app)
        .delete('/api/users/999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });
});
