import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReviewModel from '../../../models/review.js';
import db from '../../../utils/db_render.js';
import { validateReview, validatePartialReview } from '../../../schemas/reviewSchema.js';
import { Review, CreateReviewDTO, UpdateReviewDTO } from '../../../types/index.js';

// Mock de la base de datos
vi.mock('../../../utils/db_render.js', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock del schema
vi.mock('../../../schemas/reviewSchema.js', () => ({
    validateReview: vi.fn(),
    validatePartialReview: vi.fn()
}));

describe('ReviewModel', () => {
    const mockReview: Review = {
        id: 1,
        name: 'Usuario Test',
        comment: 'Test Comment'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuración predeterminada para validateReview y validatePartialReview
        (validateReview as any).mockReturnValue({ success: true, data: {} });
        (validatePartialReview as any).mockReturnValue({ success: true, data: {} });
    });

    describe('getAll', () => {
        it('debería obtener todas las reseñas', async () => {
            const mockReviews = [mockReview, { ...mockReview, id: 2 }];
            // Mockear la consulta de reviews
            (db.query as any).mockResolvedValueOnce({ rows: mockReviews });

            const result = await ReviewModel.getAll();

            expect(result).toEqual(mockReviews);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM reviews;');
        });

        it('debería devolver un array vacío cuando no hay reseñas', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });
            
            const result = await ReviewModel.getAll();
            
            expect(result).toEqual([]);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM reviews;');
        });

        it('debería devolver un array vacío en caso de error', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            const result = await ReviewModel.getAll();
            
            expect(result).toEqual([]);
        });
    });

    describe('getReviewById', () => {
        it('debería obtener una reseña por ID', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [mockReview] });

            const result = await ReviewModel.getReviewById(1);

            expect(result).toEqual(mockReview);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM reviews WHERE id = $1', [1]);
        });

        it('debería devolver null cuando la reseña no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const result = await ReviewModel.getReviewById(999);

            expect(result).toBeNull();
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM reviews WHERE id = $1', [999]);
        });

        it('debería manejar errores y reenviarlos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(ReviewModel.getReviewById(1)).rejects.toThrow(Error);
        });
    });

    describe('createReview', () => {
        it('debería crear una nueva reseña', async () => {
            const { id, ...newReview } = mockReview;

            (validateReview as any).mockReturnValueOnce({ success: true, data: newReview });
            // Mockear la inserción de la review
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1, ...newReview }] });

            const result = await ReviewModel.createReview(newReview as unknown as Review);

            expect(result).toEqual({ id: 1, ...newReview });
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO reviews (name, comment) VALUES ($1, $2) RETURNING *;',
                [newReview.name, newReview.comment]
            );
        });

        it('debería crear un objeto de respuesta cuando no se retornan filas', async () => {
            const { id, ...newReview } = mockReview;

            (validateReview as any).mockReturnValueOnce({ success: true, data: newReview });
            // Mockear la inserción fallida (sin filas)
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const result = await ReviewModel.createReview(newReview as unknown as Review);

            expect(result).toHaveProperty('id');
            expect(result.name).toBe(newReview.name);
            expect(result.comment).toBe(newReview.comment);
        });

        it('debería manejar errores de validación', async () => {
            const { id, ...newReview } = mockReview;
            const validationError = { success: false, error: { message: JSON.stringify({ errors: [{ message: 'Validation error' }] }) } };
            
            (validateReview as any).mockReturnValueOnce(validationError);

            await expect(ReviewModel.createReview(newReview as unknown as Review)).rejects.toThrow();
        });

        it('debería manejar errores cuando faltan campos requeridos', async () => {
            const invalidReview = { comment: 'Invalid comment' } as unknown as Review;
            
            (validateReview as any).mockReturnValueOnce({ success: true, data: invalidReview });

            await expect(ReviewModel.createReview(invalidReview)).rejects.toThrow('Missing required fields');
            expect(db.query).not.toHaveBeenCalled();
        });

        it('debería manejar errores de base de datos', async () => {
            const { id, ...newReview } = mockReview;
            
            (validateReview as any).mockReturnValueOnce({ success: true, data: newReview });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(ReviewModel.createReview(newReview as unknown as Review)).rejects.toThrow(Error);
        });
    });

    describe('updateReview', () => {
        it('debería actualizar una reseña', async () => {
            const updateData: UpdateReviewDTO = {
                name: 'Updated Name',
                comment: 'Updated Comment'
            };
            const updatedReview = { ...mockReview, ...updateData };
            
            (validatePartialReview as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockResolvedValueOnce({ rowCount: 1 }); // Para el UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [updatedReview] }); // Para el SELECT

            const result = await ReviewModel.updateReview(1, updateData);

            expect(result).toEqual(updatedReview);
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('debería manejar errores cuando no hay campos para actualizar', async () => {
            (validatePartialReview as any).mockReturnValueOnce({ success: true, data: {} });
            
            await expect(ReviewModel.updateReview(1, {})).rejects.toThrow('No valid fields to update');
        });

        it('debería manejar errores cuando la reseña no existe', async () => {
            const updateData: UpdateReviewDTO = { name: 'Updated Name' };
            
            (validatePartialReview as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockResolvedValueOnce({ rowCount: 1 }); // Para el UPDATE
            (db.query as any).mockResolvedValueOnce({ rows: [] }); // Para el SELECT (no encontró la reseña)

            await expect(ReviewModel.updateReview(999, updateData)).rejects.toThrow('Review not found');
        });

        it('debería manejar errores de base de datos', async () => {
            const updateData: UpdateReviewDTO = { name: 'Updated Name' };
            
            (validatePartialReview as any).mockReturnValueOnce({ success: true, data: updateData });
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            await expect(ReviewModel.updateReview(1, updateData)).rejects.toThrow(Error);
        });
    });

    describe('deleteReview', () => {
        it('debería eliminar una reseña', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const result = await ReviewModel.deleteReview(1);

            expect(result).toEqual({ success: true, message: 'Review deleted successfully' });
            expect(db.query).toHaveBeenCalledWith('DELETE FROM reviews WHERE id = $1 RETURNING *;', [1]);
        });

        it('debería devolver un mensaje cuando la reseña no existe', async () => {
            (db.query as any).mockResolvedValueOnce({ rows: [] });

            const result = await ReviewModel.deleteReview(999);
            
            expect(result).toEqual({ success: false, message: 'Review not found' });
        });

        it('debería devolver un mensaje en caso de error de base de datos', async () => {
            (db.query as any).mockRejectedValueOnce(new Error('Database error'));

            const result = await ReviewModel.deleteReview(1);
            
            expect(result).toEqual({ success: false, message: 'Database error' });
        });
    });
}); 