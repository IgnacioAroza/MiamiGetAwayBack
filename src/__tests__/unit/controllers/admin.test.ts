import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminController from '../../../controllers/admin.js';
import AdminModel from '../../../models/admin.js';
import { validateAdmin, validatePartialAdmin } from '../../../schemas/adminSchema.js';

// Mocks
vi.mock('../../../models/admin.js', () => ({
    default: {
        getAll: vi.fn(),
        getAdminById: vi.fn(),
        createAdmin: vi.fn(),
        updateAdmin: vi.fn(),
        deleteAdmin: vi.fn()
    }
}));

vi.mock('../../../schemas/adminSchema.js', () => ({
    validateAdmin: vi.fn(),
    validatePartialAdmin: vi.fn()
}));

describe('AdminController', () => {
    let req: any;
    let res: any;
    const mockAdmin = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123'
    };

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        
        vi.clearAllMocks();
    });

    describe('getAllAdmins', () => {
        it('debería obtener todos los administradores y devolver status 200', async () => {
            const mockAdmins = [mockAdmin, { ...mockAdmin, id: 2, email: 'admin2@example.com' }];
            (AdminModel.getAll as any).mockResolvedValueOnce(mockAdmins);

            await AdminController.getAllAdmins(req, res);

            expect(AdminModel.getAll).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockAdmins);
        });

        it('debería manejar errores y devolver status 500', async () => {
            const error = new Error('Database error');
            (AdminModel.getAll as any).mockRejectedValueOnce(error);

            await AdminController.getAllAdmins(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('getAdminById', () => {
        it('debería obtener un administrador por ID y devolver status 200', async () => {
            req.params.id = '1';
            (AdminModel.getAdminById as any).mockResolvedValueOnce(mockAdmin);

            await AdminController.getAdminById(req, res);

            expect(AdminModel.getAdminById).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockAdmin);
        });

        it('debería devolver 404 cuando el administrador no existe', async () => {
            req.params.id = '999';
            (AdminModel.getAdminById as any).mockResolvedValueOnce(null);

            await AdminController.getAdminById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Admin not found' });
        });

        it('debería manejar errores y devolver status 500', async () => {
            req.params.id = '1';
            const error = new Error('Database error');
            (AdminModel.getAdminById as any).mockRejectedValueOnce(error);

            await AdminController.getAdminById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('createAdmin', () => {
        it('debería crear un nuevo administrador y devolver status 201', async () => {
            const { id, ...adminData } = mockAdmin;
            req.body = adminData;
            
            (validateAdmin as any).mockReturnValueOnce({ success: true, data: adminData });
            (AdminModel.createAdmin as any).mockResolvedValueOnce(mockAdmin);

            await AdminController.createAdmin(req, res);

            expect(AdminModel.createAdmin).toHaveBeenCalledWith(adminData);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockAdmin);
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const adminData = { email: 'invalid' };
            req.body = adminData;
            
            const validationError = { 
                success: false, 
                error: { message: JSON.stringify({ errors: [{ message: 'Invalid email' }] }) } 
            };
            (validateAdmin as any).mockReturnValueOnce(validationError);

            await AdminController.createAdmin(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: expect.any(Object) });
        });

        it('debería manejar errores durante la creación y devolver status 500', async () => {
            const { id, ...adminData } = mockAdmin;
            req.body = adminData;
            
            (validateAdmin as any).mockReturnValueOnce({ success: true, data: adminData });
            const error = new Error('Database error');
            (AdminModel.createAdmin as any).mockRejectedValueOnce(error);

            await AdminController.createAdmin(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('updateAdmin', () => {
        it('debería actualizar un administrador y devolver status 200', async () => {
            const updateData = { username: 'updated_admin' };
            req.params.id = '1';
            req.body = updateData;
            
            (validatePartialAdmin as any).mockReturnValueOnce({ success: true, data: updateData });
            (AdminModel.updateAdmin as any).mockResolvedValueOnce({ ...mockAdmin, ...updateData });

            await AdminController.updateAdmin(req, res);

            expect(AdminModel.updateAdmin).toHaveBeenCalledWith(1, updateData);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ ...mockAdmin, ...updateData });
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const updateData = { username: '' };
            req.params.id = '1';
            req.body = updateData;
            
            const validationError = { 
                success: false, 
                error: { message: JSON.stringify({ errors: [{ message: 'Username is required' }] }) } 
            };
            (validatePartialAdmin as any).mockReturnValueOnce(validationError);

            await AdminController.updateAdmin(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: expect.any(Object) });
        });

        it('debería manejar errores durante la actualización y devolver status 500', async () => {
            const updateData = { username: 'updated_admin' };
            req.params.id = '1';
            req.body = updateData;
            
            (validatePartialAdmin as any).mockReturnValueOnce({ success: true, data: updateData });
            const error = new Error('Database error');
            (AdminModel.updateAdmin as any).mockRejectedValueOnce(error);

            await AdminController.updateAdmin(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('deleteAdmin', () => {
        it('debería eliminar un administrador y devolver status 200', async () => {
            req.params.id = '1';
            (AdminModel.deleteAdmin as any).mockResolvedValueOnce({ 
                success: true, 
                message: 'Admin deleted successfully' 
            });

            await AdminController.deleteAdmin(req, res);

            expect(AdminModel.deleteAdmin).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Admin deleted successfully' });
        });

        it('debería manejar el caso cuando el administrador no existe y devolver status 404', async () => {
            req.params.id = '999';
            const error = new Error('Admin not found');
            (AdminModel.deleteAdmin as any).mockRejectedValueOnce(error);

            await AdminController.deleteAdmin(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Admin not found' });
        });

        it('debería manejar errores durante la eliminación y devolver status 500', async () => {
            req.params.id = '1';
            const error = new Error('Database error');
            (AdminModel.deleteAdmin as any).mockRejectedValueOnce(error);

            await AdminController.deleteAdmin(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });
}); 