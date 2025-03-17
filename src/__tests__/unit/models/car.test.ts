/**
 * Tests para CarModel usando Vitest
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mocks
vi.mock('../../../utils/db_render.js', () => {
  return {
    default: {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] })
    }
  };
});

vi.mock('../../../schemas/carSchema.js', () => {
  return {
    validateCar: vi.fn().mockReturnValue({ success: true, data: {} })
  };
});

// Importar después de los mocks
import CarModel from '../../../models/car.js';
import db from '../../../utils/db_render.js';
import { validateCar } from '../../../schemas/carSchema.js';
import { Cars } from '../../../types/index.js';

describe('CarModel', () => {
  const testCar = {
    id: 1,
    brand: 'BMW',
    model: 'X5',
    description: 'Luxury SUV',
    price: 150,
    images: ['https://example.com/bmw.jpg']
  };

  beforeEach(() => {
    // Limpiar todos los mocks
    vi.clearAllMocks();
  });

  test('getAll devuelve todos los autos', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [testCar], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.getAll();
    
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM cars');
    expect(result).toEqual([testCar]);
  });

  test('getAll maneja correctamente las imágenes en formato JSON', async () => {
    const carWithStringImages = {
      ...testCar,
      images: JSON.stringify(['https://example.com/bmw.jpg'])
    };
    
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [carWithStringImages], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.getAll();
    
    expect(result[0].images).toEqual(['https://example.com/bmw.jpg']);
  });

  test('getCarById devuelve un auto si existe', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [testCar], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.getCarById(1);
    
    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM cars WHERE id = $1', 
      [1]
    );
    expect(result).toEqual(testCar);
  });

  test('getCarById maneja correctamente las imágenes en formato JSON', async () => {
    const carWithStringImages = {
      ...testCar,
      images: JSON.stringify(['https://example.com/bmw.jpg'])
    };
    
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [carWithStringImages], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.getCarById(1);
    
    expect(result?.images).toEqual(['https://example.com/bmw.jpg']);
  });

  test('getCarById devuelve null si no existe', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [], 
      rowCount: 0, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.getCarById(999);
    
    expect(result).toBeNull();
  });

  test('createCar crea correctamente un auto', async () => {
    const { id, ...carData } = testCar;
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [{ id: 1 }], 
      rowCount: 1, 
      command: 'INSERT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.createCar(carData as Cars);
    
    expect(validateCar).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      'INSERT INTO cars (brand, model, price, description, images) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
      [carData.brand, carData.model, carData.price, carData.description, JSON.stringify(carData.images)]
    );
    expect(result).toHaveProperty('id', 1);
  });

  test('updateCar actualiza correctamente', async () => {
    // Mock para el UPDATE
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [], 
      rowCount: 1, 
      command: 'UPDATE', 
      oid: 0, 
      fields: [] 
    });
    
    // Mock para el SELECT posterior
    const updatedCar = { ...testCar, price: 200 };
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [updatedCar], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.updateCar(1, { price: 200 });
    
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(result.price).toBe(200);
  });

  test('updateCar maneja correctamente las imágenes en formato JSON', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [], 
      rowCount: 1, 
      command: 'UPDATE', 
      oid: 0, 
      fields: [] 
    });
    
    const updatedCar = {
      ...testCar,
      images: JSON.stringify(['https://example.com/new-bmw.jpg'])
    };
    
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [updatedCar], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.updateCar(1, { 
      images: ['https://example.com/new-bmw.jpg']
    });
    
    expect(result.images).toEqual(['https://example.com/new-bmw.jpg']);
  });

  test('updateCar lanza error si no hay campos para actualizar', async () => {
    await expect(CarModel.updateCar(1, {})).rejects.toThrow('No valid fields to update');
  });

  test('deleteCar elimina correctamente', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [testCar], 
      rowCount: 1, 
      command: 'DELETE', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await CarModel.deleteCar(1);
    
    expect(db.query).toHaveBeenCalledWith(
      'DELETE FROM cars WHERE id = $1 RETURNING *;', 
      [1]
    );
    expect(result).toEqual({ message: 'Car deleted successfully' });
  });

  test('deleteCar lanza error si el auto no existe', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [], 
      rowCount: 0, 
      command: 'DELETE', 
      oid: 0, 
      fields: [] 
    });
    
    await expect(CarModel.deleteCar(999)).rejects.toThrow('Error deleting car');
  });
}); 