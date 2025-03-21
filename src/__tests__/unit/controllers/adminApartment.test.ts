import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import AdminApartmentController from '../../../controllers/adminApartment.js';
import { AdminApartmentModel } from '../../../models/adminApartment.js';
import { validateApartment, validatePartialApartment } from '../../../schemas/adminApartmentSchema.js';
import cloudinary from '../../../utils/cloudinaryConfig.js';

// Definición de tipo File para tests
interface MockFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
}

// Mock del modelo
vi.mock('../../../models/adminApartment.js', () => ({
    AdminApartmentModel: {
        getAllApartments: vi.fn(),
        getApartmentById: vi.fn(),
        createApartment: vi.fn(),
        updateApartment: vi.fn(),
        deleteApartment: vi.fn()
    }
}));

// Mock del schema
vi.mock('../../../schemas/adminApartmentSchema.js', () => ({
    validateApartment: vi.fn(),
    validatePartialApartment: vi.fn()
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

describe('AdminApartmentController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseObject: any;

    beforeEach(() => {
        responseObject = {
            statusCode: 0,
            body: {}
        };
        
        mockRequest = {
            body: {},
            params: {},
            files: []
        };
        
        mockResponse = {
            status: vi.fn().mockImplementation((code) => {
                responseObject.statusCode = code;
                return mockResponse;
            }),
            json: vi.fn().mockImplementation((data) => {
                responseObject.body = data;
                return mockResponse;
            })
        };

        vi.clearAllMocks();
    });

    describe('getAllApartments', () => {
        it('debería obtener todos los apartamentos y devolver status 200', async () => {
            const mockApartments = [
                { 
                    id: 1, 
                    buildingName: 'Ocean View', 
                    unitNumber: '305',
                    distribution: '2 beds 2 baths',
                    address: '123 Beach Blvd, Miami, FL',
                    capacity: 4,
                    pricePerNight: 150,
                    cleaningFee: 80,
                    images: ['https://example.com/image1.jpg']
                },
                { 
                    id: 2, 
                    buildingName: 'Mountain View', 
                    unitNumber: '210', 
                    distribution: '1 bed 1 bath',
                    address: '456 Mountain Rd, Denver, CO',
                    capacity: 2,
                    pricePerNight: 100,
                    cleaningFee: 50,
                    images: ['https://example.com/image2.jpg']
                }
            ];
            
            (AdminApartmentModel.getAllApartments as any).mockResolvedValueOnce(mockApartments);

            await AdminApartmentController.getAllApartments(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getAllApartments).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockApartments);
            expect(responseObject.statusCode).toBe(200);
            expect(responseObject.body).toEqual(mockApartments);
        });

        it('debería manejar errores y devolver status 500', async () => {
            (AdminApartmentModel.getAllApartments as any).mockRejectedValueOnce(new Error('Database error'));

            await AdminApartmentController.getAllApartments(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getAllApartments).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error fetching apartments' });
            expect(responseObject.statusCode).toBe(500);
        });
    });

    describe('getApartmentById', () => {
        it('debería obtener un apartamento por ID y devolver status 200', async () => {
            const mockApartment = { 
                id: 1, 
                buildingName: 'Ocean View', 
                unitNumber: '305',
                distribution: '2 beds 2 baths',
                address: '123 Beach Blvd, Miami, FL',
                capacity: 4,
                pricePerNight: 150,
                cleaningFee: 80,
                images: ['https://example.com/image1.jpg'] 
            };
            
            mockRequest.params = { id: '1' };
            (AdminApartmentModel.getApartmentById as any).mockResolvedValueOnce(mockApartment);

            await AdminApartmentController.getApartmentById(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getApartmentById).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockApartment);
            expect(responseObject.statusCode).toBe(200);
            expect(responseObject.body).toEqual(mockApartment);
        });

        it('debería devolver 404 cuando el apartamento no existe', async () => {
            mockRequest.params = { id: '999' };
            (AdminApartmentModel.getApartmentById as any).mockResolvedValueOnce(null);

            await AdminApartmentController.getApartmentById(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getApartmentById).toHaveBeenCalledWith(999);
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Apartment not found' });
            expect(responseObject.statusCode).toBe(404);
        });

        it('debería manejar errores y devolver status 500', async () => {
            mockRequest.params = { id: '1' };
            (AdminApartmentModel.getApartmentById as any).mockRejectedValueOnce(new Error('Database error'));

            await AdminApartmentController.getApartmentById(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getApartmentById).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error fetching apartment' });
            expect(responseObject.statusCode).toBe(500);
        });
    });

    describe('createApartment', () => {
        it('debería crear un apartamento nuevo y devolver status 201', async () => {
            const newApartment = {
                buildingName: 'Ocean View',
                unitNumber: '305',
                distribution: '2 beds 2 baths',
                description: 'Beautiful apartment with ocean view',
                address: '123 Beach Blvd, Miami, FL',
                capacity: 4,
                pricePerNight: 150,
                cleaningFee: 80,
                images: ['https://example.com/image1.jpg']
            };
            
            const createdApartment = {
                id: 1,
                ...newApartment
            };
            
            mockRequest.body = newApartment;
            
            (validateApartment as any).mockReturnValueOnce({
                success: true
            });
            
            (AdminApartmentModel.createApartment as any).mockResolvedValueOnce(createdApartment);

            await AdminApartmentController.createApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.createApartment).toHaveBeenCalledWith(expect.objectContaining(newApartment));
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(createdApartment);
            expect(responseObject.statusCode).toBe(201);
            expect(responseObject.body).toEqual(createdApartment);
        });

        it('debería manejar la carga de imágenes correctamente', async () => {
            const newApartment = {
                buildingName: 'Ocean View',
                unitNumber: '305',
                distribution: '2 beds 2 baths',
                address: '123 Beach Blvd, Miami, FL',
                capacity: 4,
                pricePerNight: 150,
                cleaningFee: 80,
                images: []  // Sin imágenes inicialmente
            };
            
            const createdApartment = {
                id: 1,
                ...newApartment,
                images: ['https://res.cloudinary.com/demo/image/upload/v1/adminApartments/image1.jpg']
            };
            
            // Simular archivos cargados
            const mockFiles = [
                {
                    fieldname: 'images',
                    originalname: 'image1.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    buffer: Buffer.from('fake image data 1'),
                    size: 123456
                },
                {
                    fieldname: 'images',
                    originalname: 'image2.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    buffer: Buffer.from('fake image data 2'),
                    size: 234567
                }
            ] as MockFile[];
            
            mockRequest.body = newApartment;
            mockRequest.files = mockFiles as any;
            
            (validateApartment as any).mockReturnValueOnce({
                success: true
            });
            
            // Simular el método upload_stream de Cloudinary
            let uploadStreamCallback: any;
            (cloudinary.uploader.upload_stream as any).mockImplementation((_options: any, callback: any) => {
                uploadStreamCallback = callback;
                return { 
                    end: () => {
                        // Simular respuesta exitosa de Cloudinary
                        uploadStreamCallback(null, { 
                            secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/adminApartments/image1.jpg' 
                        });
                    }
                };
            });
            
            (AdminApartmentModel.createApartment as any).mockResolvedValueOnce(createdApartment);

            await AdminApartmentController.createApartment(mockRequest as Request, mockResponse as Response);

            expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
                expect.objectContaining({ folder: 'adminApartments' }),
                expect.any(Function)
            );
            
            expect(AdminApartmentModel.createApartment).toHaveBeenCalledWith(
                expect.objectContaining({
                    images: expect.arrayContaining(['https://res.cloudinary.com/demo/image/upload/v1/adminApartments/image1.jpg'])
                })
            );
            
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(createdApartment);
        });

        it('debería manejar errores en la carga de imágenes', async () => {
            const newApartment = {
                buildingName: 'Ocean View',
                unitNumber: '305',
                distribution: '2 beds 2 baths',
                address: '123 Beach Blvd, Miami, FL',
                capacity: 4,
                pricePerNight: 150,
                cleaningFee: 80,
                images: []
            };
            
            // Simular archivos cargados
            const mockFiles = [
                {
                    fieldname: 'images',
                    originalname: 'image1.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    buffer: Buffer.from('fake image data'),
                    size: 123456
                }
            ] as MockFile[];
            
            mockRequest.body = newApartment;
            mockRequest.files = mockFiles as any;
            
            (validateApartment as any).mockReturnValueOnce({
                success: true
            });
            
            // Simular un error en la carga a Cloudinary
            let uploadStreamCallback: any;
            (cloudinary.uploader.upload_stream as any).mockImplementation((_options: any, callback: any) => {
                uploadStreamCallback = callback;
                return { 
                    end: () => {
                        // Simular error de Cloudinary
                        uploadStreamCallback(new Error('Cloudinary upload error'), null);
                    }
                };
            });

            await expect(AdminApartmentController.createApartment(mockRequest as Request, mockResponse as Response))
                .rejects.toThrow('Cloudinary upload error');
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const invalidApartment = {
                // Faltan campos requeridos
                buildingName: 'Ocean View'
            };
            
            mockRequest.body = invalidApartment;
            
            (validateApartment as any).mockReturnValueOnce({
                error: { message: JSON.stringify({ errors: [{ message: 'Distribution is mandatory' }] }) }
            });

            await AdminApartmentController.createApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.createApartment).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject.statusCode).toBe(400);
            expect(responseObject.body).toHaveProperty('error');
        });

        it('debería manejar errores durante la creación y devolver status 500', async () => {
            const newApartment = {
                buildingName: 'Ocean View',
                unitNumber: '305',
                distribution: '2 beds 2 baths',
                address: '123 Beach Blvd, Miami, FL',
                capacity: 4,
                pricePerNight: 150,
                cleaningFee: 80,
                images: ['https://example.com/image1.jpg']
            };
            
            mockRequest.body = newApartment;
            
            (validateApartment as any).mockReturnValueOnce({
                success: true
            });
            
            (AdminApartmentModel.createApartment as any).mockRejectedValueOnce(new Error('Database error'));

            await AdminApartmentController.createApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.createApartment).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(responseObject.statusCode).toBe(500);
            expect(responseObject.body).toHaveProperty('error');
        });
    });

    describe('updateApartment', () => {
        it('debería actualizar un apartamento y devolver status 200', async () => {
            const updateData = {
                buildingName: 'Updated Name',
                pricePerNight: 200
            };
            
            const updatedApartment = {
                id: 1,
                buildingName: 'Updated Name',
                unitNumber: '305',
                distribution: '2 beds 2 baths',
                address: '123 Beach Blvd, Miami, FL',
                capacity: 4,
                pricePerNight: 200,
                cleaningFee: 80,
                images: ['https://example.com/image1.jpg']
            };
            
            mockRequest.params = { id: '1' };
            mockRequest.body = updateData;
            
            (validatePartialApartment as any).mockReturnValueOnce({
                success: true
            });
            
            (AdminApartmentModel.updateApartment as any).mockResolvedValueOnce(updatedApartment);

            await AdminApartmentController.updateApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.updateApartment).toHaveBeenCalledWith(1, expect.objectContaining(updateData));
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(updatedApartment);
            expect(responseObject.statusCode).toBe(200);
            expect(responseObject.body).toEqual(updatedApartment);
        });

        it('debería manejar la actualización de imágenes correctamente', async () => {
            const updateData = {
                buildingName: 'Updated Name'
            };
            
            const updatedApartment = {
                id: 1,
                buildingName: 'Updated Name',
                unitNumber: '305',
                distribution: '2 beds 2 baths',
                address: '123 Beach Blvd, Miami, FL',
                capacity: 4,
                pricePerNight: 150,
                cleaningFee: 80,
                images: ['https://res.cloudinary.com/demo/image/upload/v1/adminApartments/newimage.jpg']
            };
            
            // Simular archivos cargados
            const mockFiles = [
                {
                    fieldname: 'images',
                    originalname: 'newimage.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    buffer: Buffer.from('new image data'),
                    size: 123456
                }
            ] as MockFile[];
            
            mockRequest.params = { id: '1' };
            mockRequest.body = updateData;
            mockRequest.files = mockFiles as any;
            
            (validatePartialApartment as any).mockReturnValueOnce({
                success: true
            });
            
            // Simular el método upload_stream de Cloudinary
            let uploadStreamCallback: any;
            (cloudinary.uploader.upload_stream as any).mockImplementation((_options: any, callback: any) => {
                uploadStreamCallback = callback;
                return { 
                    end: () => {
                        // Simular respuesta exitosa de Cloudinary
                        uploadStreamCallback(null, { 
                            secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/adminApartments/newimage.jpg' 
                        });
                    }
                };
            });
            
            (AdminApartmentModel.updateApartment as any).mockResolvedValueOnce(updatedApartment);

            await AdminApartmentController.updateApartment(mockRequest as Request, mockResponse as Response);

            expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
                expect.objectContaining({ folder: 'adminApartments' }),
                expect.any(Function)
            );
            
            expect(AdminApartmentModel.updateApartment).toHaveBeenCalledWith(1, 
                expect.objectContaining({
                    buildingName: 'Updated Name',
                    images: expect.arrayContaining(['https://res.cloudinary.com/demo/image/upload/v1/adminApartments/newimage.jpg'])
                })
            );
            
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(updatedApartment);
        });

        it('debería manejar errores en la actualización de imágenes', async () => {
            const updateData = {
                buildingName: 'Updated Name'
            };
            
            // Simular archivos cargados
            const mockFiles = [
                {
                    fieldname: 'images',
                    originalname: 'newimage.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    buffer: Buffer.from('new image data'),
                    size: 123456
                }
            ] as MockFile[];
            
            mockRequest.params = { id: '1' };
            mockRequest.body = updateData;
            mockRequest.files = mockFiles as any;
            
            (validatePartialApartment as any).mockReturnValueOnce({
                success: true
            });
            
            // Simular un error en la carga a Cloudinary
            let uploadStreamCallback: any;
            (cloudinary.uploader.upload_stream as any).mockImplementation((_options: any, callback: any) => {
                uploadStreamCallback = callback;
                return { 
                    end: () => {
                        // Simular error de Cloudinary
                        uploadStreamCallback(new Error('Cloudinary upload error'), null);
                    }
                };
            });

            await expect(AdminApartmentController.updateApartment(mockRequest as Request, mockResponse as Response))
                .rejects.toThrow('Cloudinary upload error');
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const invalidData = {
                pricePerNight: -100  // Precio negativo (no válido)
            };
            
            mockRequest.params = { id: '1' };
            mockRequest.body = invalidData;
            
            (validatePartialApartment as any).mockReturnValueOnce({
                error: { message: JSON.stringify({ errors: [{ message: 'Price per night must be a positive number' }] }) }
            });

            await AdminApartmentController.updateApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.updateApartment).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject.statusCode).toBe(400);
            expect(responseObject.body).toHaveProperty('error');
        });

        it('debería manejar errores durante la actualización y devolver status 500', async () => {
            const updateData = {
                buildingName: 'Updated Name'
            };
            
            mockRequest.params = { id: '1' };
            mockRequest.body = updateData;
            
            (validatePartialApartment as any).mockReturnValueOnce({
                success: true
            });
            
            (AdminApartmentModel.updateApartment as any).mockRejectedValueOnce(new Error('Database error'));

            await AdminApartmentController.updateApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.updateApartment).toHaveBeenCalledWith(1, expect.objectContaining(updateData));
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(responseObject.statusCode).toBe(500);
            expect(responseObject.body).toHaveProperty('error');
        });
    });

    describe('deleteApartment', () => {
        it('debería eliminar un apartamento y devolver status 200', async () => {
            const mockApartment = {
                id: 1,
                buildingName: 'Ocean View',
                images: ['https://example.com/image1.jpg']
            };
            
            mockRequest.params = { id: '1' };
            
            (AdminApartmentModel.getApartmentById as any).mockResolvedValueOnce(mockApartment);
            (AdminApartmentModel.deleteApartment as any).mockResolvedValueOnce({ message: 'Apartment deleted successfully' });
            (cloudinary.uploader.destroy as any).mockResolvedValueOnce({ result: 'ok' });

            await AdminApartmentController.deleteApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getApartmentById).toHaveBeenCalledWith(1);
            expect(AdminApartmentModel.deleteApartment).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Apartment deleted successfully' });
            expect(responseObject.statusCode).toBe(200);
        });

        it('debería devolver 404 cuando el apartamento no existe', async () => {
            mockRequest.params = { id: '999' };
            (AdminApartmentModel.getApartmentById as any).mockResolvedValueOnce(null);

            await AdminApartmentController.deleteApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getApartmentById).toHaveBeenCalledWith(999);
            expect(AdminApartmentModel.deleteApartment).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Apartment not found' });
            expect(responseObject.statusCode).toBe(404);
        });

        it('debería manejar errores durante la eliminación y devolver status 500', async () => {
            const mockApartment = {
                id: 1,
                buildingName: 'Ocean View',
                images: ['https://example.com/image1.jpg']
            };
            
            mockRequest.params = { id: '1' };
            
            (AdminApartmentModel.getApartmentById as any).mockResolvedValueOnce(mockApartment);
            (AdminApartmentModel.deleteApartment as any).mockRejectedValueOnce(new Error('Database error'));

            await AdminApartmentController.deleteApartment(mockRequest as Request, mockResponse as Response);

            expect(AdminApartmentModel.getApartmentById).toHaveBeenCalledWith(1);
            expect(AdminApartmentModel.deleteApartment).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error deleting apartment' });
            expect(responseObject.statusCode).toBe(500);
        });

        it('debería manejar errores al eliminar imágenes de Cloudinary', async () => {
            const mockApartment = {
                id: 1,
                buildingName: 'Ocean View',
                images: ['https://example.com/image1.jpg']
            };
            
            mockRequest.params = { id: '1' };
            
            (AdminApartmentModel.getApartmentById as any).mockResolvedValueOnce(mockApartment);
            (cloudinary.uploader.destroy as any).mockRejectedValueOnce(new Error('Cloudinary error'));
            (AdminApartmentModel.deleteApartment as any).mockResolvedValueOnce({ message: 'Apartment deleted successfully' });

            // El error al eliminar imágenes no debería detener la eliminación del apartamento
            await AdminApartmentController.deleteApartment(mockRequest as Request, mockResponse as Response);

            expect(cloudinary.uploader.destroy).toHaveBeenCalled();
            expect(AdminApartmentModel.deleteApartment).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getPublicIdFromUrl', () => {
        it('debería extraer correctamente el publicId de una URL de Cloudinary', () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1/adminApartments/image123.jpg';
            const result = AdminApartmentController.getPublicIdFromUrl(cloudinaryUrl);
            
            expect(result).toBe('adminApartments/image123');
        });
        
        it('debería manejar URLs con formato diferente', () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1/adminApartments/subfolder/image123.png';
            const result = AdminApartmentController.getPublicIdFromUrl(cloudinaryUrl);
            
            expect(result).toBe('adminApartments/image123');
        });

        it('debería devolver null para URLs inválidas', () => {
            const invalidUrl = 'invalid-url';
            const result = AdminApartmentController.getPublicIdFromUrl(invalidUrl);
            
            expect(result).toBeNull();
        });
    });
}); 