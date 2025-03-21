import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import UserController from '../../../controllers/user.js';
import UserModel from '../../../models/user.js';
import { validateUser } from '../../../schemas/userSchema.js';

// Mock del modelo
vi.mock('../../../models/user.js', () => ({
    default: {
        getAll: vi.fn(),
        createUser: vi.fn()
    }
}));

// Mock del schema
vi.mock('../../../schemas/userSchema.js', () => ({
    validateUser: vi.fn()
}));

describe('UserController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseObject: any;

    beforeEach(() => {
        responseObject = {
            statusCode: 0,
            body: {}
        };
        
        mockRequest = {
            body: {}
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

    describe('getAllUsers', () => {
        it('debería obtener todos los usuarios y devolver status 200', async () => {
            const mockUsers = [
                { id: 1, name: 'John', lastname: 'Doe', email: 'john@example.com', phone: '123456789', address: '123 Main St', city: 'Miami', country: 'USA', notes: 'Test notes' },
                { id: 2, name: 'Jane', lastname: 'Doe', email: 'jane@example.com', phone: '987654321', address: '456 Oak St', city: 'New York', country: 'USA', notes: 'Test notes 2' }
            ];
            
            (UserModel.getAll as any).mockResolvedValueOnce(mockUsers);

            await UserController.getAllUsers(mockRequest as Request, mockResponse as Response);

            expect(UserModel.getAll).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
            expect(responseObject.statusCode).toBe(200);
            expect(responseObject.body).toEqual(mockUsers);
        });

        it('debería manejar errores y devolver status 500', async () => {
            const errorMessage = 'Database error';
            (UserModel.getAll as any).mockRejectedValueOnce(new Error(errorMessage));

            await UserController.getAllUsers(mockRequest as Request, mockResponse as Response);

            expect(UserModel.getAll).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: errorMessage });
            expect(responseObject.statusCode).toBe(500);
            expect(responseObject.body).toEqual({ error: errorMessage });
        });
    });

    describe('createUser', () => {
        it('debería crear un usuario nuevo y devolver status 201', async () => {
            const newUser = {
                name: 'John',
                lastname: 'Doe',
                email: 'john@example.com',
                phone: '123456789',
                address: '123 Main St',
                city: 'Miami',
                country: 'USA',
                notes: 'Test notes'
            };
            
            const createdUser = {
                id: 1,
                ...newUser
            };
            
            mockRequest.body = newUser;
            
            (validateUser as any).mockReturnValueOnce({
                success: true,
                data: newUser
            });
            
            (UserModel.createUser as any).mockResolvedValueOnce(createdUser);

            await UserController.createUser(mockRequest as Request, mockResponse as Response);

            expect(validateUser).toHaveBeenCalledWith(newUser);
            expect(UserModel.createUser).toHaveBeenCalledWith(newUser);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(createdUser);
            expect(responseObject.statusCode).toBe(201);
            expect(responseObject.body).toEqual(createdUser);
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const invalidUser = {
                // Faltan campos requeridos
                email: 'john@example.com'
            };
            
            mockRequest.body = invalidUser;
            
            const validationError = {
                success: false,
                error: { message: JSON.stringify({ errors: [{ message: 'Name is required' }] }) }
            };
            
            (validateUser as any).mockReturnValueOnce(validationError);

            await UserController.createUser(mockRequest as Request, mockResponse as Response);

            expect(validateUser).toHaveBeenCalledWith(invalidUser);
            expect(UserModel.createUser).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject.statusCode).toBe(400);
            expect(responseObject.body).toHaveProperty('error');
        });

        it('debería manejar errores durante la creación y devolver status 500', async () => {
            const newUser = {
                name: 'John',
                lastname: 'Doe',
                email: 'john@example.com',
                phone: '123456789',
                address: '123 Main St',
                city: 'Miami',
                country: 'USA',
                notes: 'Test notes'
            };
            
            mockRequest.body = newUser;
            
            (validateUser as any).mockReturnValueOnce({
                success: true,
                data: newUser
            });
            
            const errorMessage = 'Database error';
            (UserModel.createUser as any).mockRejectedValueOnce(new Error(errorMessage));

            await UserController.createUser(mockRequest as Request, mockResponse as Response);

            expect(validateUser).toHaveBeenCalledWith(newUser);
            expect(UserModel.createUser).toHaveBeenCalledWith(newUser);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(responseObject.statusCode).toBe(500);
            expect(responseObject.body).toHaveProperty('error');
        });
    });
}); 