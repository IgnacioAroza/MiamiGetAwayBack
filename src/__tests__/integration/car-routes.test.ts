/**
 * Tests de integración para las rutas de autos
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { NextFunction, Request, Response } from 'express';

// Mocks
vi.mock('../../models/car.js', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([]),
    getCarById: vi.fn().mockResolvedValue(null),
    createCar: vi.fn().mockResolvedValue({}),
    updateCar: vi.fn().mockResolvedValue({}),
    deleteCar: vi.fn().mockResolvedValue({})
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
import * as carSchemaMock from '../../schemas/carSchema.js';
vi.mock('../../schemas/carSchema.js', () => ({
  validateCar: vi.fn(),
  validatePartialCar: vi.fn()
}));

// Capturar errores no controlados durante los tests
const originalConsoleError = console.error;
// Importar después de los mocks
import app from '../../app.js';
import CarModel from '../../models/car.js';

describe('Rutas de Autos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configuración por defecto para los validadores
    vi.mocked(carSchemaMock.validateCar).mockReturnValue({ 
      success: true, 
      data: {} // Añadimos data para satisfacer el tipo
    } as any);
    vi.mocked(carSchemaMock.validatePartialCar).mockReturnValue({ 
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

  describe('GET /api/cars', () => {
    it('debería devolver la lista de autos', async () => {
      // Mock de datos
      const mockCars = [
        { id: 1, brand: 'BMW', model: 'X5', description: 'Luxury SUV', price: 150, images: [] },
        { id: 2, brand: 'Mercedes', model: 'C-Class', description: 'Elegant sedan', price: 120, images: [] }
      ];
      vi.mocked(CarModel.getAll).mockResolvedValueOnce(mockCars);

      // Realizar la petición
      const response = await request(app)
        .get('/api/cars')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toEqual(mockCars);
      expect(CarModel.getAll).toHaveBeenCalled();
    });
  });

  describe('GET /api/cars/:id', () => {
    it('debería devolver un auto específico si existe', async () => {
      // Mock de datos
      const mockCar = { id: 1, brand: 'BMW', model: 'X5', description: 'Luxury SUV', price: 150, images: [] };
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(mockCar);

      // Realizar la petición
      const response = await request(app)
        .get('/api/cars/1')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toEqual(mockCar);
      expect(CarModel.getCarById).toHaveBeenCalledWith(1);
    });

    it('debería retornar un objeto vacío si el auto no existe', async () => {
      // Mock para auto no encontrado
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(null);

      // Realizar la petición
      const response = await request(app)
        .get('/api/cars/999')
        .expect(200);

      // Verificar la respuesta
      expect(CarModel.getCarById).toHaveBeenCalledWith(999);
      expect(response.body).toEqual({});
    });
  });

  describe('POST /api/cars', () => {
    it('debería crear un nuevo auto con datos válidos', async () => {
      // Mock para validador y creación
      const mockCar = { 
        id: 1, 
        brand: 'BMW', 
        model: 'X5', 
        description: 'Luxury SUV', 
        price: 150, 
        images: ['https://test-url.com/image.jpg'] 
      };
      
      vi.mocked(CarModel.createCar).mockResolvedValueOnce(mockCar);

      // Realizar la petición
      const response = await request(app)
        .post('/api/cars')
        .send({
          brand: 'BMW',
          model: 'X5',
          description: 'Luxury SUV',
          price: 150
        })
        .expect('Content-Type', /json/)
        .expect(201);

      // Verificar la respuesta
      expect(response.body).toEqual(mockCar);
      expect(CarModel.createCar).toHaveBeenCalled();
    });

    it('debería retornar 400 con datos inválidos', async () => {
      // Mock para fallar en la validación
      vi.mocked(carSchemaMock.validateCar).mockReturnValueOnce({ 
        success: false, 
        error: { 
          flatten: () => ({ 
            formErrors: ['Brand is required'],
            fieldErrors: {} // Añadir fieldErrors como objeto vacío para cumplir con el tipo
          }),
          message: 'Validation error'
        } 
      } as any);

      // Realizar la petición
      await request(app)
        .post('/api/cars')
        .send({
          model: 'X5',
          price: 'invalid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      // Verificar que no se llamó a createCar
      expect(CarModel.createCar).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/cars/:id', () => {
    it('debería actualizar un auto existente con datos válidos', async () => {
      // Mock para actualización
      const updatedCar = { 
        id: 1, 
        brand: 'BMW', 
        model: 'X7', 
        description: 'Updated luxury SUV', 
        price: 200, 
        images: [] 
      };
      
      vi.mocked(CarModel.updateCar).mockResolvedValueOnce(updatedCar);

      // Realizar la petición
      const response = await request(app)
        .put('/api/cars/1')
        .send({
          model: 'X7',
          description: 'Updated luxury SUV',
          price: 200
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toEqual(updatedCar);
      expect(CarModel.updateCar).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('debería retornar 400 con precio inválido', async () => {
      // Realizar la petición
      await request(app)
        .put('/api/cars/1')
        .send({
          price: 'invalid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      // Verificar que no se llamó a updateCar
      expect(CarModel.updateCar).not.toHaveBeenCalled();
    });

    it('debería retornar 400 con datos inválidos (validación de esquema)', async () => {
      // Mock para fallar en la validación
      vi.mocked(carSchemaMock.validatePartialCar).mockReturnValueOnce({ 
        success: false, 
        error: { 
          message: JSON.stringify({ formErrors: ['Brand cannot be empty'] })
        } 
      } as any);

      // Realizar la petición
      await request(app)
        .put('/api/cars/1')
        .send({
          brand: ''
        })
        .expect('Content-Type', /json/)
        .expect(400);

      // Verificar que no se llamó a updateCar
      expect(CarModel.updateCar).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/cars/:id', () => {
    it('debería eliminar un auto existente', async () => {
      // Mock para auto encontrado
      const mockCar = { 
        id: 1, 
        brand: 'BMW', 
        model: 'X5', 
        description: 'Luxury SUV', 
        price: 150, 
        images: ['https://test-url.com/image.jpg'] 
      };
      
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(mockCar);
      vi.mocked(CarModel.deleteCar).mockResolvedValueOnce({ message: 'Car deleted successfully' });

      // Realizar la petición
      const response = await request(app)
        .delete('/api/cars/1')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verificar la respuesta
      expect(response.body).toEqual({ message: 'Car and associated images deleted successfully' });
      expect(CarModel.getCarById).toHaveBeenCalledWith(1);
      expect(CarModel.deleteCar).toHaveBeenCalledWith(1);
    });

    it('debería retornar 404 si el auto no existe', async () => {
      // Mock para auto no encontrado
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(null);

      // Realizar la petición
      await request(app)
        .delete('/api/cars/999')
        .expect('Content-Type', /json/)
        .expect(404);

      // Verificar que no se llamó a deleteCar
      expect(CarModel.deleteCar).not.toHaveBeenCalled();
    });
  });
}); 