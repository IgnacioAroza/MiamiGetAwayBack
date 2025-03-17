/**
 * Tests para ApartmentModel usando Vitest
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

vi.mock('../../../schemas/apartmentSchema.js', () => {
  return {
    validateApartment: vi.fn().mockReturnValue({ success: true, data: {} })
  };
});

// Importar después de los mocks
import ApartmentModel from '../../../models/apartment.js';
import db from '../../../utils/db_render.js';
import { validateApartment } from '../../../schemas/apartmentSchema.js';
import { Apartment } from '../../../types/index.js';

describe('ApartmentModel', () => {
  const testApartment = {
    id: 1,
    name: 'Test Apartment',
    description: 'Description',
    address: 'Test Address',
    capacity: 2,
    bathrooms: 1,
    rooms: 1,
    price: 100,
    images: ['https://example.com/image.jpg']
  };

  beforeEach(() => {
    // Limpiar todos los mocks
    vi.clearAllMocks();
  });

  test('getAll devuelve todos los apartamentos', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [testApartment], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await ApartmentModel.getAll();
    
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM apartments');
    expect(result).toEqual([testApartment]);
  });

  test('getApartmentById devuelve un apartamento si existe', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [testApartment], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await ApartmentModel.getApartmentById(1);
    
    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM apartments WHERE id = $1', 
      [1]
    );
    expect(result).toEqual(testApartment);
  });

  test('getApartmentById devuelve null si no existe', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [], 
      rowCount: 0, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await ApartmentModel.getApartmentById(999);
    
    expect(result).toBeNull();
  });

  test('createApartment crea correctamente un apartamento', async () => {
    const { id, ...apartmentData } = testApartment;
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [{ id: 1 }], 
      rowCount: 1, 
      command: 'INSERT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await ApartmentModel.createApartment(apartmentData as Apartment);
    
    expect(validateApartment).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalled();
    expect(result).toHaveProperty('id', 1);
  });

  test('updateApartment actualiza correctamente', async () => {
    // Mock para el UPDATE
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [], 
      rowCount: 1, 
      command: 'UPDATE', 
      oid: 0, 
      fields: [] 
    });
    
    // Mock para el SELECT posterior
    const updatedApartment = { ...testApartment, name: 'Updated Name' };
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [updatedApartment], 
      rowCount: 1, 
      command: 'SELECT', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await ApartmentModel.updateApartment(1, { name: 'Updated Name' });
    
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(result.name).toBe('Updated Name');
  });

  test('deleteApartment elimina correctamente', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ 
      rows: [testApartment], 
      rowCount: 1, 
      command: 'DELETE', 
      oid: 0, 
      fields: [] 
    });
    
    const result = await ApartmentModel.deleteApartment(1);
    
    expect(db.query).toHaveBeenCalledWith(
      'DELETE FROM apartments WHERE id = $1 RETURNING *;', 
      [1]
    );
    expect(result).toEqual({ message: 'Apartment deleted successfully' });
  });
}); 