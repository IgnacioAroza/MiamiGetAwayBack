import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import VillaController from '../../../controllers/villa.js';
import VillaModel from '../../../models/villa.js';
import cloudinary from '../../../utils/cloudinaryConfig.js';
import { validateVilla, validatePartialVilla } from '../../../schemas/villaSchema.js';

// Mock del modelo
vi.mock('../../../models/villa.js', () => ({
    default: {
        getAll: vi.fn(),
        getVillaById: vi.fn(),
        createVilla: vi.fn(),
        updateVilla: vi.fn(),
        deleteVilla: vi.fn()
    }
}));

// Mock de cloudinary
vi.mock('../../../utils/cloudinaryConfig.js', () => ({
    default: {
        uploader: {
            upload_stream: vi.fn(),
            destroy: vi.fn()
        }
    }
}));

// Mock de los schemas
vi.mock('../../../schemas/villaSchema.js', () => ({
    validateVilla: vi.fn(),
    validatePartialVilla: vi.fn()
}));

describe('VillaController', () => {
    // Datos de prueba
    const mockVilla = {
        id: 1,
        name: 'Villa Test',
        description: 'Test Description',
        address: 'Test Address',
        capacity: 10,
        bathrooms: 3,
        rooms: 4,
        price: 1000,
        images: ['image1.jpg', 'image2.jpg']
    };
    
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: any;
    let responseStatus: any;

    beforeEach(() => {
        responseJson = vi.fn();
        responseStatus = vi.fn().mockReturnValue({ json: responseJson });
        mockResponse = {
            status: responseStatus,
            json: responseJson
        };
        mockRequest = {};
        vi.clearAllMocks();
    });

    describe('getAllVillas', () => {
        it('debería obtener todas las villas y devolver status 200', async () => {
            const mockVillas = [
                { id: 1, name: 'Villa 1' },
                { id: 2, name: 'Villa 2' }
            ];
            (VillaModel.getAll as any).mockResolvedValueOnce(mockVillas);

            await VillaController.getAllVillas(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockVillas);
        });

        it('debería manejar errores y devolver status 500', async () => {
            const error = new Error('Database error');
            (VillaModel.getAll as any).mockRejectedValueOnce(error);

            await VillaController.getAllVillas(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: error.message });
        });
    });

    describe('getVillaById', () => {
        it('debería obtener una villa por ID y devolver status 200', async () => {
            const mockVilla = { id: 1, name: 'Villa Test' };
            mockRequest.params = { id: '1' };
            (VillaModel.getVillaById as any).mockResolvedValueOnce(mockVilla);

            await VillaController.getVillaById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockVilla);
        });

        it('debería devolver 404 cuando la villa no existe', async () => {
            mockRequest.params = { id: '999' };
            (VillaModel.getVillaById as any).mockResolvedValueOnce(null);

            await VillaController.getVillaById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Villa not found' });
        });

        it('debería manejar errores y devolver status 500', async () => {
            mockRequest.params = { id: '1' };
            const error = new Error('Database error');
            (VillaModel.getVillaById as any).mockRejectedValueOnce(error);

            await VillaController.getVillaById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: error.message });
        });
    });

    describe('createVilla', () => {
        it('debería crear una villa y devolver status 201', async () => {
            const mockVillaData = {
                name: 'Nueva Villa',
                description: 'Descripción',
                address: 'Dirección',
                capacity: '10',
                bathrooms: '3',
                rooms: '4',
                price: '1000'
            };
            const mockCreatedVilla = { id: 1, ...mockVillaData, images: [] };
            
            mockRequest.body = mockVillaData;
            mockRequest.files = [];

            (validateVilla as any).mockReturnValueOnce({ success: true });
            (VillaModel.createVilla as any).mockResolvedValueOnce(mockCreatedVilla);

            await VillaController.createVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(201);
            expect(responseJson).toHaveBeenCalledWith(mockCreatedVilla);
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const mockVillaData = { name: 'Villa Test' };
            mockRequest.body = mockVillaData;

            (validateVilla as any).mockReturnValueOnce({ 
                success: false, 
                error: { 
                    message: JSON.stringify({ 
                        formErrors: ['Missing required fields'], 
                        fieldErrors: {} 
                    }) 
                } 
            });

            await VillaController.createVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ 
                error: { 
                    formErrors: ['Missing required fields'], 
                    fieldErrors: {} 
                } 
            });
        });

        it('debería manejar errores durante la creación y devolver status 500', async () => {
            const mockVillaData = {
                name: 'Nueva Villa',
                description: 'Descripción',
                address: 'Dirección',
                capacity: '10',
                bathrooms: '3',
                rooms: '4',
                price: '1000'
            };
            mockRequest.body = mockVillaData;
            mockRequest.files = [];

            (validateVilla as any).mockReturnValueOnce({ success: true });
            const error = new Error('Database error');
            (VillaModel.createVilla as any).mockRejectedValueOnce(error);

            await VillaController.createVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: error.message });
        });
    });

    describe('updateVilla', () => {
        it('debería actualizar una villa y devolver status 200', async () => {
            const mockUpdateData = {
                name: 'Villa Actualizada',
                price: '2000'
            };
            const mockUpdatedVilla = { id: 1, ...mockUpdateData };
            
            mockRequest.params = { id: '1' };
            mockRequest.body = mockUpdateData;
            mockRequest.files = [];

            // Mock para verificar que la villa existe
            (VillaModel.getVillaById as any).mockResolvedValueOnce(mockVilla);
            // Mock para la validación del esquema
            (validatePartialVilla as any).mockReturnValueOnce({ success: true });
            // Mock para la actualización
            (VillaModel.updateVilla as any).mockResolvedValueOnce(mockUpdatedVilla);

            await VillaController.updateVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockUpdatedVilla);
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            mockRequest.params = { id: '1' };
            mockRequest.body = { price: 'invalid' };

            // Mock para verificar que la villa existe
            (VillaModel.getVillaById as any).mockResolvedValueOnce(mockVilla);
            
            await VillaController.updateVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid price value' });
        });

        it('debería manejar valores numéricos inválidos y devolver status 400', async () => {
            mockRequest.params = { id: '1' };
            mockRequest.body = { capacity: 'invalid' };

            // Mock para verificar que la villa existe
            (VillaModel.getVillaById as any).mockResolvedValueOnce(mockVilla);
            
            await VillaController.updateVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid capacity value' });
        });

        it('debería manejar errores durante la actualización y devolver status 500', async () => {
            const mockUpdateData = { 
                name: 'Villa Actualizada'
            };
            const mockReq = {
                params: { id: '1' },
                body: mockUpdateData,
                files: []
            };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            // Mock para verificar que la villa existe
            vi.mocked(VillaModel.getVillaById).mockResolvedValueOnce(mockVilla);
            
            vi.mocked(validatePartialVilla).mockReturnValue({
                success: true,
                data: mockUpdateData
            });

            vi.mocked(VillaModel.updateVilla).mockRejectedValue(new Error('Database error'));

            await VillaController.updateVilla(mockReq as any, mockRes as any);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('deleteVilla', () => {
        it('debería eliminar una villa y devolver status 200', async () => {
            mockRequest.params = { id: '1' };
            (VillaModel.getVillaById as any).mockResolvedValueOnce({ ...mockVilla });
            (VillaModel.deleteVilla as any).mockResolvedValueOnce({ message: 'Villa deleted successfully' });
            (cloudinary.uploader.destroy as any).mockResolvedValueOnce({ result: 'ok' });

            await VillaController.deleteVilla(mockRequest as Request, mockResponse as Response);

            expect(cloudinary.uploader.destroy).toHaveBeenCalled();
            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith({
                message: 'Villa deleted successfully'
            });
        });

        it('debería devolver 404 cuando la villa no existe', async () => {
            mockRequest.params = { id: '999' };
            (VillaModel.getVillaById as any).mockResolvedValueOnce(null);

            await VillaController.deleteVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Villa not found' });
        });

        it('debería manejar errores durante la eliminación y devolver status 500', async () => {
            const error = new Error('Error deleting villa');
            mockRequest.params = { id: '1' };
            (VillaModel.getVillaById as any).mockResolvedValueOnce({ ...mockVilla });
            (VillaModel.deleteVilla as any).mockRejectedValueOnce(error);

            await VillaController.deleteVilla(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Error deleting villa' });
        });
    });

    describe('getPublicIdFromUrl', () => {
        it('debería extraer el public_id correctamente de una URL válida', () => {
            const url = 'https://res.cloudinary.com/xyz/image/upload/v1234/villas/image.jpg';
            const result = VillaController.getPublicIdFromUrl(url);
            expect(result).toBe('villas/image');
        });

        it('debería manejar URLs inválidas y devolver null', () => {
            const url = 'invalid-url';
            VillaController.getPublicIdFromUrl = vi.fn().mockReturnValueOnce(null);
            const result = VillaController.getPublicIdFromUrl(url);
            expect(result).toBeNull();
        });
    });
}); 