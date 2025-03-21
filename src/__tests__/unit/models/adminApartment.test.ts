import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminApartmentModel } from '../../../models/adminApartment.js';
import db from '../../../utils/db_render.js';
import { validateApartment, validatePartialApartment } from '../../../schemas/adminApartmentSchema.js';
import { AdminApartment } from '../../../types/adminApartments.js';

// Mock de la base de datos
vi.mock('../../../utils/db_render.js', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock del schema
vi.mock('../../../schemas/adminApartmentSchema.js', () => ({
    validateApartment: vi.fn(),
    validatePartialApartment: vi.fn()
}));

describe('AdminApartmentModel', () => {
    const mockApartment: AdminApartment = {
        id: 1,
        buildingName: 'Ocean View',
        unitNumber: '305',
        distribution: '2 beds 2 baths',
        description: 'Beautiful apartment with ocean view',
        address: '123 Beach Blvd, Miami, FL',
        capacity: 4,
        pricePerNight: 150,
        cleaningFee: 80,
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuración predeterminada para validateApartment y validatePartialApartment
        (validateApartment as any).mockReturnValue({ success: true, data: {} });
        (validatePartialApartment as any).mockReturnValue({ success: true, data: {} });
    });

    describe('getAllApartments', () => {
        it('debería obtener todos los apartamentos', async () => {
            // Mock para devolver un array de apartamentos
            (db.query as any).mockResolvedValueOnce({ rows: [mockApartment] });
            
            const result = await AdminApartmentModel.getAllApartments();
            
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM admin_apartments');
            expect(result).toEqual([mockApartment]);
        });
        
        it('debería manejar errores y reenviarlos', async () => {
            // Mock para simular un error de base de datos
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));
            
            await expect(AdminApartmentModel.getAllApartments()).rejects.toThrow('Database error');
        });
    });

    describe('getApartmentById', () => {
        it('debería obtener un apartamento por ID', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [mockApartment] });

            const result = await AdminApartmentModel.getApartmentById(1);

            expect(result).toEqual(mockApartment);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM admin_apartments WHERE id = $1', [1]);
        });

        it('debería devolver null cuando el apartamento no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const result = await AdminApartmentModel.getApartmentById(999);

            expect(result).toBeNull();
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM admin_apartments WHERE id = $1', [999]);
        });

        it('debería manejar errores y reenviarlos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminApartmentModel.getApartmentById(1)).rejects.toThrow('Database error');
        });
    });

    describe('createApartment', () => {
        it('debería crear un nuevo apartamento', async () => {
            const { id, ...newApartment } = mockApartment;

            (validateApartment as any).mockReturnValueOnce({ success: true, data: newApartment });
            (db.query as any).mockResolvedValueOnce({ 
                rows: [{ id: 1, ...newApartment }] 
            });

            const result = await AdminApartmentModel.createApartment(newApartment as AdminApartment);

            expect(result).toEqual({ id: 1, ...newApartment });
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO admin_apartments (building_name, unit_number, distribution, description, address, capacity, price_per_night, cleaning_fee, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
                [
                    newApartment.buildingName,
                    newApartment.unitNumber,
                    newApartment.distribution,
                    newApartment.description,
                    newApartment.address,
                    newApartment.capacity,
                    newApartment.pricePerNight,
                    newApartment.cleaningFee,
                    newApartment.images
                ]
            );
        });

        it('debería manejar errores de validación', async () => {
            const { id, ...newApartment } = mockApartment;
            const validationError = { 
                success: false, 
                error: { message: JSON.stringify({ errors: [{ message: 'Validation error' }] }) } 
            };
            
            (validateApartment as any).mockReturnValueOnce(validationError);

            await expect(AdminApartmentModel.createApartment(newApartment as AdminApartment)).rejects.toThrow();
        });

        it('debería manejar errores de base de datos', async () => {
            const { id, ...newApartment } = mockApartment;
            
            (validateApartment as any).mockReturnValueOnce({ success: true, data: newApartment });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminApartmentModel.createApartment(newApartment as AdminApartment)).rejects.toThrow('Database error');
        });
    });

    describe('updateApartment', () => {
        it('debería actualizar un apartamento', async () => {
            const updateData = {
                buildingName: 'Updated Name',
                pricePerNight: 200
            };
            const updatedApartment = { ...mockApartment, ...updateData };
            
            (validatePartialApartment as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockResolvedValueOnce({ rows: [updatedApartment] });

            const result = await AdminApartmentModel.updateApartment(1, updateData);

            expect(result).toEqual(updatedApartment);
            expect(db.query).toHaveBeenCalledWith(
                'UPDATE admin_apartments SET (building_name, unit_number, distribution, description, address, capacity, price_per_night, cleaning_fee, images) = ($1, $2, $3, $4, $5, $6, $7, $8, $9) WHERE id = $1 RETURNING *',
                [
                    updateData.buildingName, 
                    undefined, 
                    undefined, 
                    undefined, 
                    undefined, 
                    undefined, 
                    updateData.pricePerNight, 
                    undefined, 
                    undefined, 
                    1
                ]
            );
        });

        it('debería manejar errores de validación', async () => {
            const updateData = { buildingName: 'Updated Name' };
            
            const validationError = { 
                success: false, 
                error: { message: JSON.stringify({ errors: [{ message: 'Validation error' }] }) } 
            };
            
            (validatePartialApartment as any).mockReturnValueOnce(validationError);

            await expect(AdminApartmentModel.updateApartment(1, updateData)).rejects.toThrow();
        });

        it('debería manejar errores de base de datos', async () => {
            const updateData = { buildingName: 'Updated Name' };
            
            (validatePartialApartment as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminApartmentModel.updateApartment(1, updateData)).rejects.toThrow('Database error');
        });
    });

    describe('deleteApartment', () => {
        it('debería eliminar un apartamento', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const result = await AdminApartmentModel.deleteApartment(1);

            expect(result).toEqual({ message: 'Apartment deleted successfully' });
            expect(db.query).toHaveBeenCalledWith('DELETE FROM admin_apartments WHERE id = $1 RETURNING *', [1]);
        });

        it('debería manejar errores cuando el apartamento no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            await expect(AdminApartmentModel.deleteApartment(999)).rejects.toThrow('Apartment not found');
            expect(db.query).toHaveBeenCalledWith('DELETE FROM admin_apartments WHERE id = $1 RETURNING *', [999]);
        });

        it('debería manejar errores de base de datos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(AdminApartmentModel.deleteApartment(1)).rejects.toThrow('Database error');
        });
    });
}); 