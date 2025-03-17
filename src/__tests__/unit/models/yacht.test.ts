import { vi, describe, it, expect, beforeEach } from 'vitest';
import YachtModel from '../../../models/yacht.js';
import db from '../../../utils/db_render.js';
import { validateYacht, validatePartialYacht } from '../../../schemas/yachtSchema.js';
import { QueryResult } from 'pg';
import { Yacht } from '../../../types/index.js';
import { ZodError } from 'zod';

type CreateYachtDTO = Omit<Yacht, 'id'>;

vi.mock('../../../utils/db_render', () => ({
    default: {
        query: vi.fn()
    }
}));

vi.mock('../../../schemas/yachtSchema', () => ({
    validateYacht: vi.fn(),
    validatePartialYacht: vi.fn()
}));

describe('YachtModel', () => {
    const mockYacht = {
        id: 1,
        name: 'Yacht Test',
        description: 'A test yacht',
        capacity: 10,
        price: 1000.50,
        images: ['image1.jpg', 'image2.jpg']
    };

    const mockQueryResult = (rows: any[]): QueryResult => ({
        rows,
        command: '',
        rowCount: rows.length,
        oid: 0,
        fields: []
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuración predeterminada para validateYacht y validatePartialYacht
        (validateYacht as any).mockReturnValue({ success: true, data: {} });
        (validatePartialYacht as any).mockReturnValue({ success: true, data: {} });
    });

    describe('getAll', () => {
        it('debería obtener todos los yates', async () => {
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([mockYacht]));

            const result = await YachtModel.getAll();

            expect(result).toEqual([mockYacht]);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM yachts');
        });

        it('debería manejar errores y reenviarlos', async () => {
            const error = new Error('Database error');
            vi.mocked(db.query).mockRejectedValueOnce(error);

            await expect(YachtModel.getAll()).rejects.toThrow('Database error');
        });
    });

    describe('getYachtById', () => {
        it('debería obtener un yate por ID', async () => {
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([mockYacht]));

            const result = await YachtModel.getYachtById(1);

            expect(result).toEqual(mockYacht);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM yachts WHERE id = $1', [1]);
        });

        it('debería devolver null cuando el yate no existe', async () => {
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([]));

            const result = await YachtModel.getYachtById(999);

            expect(result).toBeNull();
        });

        it('debería manejar errores y reenviarlos', async () => {
            const error = new Error('Database error');
            vi.mocked(db.query).mockRejectedValueOnce(error);

            await expect(YachtModel.getYachtById(1)).rejects.toThrow('Database error');
        });
    });

    describe('createYacht', () => {
        it('debería crear un yate', async () => {
            const { id, ...yachtData } = mockYacht;
            const newYacht: CreateYachtDTO = yachtData;
            vi.mocked(validateYacht).mockReturnValueOnce({ success: true, data: newYacht });
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([{ id: 1, ...yachtData }]));

            const result = await YachtModel.createYacht(newYacht as Yacht);

            expect(result).toEqual(mockYacht);
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO yachts (name, description, capacity, price, images) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
                [yachtData.name, yachtData.description, yachtData.capacity, yachtData.price, JSON.stringify(yachtData.images)]
            );
        });

        it('debería manejar errores de validación', async () => {
            // Mock para simular error de validación
            vi.mocked(validateYacht).mockReturnValueOnce({
                success: false,
                error: {
                    errors: [{ message: 'Validation error' }]
                }
            } as any);

            await expect(YachtModel.createYacht({ name: 'Test Yacht' } as Yacht)).rejects.toThrow('Validation error');
        });

        it('debería manejar errores de campos requeridos faltantes', async () => {
            const invalidYachtData = { description: 'Invalid yacht' } as CreateYachtDTO;
            vi.mocked(validateYacht).mockReturnValueOnce({ success: true, data: invalidYachtData });
            
            await expect(YachtModel.createYacht(invalidYachtData as Yacht)).rejects.toThrow('Missing required fields');
            expect(db.query).not.toHaveBeenCalled();
        });

        it('debería manejar errores de base de datos', async () => {
            const { id, ...yachtData } = mockYacht;
            const newYacht: CreateYachtDTO = yachtData;
            vi.mocked(validateYacht).mockReturnValueOnce({ success: true, data: newYacht });
            vi.mocked(db.query).mockRejectedValueOnce(new Error('Database error'));

            await expect(YachtModel.createYacht(newYacht as Yacht)).rejects.toThrow('Database error');
        });
    });

    describe('updateYacht', () => {
        it('debería actualizar un yate', async () => {
            const updateData = { name: 'Updated Yacht', price: 2000.50 };
            const updatedYacht = { ...mockYacht, ...updateData };
            
            // Configurar validatePartialYacht para pasar la validación
            (validatePartialYacht as any).mockReturnValueOnce({ success: true, data: updateData });
            // Verificar si el yate existe con getYachtById
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([mockYacht])); // Para getYachtById
            // Configurar la respuesta para UPDATE
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([updatedYacht])); // Para el UPDATE

            const result = await YachtModel.updateYacht(1, updateData);

            expect(result).toEqual(expect.objectContaining({
                ...mockYacht,
                name: 'Updated Yacht',
                price: 2000.50
            }));
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('debería manejar errores cuando no hay campos para actualizar', async () => {
            // Configurar validatePartialYacht para un objeto vacío
            (validatePartialYacht as any).mockReturnValueOnce({ success: true, data: {} });
            
            await expect(YachtModel.updateYacht(1, {})).rejects.toThrow('No valid fields to update');
        });

        it('debería manejar errores cuando el yate no existe', async () => {
            // Configurar validatePartialYacht
            (validatePartialYacht as any).mockReturnValueOnce({ success: true, data: { name: 'Updated Yacht' } });
            // Configurar respuesta para getYachtById (yate no existe)
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([])); // Para getYachtById

            await expect(YachtModel.updateYacht(999, { name: 'Updated Yacht' })).rejects.toThrow('Yacht not found');
        });

        it('debería manejar errores de base de datos', async () => {
            // Configurar validatePartialYacht
            (validatePartialYacht as any).mockReturnValueOnce({ success: true, data: { name: 'Updated Yacht' } });
            // Configurar error de DB
            vi.mocked(db.query).mockRejectedValueOnce(new Error('Database error'));

            await expect(YachtModel.updateYacht(1, { name: 'Updated Yacht' })).rejects.toThrow('Error updating yacht');
        });
    });

    describe('deleteYacht', () => {
        it('debería eliminar un yate', async () => {
            // Primero se verifica si el yate existe
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([mockYacht])); // Para getYachtById
            // Luego el borrado
            vi.mocked(db.query).mockResolvedValueOnce(mockQueryResult([{ id: 1 }]));

            const result = await YachtModel.deleteYacht(1);

            expect(result).toEqual({ message: 'Yacht deleted successfully' });
            expect(db.query).toHaveBeenCalledTimes(2);
            expect(db.query).toHaveBeenLastCalledWith('DELETE FROM yachts WHERE id = $1 RETURNING id', [1]);
        });

        it('debería manejar errores cuando el yate no existe', async () => {
            // Mock para simular que el yate no existe
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            await expect(YachtModel.deleteYacht(999)).rejects.toThrow('Yacht not found');
        });

        it('debería manejar errores de base de datos', async () => {
            // Mock para simular error en la base de datos
            vi.mocked(db.query).mockRejectedValueOnce(new Error('Database error'));

            await expect(YachtModel.deleteYacht(1)).rejects.toThrow('Error deleting yacht');
        });
    });
}); 