import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminModel from '../../../models/admin.js';
import db from '../../../utils/db_render.js';
import { validateAdmin, validatePartialAdmin } from '../../../schemas/adminSchema.js';
import { Admin } from '../../../types/index.js';

// Mock de la base de datos
vi.mock('../../../utils/db_render.js', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock del schema
vi.mock('../../../schemas/adminSchema.js', () => ({
    validateAdmin: vi.fn(),
    validatePartialAdmin: vi.fn()
}));

describe('AdminModel', () => {
    const mockAdmin: Admin = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuración predeterminada para validateAdmin
        (validateAdmin as any).mockReturnValue({ success: true, data: {} });
        (validatePartialAdmin as any).mockReturnValue({ success: true, data: {} });
    });

    describe('getAll', () => {
        it('debería obtener todos los administradores', async () => {
            const mockAdmins = [mockAdmin, { ...mockAdmin, id: 2, email: 'admin2@example.com' }];
            (db.query as any).mockResolvedValueOnce({ rows: mockAdmins });
            
            const result = await AdminModel.getAll();
            
            expect(result).toEqual(mockAdmins);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM admins');
        });

        it('debería manejar errores y reenviarlos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));
            
            await expect(AdminModel.getAll()).rejects.toThrow('Database error');
        });
    });

    describe('getAdminById', () => {
        it('debería obtener un administrador por ID', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [mockAdmin] });

            const result = await AdminModel.getAdminById(1);

            expect(result).toEqual(mockAdmin);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM admins WHERE id = $1', [1]);
        });

        it('debería devolver null cuando el administrador no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const result = await AdminModel.getAdminById(999);

            expect(result).toBeNull();
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM admins WHERE id = $1', [999]);
        });

        it('debería manejar errores y reenviarlos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminModel.getAdminById(1)).rejects.toThrow('Database error');
        });
    });

    describe('createAdmin', () => {
        it('debería crear un nuevo administrador', async () => {
            const { id, ...newAdmin } = mockAdmin;

            (validateAdmin as any).mockReturnValueOnce({ success: true, data: newAdmin });
            (db.query as any).mockResolvedValueOnce({ 
                rows: [{ id: 1, ...newAdmin }] 
            });

            const result = await AdminModel.createAdmin(newAdmin as Admin);

            expect(result).toEqual({ id: 1, ...newAdmin });
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO admins (username, email, password) VALUES ($1, $2, $3) RETURNING *;',
                [newAdmin.username, newAdmin.email, newAdmin.password]
            );
        });

        it('debería manejar errores de validación', async () => {
            const { id, ...newAdmin } = mockAdmin;
            const validationError = { 
                success: false, 
                error: { message: JSON.stringify({ errors: [{ message: 'Validation error' }] }) } 
            };
            
            (validateAdmin as any).mockReturnValueOnce(validationError);

            await expect(AdminModel.createAdmin(newAdmin as Admin)).rejects.toThrow();
        });

        it('debería manejar errores cuando faltan campos requeridos', async () => {
            const invalidAdmin = { email: 'invalid@example.com' } as unknown as Admin;
            
            (validateAdmin as any).mockReturnValueOnce({ success: true, data: invalidAdmin });

            await expect(AdminModel.createAdmin(invalidAdmin)).rejects.toThrow('Missing required fields');
            expect(db.query).not.toHaveBeenCalled();
        });

        it('debería manejar errores de base de datos', async () => {
            const { id, ...newAdmin } = mockAdmin;
            
            (validateAdmin as any).mockReturnValueOnce({ success: true, data: newAdmin });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminModel.createAdmin(newAdmin as Admin)).rejects.toThrow('Database error');
        });
    });

    describe('updateAdmin', () => {
        it('debería actualizar un administrador', async () => {
            const updateData = {
                username: 'updated_admin',
                email: 'updated.admin@example.com'
            };
            const updatedAdmin = { ...mockAdmin, ...updateData };
            
            (validatePartialAdmin as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockResolvedValueOnce({ rowCount: 1 }); // Para el UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [updatedAdmin] }); // Para el SELECT

            const result = await AdminModel.updateAdmin(1, updateData);

            expect(result).toEqual(updatedAdmin);
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('debería manejar errores cuando no hay campos para actualizar', async () => {
            (validatePartialAdmin as any).mockReturnValueOnce({ success: true, data: {} });
            
            await expect(AdminModel.updateAdmin(1, {})).rejects.toThrow('No valid fields to update');
        });

        it('debería manejar errores cuando el administrador no existe', async () => {
            const updateData = { username: 'updated_admin' };
            
            (validatePartialAdmin as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockResolvedValueOnce({ rowCount: 1 }); // Para el UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [] }); // Para el SELECT (no encontró el administrador)

            await expect(AdminModel.updateAdmin(999, updateData)).rejects.toThrow('Admin not found');
        });

        it('debería manejar errores de base de datos', async () => {
            const updateData = { username: 'updated_admin' };
            
            (validatePartialAdmin as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminModel.updateAdmin(1, updateData)).rejects.toThrow('Database error');
        });
    });

    describe('deleteAdmin', () => {
        it('debería eliminar un administrador', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const result = await AdminModel.deleteAdmin(1);

            expect(result).toEqual({ message: 'Admin deleted successfully' });
            expect(db.query).toHaveBeenCalledWith('DELETE FROM admins WHERE id = $1 RETURNING *;', [1]);
        });

        it('debería manejar errores cuando el administrador no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            await expect(AdminModel.deleteAdmin(999)).rejects.toThrow('Admin not found');
            expect(db.query).toHaveBeenCalledWith('DELETE FROM admins WHERE id = $1 RETURNING *;', [999]);
        });

        it('debería manejar errores de base de datos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminModel.deleteAdmin(1)).rejects.toThrow('Database error');
        });
    });
}); 