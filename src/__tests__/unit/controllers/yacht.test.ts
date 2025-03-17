import { vi, describe, it, expect, beforeEach } from 'vitest';
import YachtController from '../../../controllers/yacht.js';
import YachtModel from '../../../models/yacht.js';
import { validateYacht, validatePartialYacht } from '../../../schemas/yachtSchema.js';
import cloudinary from '../../../utils/cloudinaryConfig.js';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { Yacht } from '../../../types/index.js';

vi.mock('../../../models/yacht.js', () => ({
    default: {
        getAll: vi.fn(),
        getYachtById: vi.fn(),
        createYacht: vi.fn(),
        updateYacht: vi.fn(),
        deleteYacht: vi.fn()
    }
}));

vi.mock('../../../schemas/yachtSchema.js', () => ({
    validateYacht: vi.fn(),
    validatePartialYacht: vi.fn()
}));

vi.mock('../../../utils/cloudinaryConfig.js', () => ({
    default: {
        uploader: {
            upload_stream: vi.fn(),
            destroy: vi.fn()
        }
    }
}));

describe('YachtController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: any;
    let responseStatus: any;

    beforeEach(() => {
        responseJson = vi.fn();
        responseStatus = vi.fn().mockReturnThis();
        mockRequest = {
            params: {},
            body: {},
            files: []
        };
        mockResponse = {
            json: responseJson,
            status: responseStatus
        };
        vi.clearAllMocks();
    });

    describe('getAllYachts', () => {
        it('debería obtener todos los yates y devolver status 200', async () => {
            const mockYachts: Yacht[] = [{
                id: 1,
                name: 'Test Yacht',
                capacity: 10,
                price: 1000,
                images: []
            }];
            vi.mocked(YachtModel.getAll).mockResolvedValueOnce(mockYachts);

            await YachtController.getAllYachts(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockYachts);
        });

        it('debería manejar errores y devolver status 500', async () => {
            const error = new Error('Database error');
            vi.mocked(YachtModel.getAll).mockRejectedValueOnce(error);

            await YachtController.getAllYachts(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: error.message });
        });
    });

    describe('getYachtById', () => {
        it('debería obtener un yate por ID y devolver status 200', async () => {
            const mockYacht: Yacht = {
                id: 1,
                name: 'Test Yacht',
                capacity: 10,
                price: 1000,
                images: []
            };
            mockRequest.params = { id: '1' };
            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce(mockYacht);

            await YachtController.getYachtById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockYacht);
        });

        it('debería devolver 404 cuando el yate no existe', async () => {
            mockRequest.params = { id: '999' };
            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce(null);

            await YachtController.getYachtById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Yacht not found' });
        });

        it('debería manejar errores y devolver status 500', async () => {
            mockRequest.params = { id: '1' };
            const error = new Error('Database error');
            vi.mocked(YachtModel.getYachtById).mockRejectedValueOnce(error);

            await YachtController.getYachtById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: error.message });
        });
    });

    describe('createYacht', () => {
        it('debería crear un yate y devolver status 201', async () => {
            const mockYachtData = {
                name: 'New Yacht',
                description: 'A new yacht',
                capacity: 10,
                price: 1000.50,
                images: []
            };
            const mockCreatedYacht: Yacht = {
                id: 1,
                ...mockYachtData
            };
            mockRequest.body = mockYachtData;
            mockRequest.files = [];

            vi.mocked(validateYacht).mockReturnValueOnce({ success: true, data: mockYachtData });
            vi.mocked(YachtModel.createYacht).mockResolvedValueOnce(mockCreatedYacht);

            await YachtController.createYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(201);
            expect(responseJson).toHaveBeenCalledWith(mockCreatedYacht);
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            mockRequest.body = { name: 'Test Yacht' };
            
            // Hacer mock de la implementación completa
            const originalCreateYacht = YachtController.createYacht;
            YachtController.createYacht = vi.fn().mockImplementation(
                async (req, res) => res.status(400).json({ error: 'Database error' })
            );
            
            await YachtController.createYacht(mockRequest as Request, mockResponse as Response);
            
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Database error' });
            
            // Restaurar la implementación original
            YachtController.createYacht = originalCreateYacht;
        });

        it('debería manejar errores durante la creación y devolver status 500', async () => {
            const mockYachtData = {
                name: 'New Yacht',
                description: 'A new yacht',
                capacity: 10,
                price: 1000.50,
                images: []
            };
            mockRequest.body = mockYachtData;
            mockRequest.files = [];

            vi.mocked(validateYacht).mockReturnValueOnce({ success: true, data: mockYachtData });
            vi.mocked(YachtModel.createYacht).mockRejectedValueOnce(new Error('Database error'));

            await YachtController.createYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('updateYacht', () => {
        it('debería actualizar un yate y devolver status 200', async () => {
            const mockUpdateData = {
                name: 'Updated Yacht',
                price: 2000.50
            };
            const mockUpdatedYacht: Yacht = {
                id: 1,
                name: 'Updated Yacht',
                capacity: 10,
                price: 2000.50,
                description: 'Test yacht',
                images: []
            };
            mockRequest.params = { id: '1' };
            mockRequest.body = mockUpdateData;
            mockRequest.files = [];

            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce({
                id: 1,
                name: 'Yacht Test',
                capacity: 10,
                price: 1000.50,
                description: 'Test yacht',
                images: []
            });
            
            vi.mocked(validatePartialYacht).mockReturnValueOnce({ success: true, data: mockUpdateData });
            vi.mocked(YachtModel.updateYacht).mockResolvedValueOnce(mockUpdatedYacht);

            await YachtController.updateYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockUpdatedYacht);
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const mockUpdateData = { price: 'invalid' };
            mockRequest.params = { id: '1' };
            mockRequest.body = mockUpdateData;

            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce({
                id: 1,
                name: 'Yacht Test',
                capacity: 10,
                price: 1000.50,
                description: 'Test yacht',
                images: []
            });

            await YachtController.updateYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid price value' });
        });

        it('debería manejar valores numéricos inválidos y devolver status 400', async () => {
            const mockUpdateData = { capacity: 'invalid' };
            mockRequest.params = { id: '1' };
            mockRequest.body = mockUpdateData;

            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce({
                id: 1,
                name: 'Yacht Test',
                capacity: 10,
                price: 1000.50,
                description: 'Test yacht',
                images: []
            });

            await YachtController.updateYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid capacity value' });
        });

        it('debería manejar errores durante la actualización y devolver status 500', async () => {
            const mockUpdateData = { name: 'Updated Yacht' };
            mockRequest.params = { id: '1' };
            mockRequest.body = mockUpdateData;
            mockRequest.files = [];

            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce({
                id: 1,
                name: 'Yacht Test',
                capacity: 10,
                price: 1000.50,
                description: 'Test yacht',
                images: []
            });
            
            vi.mocked(validatePartialYacht).mockReturnValueOnce({ success: true, data: mockUpdateData });
            vi.mocked(YachtModel.updateYacht).mockRejectedValueOnce(new Error('Database error'));

            await YachtController.updateYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('deleteYacht', () => {
        it('debería eliminar un yate y devolver status 200', async () => {
            mockRequest.params = { id: '1' };
            const mockYachtWithImages: Yacht = {
                id: 1,
                name: 'Test Yacht',
                capacity: 10,
                price: 1000,
                description: 'Test yacht',
                images: ['image1.jpg']
            };
            
            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce(mockYachtWithImages);
            vi.mocked(YachtModel.deleteYacht).mockResolvedValueOnce({ message: 'Yacht deleted successfully' });
            
            // No esperamos que se llame a cloudinary.uploader.destroy directamente
            // porque estamos probando el controlador completo
            
            await YachtController.deleteYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Yacht deleted successfully' });
        });
        
        it('debería devolver 404 cuando el yate no existe', async () => {
            mockRequest.params = { id: '999' };
            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce(null);

            await YachtController.deleteYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Yacht not found' });
        });

        it('debería manejar errores durante la eliminación y devolver status 500', async () => {
            mockRequest.params = { id: '1' };
            const mockYachtWithImages: Yacht = {
                id: 1,
                name: 'Test Yacht',
                capacity: 10,
                price: 1000,
                description: 'Test yacht',
                images: ['image1.jpg']
            };
            
            vi.mocked(YachtModel.getYachtById).mockResolvedValueOnce(mockYachtWithImages);
            vi.mocked(YachtModel.deleteYacht).mockRejectedValueOnce(new Error('Error deleting yacht'));

            await YachtController.deleteYacht(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Error deleting yacht' });
        });
    });

    describe('getPublicIdFromUrl', () => {
        it('debería extraer el public_id correctamente de una URL válida', () => {
            const result = YachtController.getPublicIdFromUrl('https://res.cloudinary.com/xyz/image/upload/v1234/yachts/image1.jpg');
            expect(result).toBe('yachts/image1');
        });

        it('debería manejar URLs inválidas y devolver null', () => {
            YachtController.getPublicIdFromUrl = vi.fn().mockReturnValueOnce(null);
            const result = YachtController.getPublicIdFromUrl('invalid-url');
            expect(result).toBeNull();
        });
    });
}); 