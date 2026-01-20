import { describe, it, expect, beforeEach, vi } from 'vitest';
import UserModel from '../../../models/user.js';
import db from '../../../utils/db_render.js';
import { validateUser, validatePartialUser } from '../../../schemas/userSchema.js';
import { Client } from '../../../types/index.js';

// Mock de la base de datos
vi.mock('../../../utils/db_render.js', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock del schema
vi.mock('../../../schemas/userSchema.js', () => ({
    validateUser: vi.fn(),
    validatePartialUser: vi.fn()
}));

describe('UserModel', () => {
    const mockUser: Client = {
        id: 1,
        name: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        phone: '123456789',
        address: '123 Main St',
        city: 'Miami',
        country: 'USA',
        notes: 'Test notes'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuración predeterminada para validateUser y validatePartialUser
        (validateUser as any).mockReturnValue({ success: true, data: {} });
        (validatePartialUser as any).mockReturnValue({ success: true, data: {} });
    });

    describe('getAll', () => {
        it('debería obtener todos los usuarios', async () => {
            // Mock para devolver un array de usuarios
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1, name: 'John' }] });
            
            const result = await UserModel.getAll();
            
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM clients', []);
            expect(result).toEqual([{ id: 1, name: 'John' }]);
        });

        it('debería aplicar filtros correctamente', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            await UserModel.getAll({ name: 'John', email: 'example' });

            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM clients WHERE name ILIKE $1 AND email ILIKE $2',
                ['%John%', '%example%']
            );
        });
        
        it('debería devolver un array vacío cuando hay un error', async () => {
            // Mock para simular un error de base de datos
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));
            
            const result = await UserModel.getAll();
            
            expect(result).toEqual([]);
        });
    });

    describe('getUserById', () => {
        it('debería obtener un usuario por ID', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [mockUser] });

            const result = await UserModel.getUserById(1);

            expect(result).toEqual(mockUser);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM clients WHERE id = $1', [1]);
        });

        it('debería devolver null cuando el usuario no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const result = await UserModel.getUserById(999);

            expect(result).toBeNull();
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM clients WHERE id = $1', [999]);
        });

        it('debería manejar errores y reenviarlos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(UserModel.getUserById(1)).rejects.toThrow('Database error');
        });
    });

    describe('createUser', () => {
        it('debería crear un nuevo usuario', async () => {
            const { id, ...newUser } = mockUser;

            (validateUser as any).mockReturnValueOnce({ success: true, data: newUser });
            (db.query as any).mockResolvedValueOnce({ 
                rows: [{ id: 1, ...newUser }] 
            });

            const result = await UserModel.createUser(newUser as unknown as Client);

            expect(result).toEqual({ id: 1, ...newUser });
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO clients (name, lastname, email, phone, address, city, country, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;',
                [newUser.name, newUser.lastname, newUser.email, newUser.phone, newUser.address, newUser.city, newUser.country, newUser.notes]
            );
        });

        it('debería manejar errores de validación', async () => {
            const { id, ...newUser } = mockUser;
            const validationError = { 
                success: false, 
                error: { message: JSON.stringify({ errors: [{ message: 'Validation error' }] }) } 
            };
            
            (validateUser as any).mockReturnValueOnce(validationError);

            await expect(UserModel.createUser(newUser as unknown as Client)).rejects.toThrow();
        });

        it('debería manejar errores cuando faltan campos requeridos', async () => {
            const invalidUser = { email: 'invalid@example.com' } as unknown as Client;
            
            (validateUser as any).mockReturnValueOnce({ success: true, data: invalidUser });

            await expect(UserModel.createUser(invalidUser)).rejects.toThrow('Missing required fields');
            expect(db.query).not.toHaveBeenCalled();
        });

        it('debería manejar errores de base de datos', async () => {
            const { id, ...newUser } = mockUser;
            
            (validateUser as any).mockReturnValueOnce({ success: true, data: newUser });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(UserModel.createUser(newUser as unknown as Client)).rejects.toThrow('Database error');
        });
    });

    describe('updateUser', () => {
        it('debería actualizar un usuario', async () => {
            const updateData = {
                name: 'Updated Name',
                email: 'updated.email@example.com'
            };
            const updatedUser = { ...mockUser, ...updateData };
            
            (validatePartialUser as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockResolvedValueOnce({ rowCount: 1 }); // Para el UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [updatedUser] }); // Para el SELECT

            const result = await UserModel.updateUser(1, updateData);

            expect(result).toEqual(updatedUser);
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('debería manejar errores cuando no hay campos para actualizar', async () => {
            (validatePartialUser as any).mockReturnValueOnce({ success: true, data: {} });
            
            await expect(UserModel.updateUser(1, {})).rejects.toThrow('No valid fields to update');
        });

        it('debería manejar errores cuando el usuario no existe', async () => {
            const updateData = { name: 'Updated Name' };
            
            (validatePartialUser as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockResolvedValueOnce({ rowCount: 1 }); // Para el UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [] }); // Para el SELECT (no encontró el usuario)

            await expect(UserModel.updateUser(999, updateData)).rejects.toThrow('User not found');
        });

        it('debería manejar errores de base de datos', async () => {
            const updateData = { name: 'Updated Name' };
            
            (validatePartialUser as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(UserModel.updateUser(1, updateData)).rejects.toThrow('Database error');
        });
    });

    describe('deleteUser', () => {
        it('debería eliminar un usuario', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const result = await UserModel.deleteUser(1);

            expect(result).toEqual({ message: 'User deleted successfully' });
            expect(db.query).toHaveBeenCalledWith('DELETE FROM clients WHERE id = $1 RETURNING *;', [1]);
        });

        it('debería manejar errores cuando el usuario no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            await expect(UserModel.deleteUser(999)).rejects.toThrow('User not found');
            expect(db.query).toHaveBeenCalledWith('DELETE FROM clients WHERE id = $1 RETURNING *;', [999]);
        });

        it('debería manejar errores de base de datos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(UserModel.deleteUser(1)).rejects.toThrow('Database error');
        });
    });
}); 
