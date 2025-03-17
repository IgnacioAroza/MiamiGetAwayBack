/**
 * Tests para CarController usando Vitest
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';

// Mocks
vi.mock('../../../models/car.js', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([]),
    getCarById: vi.fn().mockResolvedValue(null),
    createCar: vi.fn().mockResolvedValue({}),
    updateCar: vi.fn().mockResolvedValue({}),
    deleteCar: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../../utils/cloudinaryConfig.js', () => {
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

vi.mock('../../../schemas/carSchema.js', () => ({
  validateCar: vi.fn().mockReturnValue({ success: true }),
  validatePartialCar: vi.fn().mockReturnValue({ success: true })
}));

// Importar después de los mocks
import CarController from '../../../controllers/car.js';
import CarModel from '../../../models/car.js';
import { validateCar, validatePartialCar } from '../../../schemas/carSchema.js';
// Importar el mock de cloudinary para poder espiarlo
import cloudinary from '../../../utils/cloudinaryConfig.js';
import { ZodFormattedError, ZodIssue, typeToFlattenedError } from 'zod';

describe('CarController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // Limpiar todos los mocks
    vi.clearAllMocks();

    // Inicializar mocks de req y res
    req = {
      params: {},
      body: {},
      files: []
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn()
    };
  });

  describe('getAllCars', () => {
    it('debería devolver todos los autos con status 200', async () => {
      // Configuración del mock
      const mockCars = [
        { id: 1, brand: 'BMW', model: 'X5', description: 'Luxury SUV', price: 150, images: [] },
        { id: 2, brand: 'Mercedes', model: 'C-Class', description: 'Elegant sedan', price: 120, images: [] }
      ];
      vi.mocked(CarModel.getAll).mockResolvedValueOnce(mockCars);

      // Ejecución del método
      await CarController.getAllCars(req as Request, res as Response);

      // Verificaciones
      expect(CarModel.getAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCars);
    });

    it('debería manejar errores y devolver status 500', async () => {
      // Configuración del mock para simular un error
      const errorMsg = 'Database error';
      vi.mocked(CarModel.getAll).mockRejectedValueOnce(new Error(errorMsg));

      // Ejecución del método
      await CarController.getAllCars(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'An error occurred while fetching cars' });
    });
  });

  describe('getCarById', () => {
    it('debería devolver un auto si existe con status 200', async () => {
      // Configuración del mock
      const mockCar = { id: 1, brand: 'BMW', model: 'X5', description: 'Luxury SUV', price: 150, images: [] };
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(mockCar);
      req.params = { id: '1' };

      // Ejecución del método
      await CarController.getCarById(req as Request, res as Response);

      // Verificaciones
      expect(CarModel.getCarById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockCar);
    });

    it('debería manejar errores y devolver status 500', async () => {
      // Configuración del mock para simular un error
      const errorMsg = 'Database error';
      vi.mocked(CarModel.getCarById).mockRejectedValueOnce(new Error(errorMsg));
      req.params = { id: '1' };

      // Ejecución del método
      await CarController.getCarById(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(errorMsg);
    });
  });

  describe('createCar', () => {
    it('debería crear un auto y devolver status 201', async () => {
      // Configuración
      const carData = {
        brand: 'BMW',
        model: 'X5',
        description: 'Luxury SUV',
        price: '150',
        images: []
      };
      
      const createdCar = {
        id: 1,
        ...carData,
        price: 150, // Número en lugar de string
        images: []
      };

      req.body = carData;
      vi.mocked(CarModel.createCar).mockResolvedValueOnce(createdCar);
      vi.mocked(validateCar).mockReturnValueOnce({ 
        success: true, 
        data: {
          brand: 'BMW',
          model: 'X5',
          price: 150,
          description: 'Luxury SUV',
          images: []
        } 
      });

      // Ejecución
      await CarController.createCar(req as Request, res as Response);

      // Verificaciones
      expect(validateCar).toHaveBeenCalled();
      expect(CarModel.createCar).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdCar);
    });

    it('debería manejar datos inválidos y devolver status 400', async () => {
      // Configuración
      req.body = {
        brand: 'BMW',
        model: 'X5',
        price: 'invalid',
      };

      vi.mocked(validateCar).mockReturnValueOnce({ 
        success: false, 
        error: { 
          flatten: () => ({ 
            formErrors: ['Price must be a number'],
            fieldErrors: {} 
          }),
          message: 'Validation error'
        } 
      } as any);

      // Ejecución
      await CarController.createCar(req as Request, res as Response);

      // Verificaciones
      expect(validateCar).toHaveBeenCalled();
      expect(CarModel.createCar).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid car data',
          errors: expect.objectContaining({
            formErrors: expect.arrayContaining(['Price must be a number'])
          })
        })
      );
    });

    it('debería procesar imágenes correctamente', async () => {
      // Configuración
      req.body = {
        brand: 'BMW',
        model: 'X5',
        description: 'Luxury SUV',
        price: '150',
      };
      
      req.files = [
        { buffer: Buffer.from('test') } as Express.Multer.File
      ];

      vi.mocked(validateCar).mockReturnValueOnce({ 
        success: true, 
        data: {
          brand: 'BMW',
          model: 'X5',
          price: 150,
          description: 'Luxury SUV',
          images: []
        } 
      });
      
      const createdCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        description: 'Luxury SUV',
        price: 150,
        images: ['https://test-url.com/image.jpg']
      };
      
      vi.mocked(CarModel.createCar).mockResolvedValueOnce(createdCar);

      // Ejecución
      await CarController.createCar(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdCar);
    });

    it('debería manejar errores durante la creación y devolver status 500', async () => {
      // Configuración
      req.body = {
        brand: 'BMW',
        model: 'X5',
        description: 'Luxury SUV',
        price: '150',
      };
      
      vi.mocked(validateCar).mockReturnValueOnce({ 
        success: true, 
        data: {
          brand: 'BMW',
          model: 'X5',
          price: 150,
          description: 'Luxury SUV',
          images: []
        } 
      });
      vi.mocked(CarModel.createCar).mockRejectedValueOnce(new Error('Database error'));

      // Ejecución
      await CarController.createCar(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error creating car', 
        error: 'Database error' 
      });
    });
  });

  describe('updateCar', () => {
    it('debería actualizar un auto y devolver status 200', async () => {
      // Configuración
      req.params = { id: '1' };
      req.body = {
        brand: 'BMW',
        model: 'X7',
        description: 'Updated description',
        price: '200',
      };
      
      const updatedCar = {
        id: 1,
        brand: 'BMW',
        model: 'X7',
        description: 'Updated description',
        price: 200,
        images: []
      };

      vi.mocked(validatePartialCar).mockReturnValueOnce({ success: true, data: {} });
      vi.mocked(CarModel.updateCar).mockResolvedValueOnce(updatedCar);

      // Ejecución
      await CarController.updateCar(req as Request, res as Response);

      // Verificaciones
      expect(validatePartialCar).toHaveBeenCalled();
      expect(CarModel.updateCar).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedCar);
    });

    it('debería manejar precio inválido y devolver status 400', async () => {
      // Configuración
      req.params = { id: '1' };
      req.body = {
        price: 'invalid'
      };

      // Ejecución
      await CarController.updateCar(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid price value' });
    });

    it('debería manejar datos inválidos y devolver status 400', async () => {
      // Configuración
      req.params = { id: '1' };
      req.body = {
        brand: '', // Inválido para el esquema
      };

      vi.mocked(validatePartialCar).mockReturnValueOnce({ 
        success: false, 
        error: {
            message: JSON.stringify({ formErrors: ['Brand cannot be empty'] }),
            issues: [],
            errors: [],
            format: function (): ZodFormattedError<unknown, string> {
                throw new Error('Function not implemented.');
            },
            isEmpty: false,
            addIssue: function (sub: ZodIssue): void {
                throw new Error('Function not implemented.');
            },
            addIssues: function (subs?: ZodIssue[]): void {
                throw new Error('Function not implemented.');
            },
            flatten: function (): typeToFlattenedError<unknown, string> {
                throw new Error('Function not implemented.');
            },
            formErrors: {
                formErrors: [],
                fieldErrors: {}
            },
            name: ''
        } 
      } as any);

      // Ejecución
      await CarController.updateCar(req as Request, res as Response);

      // Verificaciones
      expect(validatePartialCar).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error updating car', 
        error: { formErrors: ['Brand cannot be empty'] } 
      });
    });

    it('debería procesar imágenes correctamente durante la actualización', async () => {
      // Configuración
      req.params = { id: '1' };
      req.body = {
        brand: 'BMW',
        model: 'X7',
      };
      
      req.files = [
        { buffer: Buffer.from('test') } as Express.Multer.File
      ];

      vi.mocked(validatePartialCar).mockReturnValueOnce({ success: true, data: {} });
      
      const updatedCar = {
        id: 1,
        brand: 'BMW',
        model: 'X7',
        description: 'Luxury SUV',
        price: 150,
        images: ['https://test-url.com/image.jpg']
      };
      
      vi.mocked(CarModel.updateCar).mockResolvedValueOnce(updatedCar);

      // Ejecución
      await CarController.updateCar(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedCar);
    });

    it('debería manejar errores durante la actualización y devolver status 500', async () => {
      // Configuración
      req.params = { id: '1' };
      req.body = {
        brand: 'BMW',
        model: 'X7',
      };
      
      vi.mocked(validatePartialCar).mockReturnValueOnce({ success: true, data: {} });
      vi.mocked(CarModel.updateCar).mockRejectedValueOnce(new Error('Database error'));

      // Ejecución
      await CarController.updateCar(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Database error' 
      });
    });
  });

  describe('deleteCar', () => {
    it('debería eliminar un auto y devolver status 200', async () => {
      // Configuración
      req.params = { id: '1' };
      
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

      // Ejecución
      await CarController.deleteCar(req as Request, res as Response);

      // Verificaciones
      expect(CarModel.getCarById).toHaveBeenCalledWith(1);
      expect(CarModel.deleteCar).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Car and associated images deleted successfully' 
      });
    });

    it('debería devolver 404 si el auto no existe', async () => {
      // Configuración
      req.params = { id: '999' };
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(null);

      // Ejecución
      await CarController.deleteCar(req as Request, res as Response);

      // Verificaciones
      expect(CarModel.getCarById).toHaveBeenCalledWith(999);
      expect(CarModel.deleteCar).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Car not found' });
    });

    it('debería manejar errores durante la eliminación y devolver status 500', async () => {
      // Configuración
      req.params = { id: '1' };
      
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        description: 'Luxury SUV',
        price: 150,
        images: ['https://test-url.com/image.jpg']
      };
      
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(mockCar);
      vi.mocked(CarModel.deleteCar).mockRejectedValueOnce(new Error('Database error'));

      // Ejecución
      await CarController.deleteCar(req as Request, res as Response);

      // Verificaciones
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Database error' 
      });
    });

    it('debería eliminar las imágenes de Cloudinary correctamente', async () => {
      // Configuración
      req.params = { id: '1' };
      
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        description: 'Luxury SUV',
        price: 150,
        images: [
          'https://res.cloudinary.com/demo/image/upload/cars/image1.jpg',
          'https://res.cloudinary.com/demo/image/upload/cars/image2.jpg'
        ]
      };
      
      vi.mocked(CarModel.getCarById).mockResolvedValueOnce(mockCar);
      vi.mocked(CarModel.deleteCar).mockResolvedValueOnce({ message: 'Car deleted successfully' });
      
      // Mock para el método getPublicIdFromUrl
      const originalMethod = CarController.getPublicIdFromUrl;
      CarController.getPublicIdFromUrl = vi.fn()
        .mockReturnValueOnce('cars/image1')
        .mockReturnValueOnce('cars/image2');

      // Ejecución
      await CarController.deleteCar(req as Request, res as Response);

      // Verificaciones
      expect(vi.mocked(cloudinary.uploader.destroy)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(cloudinary.uploader.destroy)).toHaveBeenCalledWith('cars/image1');
      expect(vi.mocked(cloudinary.uploader.destroy)).toHaveBeenCalledWith('cars/image2');
      
      // Restaurar el método original
      CarController.getPublicIdFromUrl = originalMethod;
    });
  });

  describe('getPublicIdFromUrl', () => {
    it('debería extraer correctamente el public_id de una URL de Cloudinary', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/cars/image123.jpg';
      const publicId = CarController.getPublicIdFromUrl(url);
      expect(publicId).toBe('cars/image123');
    });

    it('debería manejar URLs inválidas y devolver null', () => {
      const url = 'invalid-url';
      const publicId = CarController.getPublicIdFromUrl(url);
      expect(publicId).toBeNull();
    });
  });
}); 