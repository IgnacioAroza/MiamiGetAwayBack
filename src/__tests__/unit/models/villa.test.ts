import { describe, it, expect, beforeEach, vi } from 'vitest';
import VillaModel from '../../../models/villa.js';
import db from '../../../utils/db_render.js';
import { validateVilla, validatePartialVilla } from '../../../schemas/villaSchema.js';
import { Villa, CreateVillaDTO, UpdateVillaDTO } from '../../../types/index.js';

// Mock de la base de datos
vi.mock('../../../utils/db_render.js', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock del schema
vi.mock('../../../schemas/villaSchema.js', () => ({
    validateVilla: vi.fn(),
    validatePartialVilla: vi.fn()
}));

describe('VillaModel', () => {
    const mockVilla: Villa = {
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

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuración predeterminada para validateVilla y validatePartialVilla
        (validateVilla as any).mockReturnValue({ success: true, data: {} });
        (validatePartialVilla as any).mockReturnValue({ success: true, data: {} });
    });

    describe('getAll', () => {
        it('should return all villas', async () => {
            const mockVillas = [mockVilla, { ...mockVilla, id: 2 }];
            (db.query as any).mockResolvedValueOnce({ rows: mockVillas });

            const result = await VillaModel.getAll();

            expect(result).toEqual(mockVillas);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM villas');
        });

        it('should throw error when database fails', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(VillaModel.getAll()).rejects.toThrow('Database error');
        });
    });

    describe('getVillaById', () => {
        it('should return a villa by id', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [mockVilla] });

            const result = await VillaModel.getVillaById(1);

            expect(result).toEqual(mockVilla);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM villas WHERE id = $1', [1]);
        });

        it('should return null when villa not found', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const result = await VillaModel.getVillaById(999);

            expect(result).toBeNull();
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM villas WHERE id = $1', [999]);
        });

        it('should throw error when database fails', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(VillaModel.getVillaById(1)).rejects.toThrow('Database error');
        });
    });

    describe('createVilla', () => {
        it('should create a new villa', async () => {
            const { id, ...newVilla } = mockVilla;

            (validateVilla as any).mockReturnValueOnce({ success: true, data: newVilla });
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1, ...newVilla }] });

            const result = await VillaModel.createVilla(newVilla as CreateVillaDTO);

            expect(result).toEqual({ id: 1, ...newVilla });
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO villas (name, description, address, capacity, bathrooms, rooms, price, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;',
                [newVilla.name, newVilla.description, newVilla.address, newVilla.capacity, newVilla.bathrooms, newVilla.rooms, newVilla.price, JSON.stringify(newVilla.images)]
            );
        });

        it('should throw error when validation fails', async () => {
            const { id, ...newVilla } = mockVilla;

            (validateVilla as any).mockReturnValueOnce({ 
                success: false, 
                error: { 
                    errors: [{ message: 'Name is required' }]
                } 
            });

            await expect(VillaModel.createVilla(newVilla as CreateVillaDTO)).rejects.toThrow('Name is required');
        });

        it('should throw error when required fields are missing', async () => {
            const { id, name, ...invalidVilla } = mockVilla;

            (validateVilla as any).mockReturnValueOnce({ success: true, data: invalidVilla });
            // No configuramos el mock de db.query para que ni siquiera se llame

            // Verificar que se compruebe la existencia de name antes de intentar la consulta
            await expect(VillaModel.createVilla(invalidVilla as CreateVillaDTO)).rejects.toThrow('Missing required fields');
            expect(db.query).not.toHaveBeenCalled();
        });

        it('should throw error when database fails', async () => {
            const { id, ...newVilla } = mockVilla;

            (validateVilla as any).mockReturnValueOnce({ success: true });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(VillaModel.createVilla(newVilla as CreateVillaDTO)).rejects.toThrow('Database error');
        });
    });

    describe('updateVilla', () => {
        it('should update a villa', async () => {
            const updateData: UpdateVillaDTO = {
                name: 'Updated Villa',
                price: 2000
            };

            // Configurar validatePartialVilla para pasar
            (validatePartialVilla as any).mockReturnValueOnce({ success: true, data: updateData });
            // Verificar si la villa existe con getVillaById
            (db.query as any).mockResolvedValueOnce({ rows: [mockVilla] }); // Para getVillaById
            // Configurar la respuesta para UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [{ ...mockVilla, ...updateData }] }); // Para el UPDATE

            const result = await VillaModel.updateVilla(1, updateData);

            expect(result).toEqual(expect.objectContaining({ 
                ...mockVilla, 
                name: 'Updated Villa',
                price: 2000 
            }));
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('should throw error when no valid fields to update', async () => {
            // Configurar validatePartialVilla
            (validatePartialVilla as any).mockReturnValueOnce({ success: true, data: {} });
            
            await expect(VillaModel.updateVilla(1, {})).rejects.toThrow('No valid fields to update');
        });

        it('should throw error when villa not found', async () => {
            // Configurar validatePartialVilla
            (validatePartialVilla as any).mockReturnValueOnce({ success: true, data: { name: 'Updated Villa' } });
            // Configurar respuesta para getVillaById (villa no existe)
            (db.query as any).mockResolvedValueOnce({ rows: [] }); 

            await expect(VillaModel.updateVilla(999, { name: 'Updated Villa' })).rejects.toThrow('Villa not found');
        });

        it('should throw error when database fails', async () => {
            // Configurar validatePartialVilla
            (validatePartialVilla as any).mockReturnValueOnce({ success: true, data: { name: 'Updated Villa' } });
            // Configurar error de DB
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(VillaModel.updateVilla(1, { name: 'Updated Villa' })).rejects.toThrow('Error updating villa');
        });
    });

    describe('deleteVilla', () => {
        it('should delete a villa', async () => {
            // Primero se verifica si la villa existe
            (db.query as any).mockResolvedValueOnce({ rows: [mockVilla] }); // Para getVillaById
            // Luego el borrado
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const result = await VillaModel.deleteVilla(1);

            expect(result).toEqual({ message: 'Villa deleted successfully' });
            expect(db.query).toHaveBeenCalledTimes(2);
            expect(db.query).toHaveBeenLastCalledWith('DELETE FROM villas WHERE id = $1 RETURNING id', [1]);
        });

        it('should throw error when villa not found', async () => {
            // Mock para simular que la villa no existe
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            await expect(VillaModel.deleteVilla(999)).rejects.toThrow('Villa not found');
        });

        it('should throw error when database fails', async () => {
            // Mock para simular error en la base de datos
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(VillaModel.deleteVilla(1)).rejects.toThrow('Error deleting villa');
        });
    });
}); 