/**
 * Tests de integración para las rutas de apartamentos
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { NextFunction, Request, Response } from 'express';

// Mocks
vi.mock('../../models/apartment.js', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([]),
    getApartmentById: vi.fn().mockResolvedValue(null),
    createApartment: vi.fn().mockResolvedValue({}),
    updateApartment: vi.fn().mockResolvedValue({}),
    deleteApartment: vi.fn().mockResolvedValue({})
  }
}));

// Mock de middlewares de autenticación para que no bloqueen los tests
vi.mock('../../middleware/authMiddleware.js', () => ({
  authMiddleware: (_req: Request, _res: Response, next: NextFunction) => next()
}));

// Mock de Cloudinary
vi.mock('../../utils/cloudinaryConfig.js', () => {
  const cloudinaryMock = {
    uploader: {
      upload: vi.fn().mockResolvedValue({ 
        public_id: 'test_public_id',
        secure_url: 'https://test-url.com/image.jpg'
      }),
      upload_stream: vi.fn().mockImplementation((options, callback) => {
        return {
          end: (buffer: Buffer) => {
            callback(null, { 
              public_id: 'test_public_id',
              secure_url: 'https://test-url.com/image.jpg'
            });
          }
        };
      }),
      destroy: vi.fn().mockResolvedValue({ result: 'ok' })
    }
  };
  return { default: cloudinaryMock, __esModule: true };
});

// Mock del esquema de validación que importamos y configuramos en cada test
import * as apartmentSchemaMock from '../../schemas/apartmentSchema.js';
vi.mock('../../schemas/apartmentSchema.js', () => ({
  validateApartment: vi.fn(),
  validatePartialApartment: vi.fn()
}));

// Capturar errores no controlados durante los tests
const originalConsoleError = console.error;
// Importar después de los mocks
import app from '../../app.js';
import ApartmentModel from '../../models/apartment.js';

describe('Rutas de Apartamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configuración por defecto para los validadores
    vi.mocked(apartmentSchemaMock.validateApartment).mockReturnValue({ 
      success: true, 
      data: {} // Añadimos data para satisfacer el tipo
    } as any);
    vi.mocked(apartmentSchemaMock.validatePartialApartment).mockReturnValue({ 
      success: true, 
      data: {} // Añadimos data para satisfacer el tipo
    } as any);
    
    // Silenciar los mensajes de error de la consola durante los tests
    console.error = vi.fn();
  });
  
  afterEach(() => {
    // Restaurar console.error después de cada test
    console.error = originalConsoleError;
  });

  describe('GET /api/apartments', () => {
    it('debería devolver la lista de apartamentos', async () => {
      // Mock de datos
      const mockApartments = [
        { id: 1, name: 'Apartment 1', address: 'Address 1', price: 100, capacity: 2, bathrooms: 1, rooms: 1, description: 'Description', images: [], unitNumber: '1A' },
        { id: 2, name: 'Apartment 2', address: 'Address 2', price: 200, capacity: 4, bathrooms: 2, rooms: 2, description: 'Description', images: [], unitNumber: '2B' }
      ];
      vi.mocked(ApartmentModel.getAll).mockResolvedValueOnce(mockApartments);

      // Realizar la petición
      const response = await request(app)
        .get('/api/apartments')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toEqual(mockApartments);
      expect(ApartmentModel.getAll).toHaveBeenCalled();
    });
  });

  describe('GET /api/apartments/:id', () => {
    it('debería devolver un apartamento por su id', async () => {
      // Mock de datos
      const mockApartment = { 
        id: 1, 
        name: 'Apartment 1', 
        address: 'Address 1', 
        price: 100,
        capacity: 2,
        bathrooms: 1,
        rooms: 1,
        description: 'Description',
        images: [],
        unitNumber: '1A'
      };
      vi.mocked(ApartmentModel.getApartmentById).mockResolvedValueOnce(mockApartment);

      // Realizar la petición
      const response = await request(app)
        .get('/api/apartments/1')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toEqual(mockApartment);
      expect(ApartmentModel.getApartmentById).toHaveBeenCalledWith(1);
    });

    it('debería devolver 404 si el apartamento no existe', async () => {
      // Mock de datos
      vi.mocked(ApartmentModel.getApartmentById).mockResolvedValueOnce(null);

      // Realizar la petición
      const response = await request(app)
        .get('/api/apartments/999')
        .expect('Content-Type', /json/)
        .expect(404);

      // Verificar la respuesta
      expect(response.body).toHaveProperty('message', 'Apartment not found');
      expect(ApartmentModel.getApartmentById).toHaveBeenCalledWith(999);
    });
  });

  describe('POST /api/apartments', () => {
    it('debería crear un nuevo apartamento', async () => {
      // Asegurarse de que el validador devuelva éxito para este test específico
      vi.mocked(apartmentSchemaMock.validateApartment).mockReturnValue({
        success: true,
        data: {} // Añadimos data para satisfacer el tipo
      } as any);
      
      // Mock de datos
      const newApartmentData = {
        name: 'New Apartment',
        address: '123 New St',
        price: '150',
        capacity: '3',
        bathrooms: '1',
        rooms: '2',
        description: 'Brand new apartment'
      };
      
      const createdApartment = {
        id: 3,
        name: 'New Apartment',
        address: '123 New St',
        price: 150,
        capacity: 3,
        bathrooms: 1,
        rooms: 2,
        description: 'Brand new apartment',
        images: [],
        unitNumber: '3C'
      };
      
      vi.mocked(ApartmentModel.createApartment).mockResolvedValueOnce(createdApartment);

      // Realizar la petición
      const response = await request(app)
        .post('/api/apartments')
        .send(newApartmentData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verificar la respuesta
      expect(response.body).toEqual(createdApartment);
      expect(ApartmentModel.createApartment).toHaveBeenCalled();
    });
    
    it('debería devolver 400 si faltan datos requeridos', async () => {
      // Mock de validación fallida para este test específico
      vi.mocked(apartmentSchemaMock.validateApartment).mockReturnValue({ 
        success: false, 
        error: { message: JSON.stringify(['name is required']) } 
      } as any);
      
      // Datos incompletos
      const incompleteData = {
        // Falta name y otros campos requeridos
        address: '123 New St',
        price: '150'
      };

      // Realizar la petición
      const response = await request(app)
        .post('/api/apartments')
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      // Verificar la respuesta
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('PUT /api/apartments/:id', () => {
    it('debería actualizar un apartamento existente', async () => {
      // Asegurarse de que el validador devuelva éxito para este test específico
      vi.mocked(apartmentSchemaMock.validatePartialApartment).mockReturnValue({
        success: true,
        data: {} // Añadimos data para satisfacer el tipo
      } as any);
      
      // Mock de datos
      const updateData = {
        name: 'Updated Apartment',
        price: '300'  // Usamos valores numéricos válidos
      };
      
      const updatedApartment = {
        id: 1,
        name: 'Updated Apartment',
        address: 'Address 1',
        price: 300,
        capacity: 2,
        bathrooms: 1,
        rooms: 1,
        description: 'Description',
        images: [],
        unitNumber: '1A'
      };
      
      vi.mocked(ApartmentModel.updateApartment).mockResolvedValueOnce(updatedApartment);

      // Realizar la petición
      const response = await request(app)
        .put('/api/apartments/1')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toEqual(updatedApartment);
      expect(ApartmentModel.updateApartment).toHaveBeenCalledWith(1, expect.any(Object));
    });
    
    // Tests de validación de campos inválidos
    it('debería validar correctamente los datos de actualización', async () => {
      // Comprobamos que los diferentes casos de validación de errores funcionan
      // Test 1: Precio inválido
      const response1 = await request(app)
        .put('/api/apartments/1')
        .send({ price: 'not-a-number' });

      expect(response1.status).toBe(400);
      expect(response1.body).toHaveProperty('message', 'Invalid price value');
      
      // Test 2: Capacidad inválida - necesitamos un nuevo request para evitar errores de cabecera
      const response2 = await request(app)
        .put('/api/apartments/2')
        .send({ capacity: 'not-a-number' });

      expect(response2.status).toBe(400);
      expect(response2.body).toHaveProperty('message', 'Valor inválido para capacity');
      
      // Test 3: Baños inválidos
      const response3 = await request(app)
        .put('/api/apartments/3')
        .send({ bathrooms: 'not-a-number' });

      expect(response3.status).toBe(400);
      expect(response3.body).toHaveProperty('message', 'Valor inválido para bathrooms');
      
      // Test 4: Habitaciones inválidas
      const response4 = await request(app)
        .put('/api/apartments/4')
        .send({ rooms: 'not-a-number' });

      expect(response4.status).toBe(400);
      expect(response4.body).toHaveProperty('message', 'Valor inválido para rooms');
    });
  });
  
  describe('DELETE /api/apartments/:id', () => {
    it('debería eliminar un apartamento existente', async () => {
      // Mock de datos
      const mockApartment = { 
        id: 1, 
        name: 'Apartment to Delete', 
        address: 'Address 1', 
        price: 100,
        capacity: 2,
        bathrooms: 1,
        rooms: 1,
        description: 'Description',
        images: [],
        unitNumber: '1A'
      };
      
      vi.mocked(ApartmentModel.getApartmentById).mockResolvedValueOnce(mockApartment);
      vi.mocked(ApartmentModel.deleteApartment).mockResolvedValueOnce({ message: 'Apartment deleted' });

      // Realizar la petición
      const response = await request(app)
        .delete('/api/apartments/1')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toHaveProperty('message', 'Apartment and associated images deleted successfully');
      expect(ApartmentModel.getApartmentById).toHaveBeenCalledWith(1);
      expect(ApartmentModel.deleteApartment).toHaveBeenCalledWith(1);
    });
    
    it('debería devolver 404 si el apartamento a eliminar no existe', async () => {
      // Mock de datos
      vi.mocked(ApartmentModel.getApartmentById).mockResolvedValueOnce(null);

      // Realizar la petición
      const response = await request(app)
        .delete('/api/apartments/999')
        .expect('Content-Type', /json/)
        .expect(404);

      // Verificar la respuesta
      expect(response.body).toHaveProperty('message', 'Apartment not found');
      expect(ApartmentModel.getApartmentById).toHaveBeenCalledWith(999);
      expect(ApartmentModel.deleteApartment).not.toHaveBeenCalled();
    });
  });
}); 