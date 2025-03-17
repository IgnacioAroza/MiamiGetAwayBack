import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import ReviewController from '../../../controllers/review.js';
import ReviewModel from '../../../models/review.js';
import { validateReview } from '../../../schemas/reviewSchema.js';
import { Review } from '../../../types/index.js';

// Mock del modelo y del schema
vi.mock('../../../models/review.js', () => ({
    default: {
        getAll: vi.fn(),
        getReviewById: vi.fn(),
        createReview: vi.fn(),
        updateReview: vi.fn(),
        deleteReview: vi.fn()
    }
}));

vi.mock('../../../schemas/reviewSchema.js', () => ({
    validateReview: vi.fn(),
    validatePartialReview: vi.fn()
}));

describe('ReviewController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: any;
    let responseStatus: any;

    const mockReviews = [
        { id: 1, name: 'Usuario 1', comment: 'Comentario 1' },
        { id: 2, name: 'Usuario 2', comment: 'Comentario 2' }
    ];

    const mockReview: Review = {
        id: 1,
        name: 'Usuario Test',
        comment: 'Comentario Test'
    };

    beforeEach(() => {
        responseJson = vi.fn().mockReturnThis();
        responseStatus = vi.fn().mockReturnValue({ json: responseJson });
        
        mockRequest = {
            params: {},
            body: {}
        };
        
        mockResponse = {
            status: responseStatus,
            json: responseJson
        };
        
        vi.clearAllMocks();
    });

    describe('getAllReviews', () => {
        it('debería obtener todas las reseñas y devolver status 200', async () => {
            vi.mocked(ReviewModel.getAll).mockResolvedValueOnce(mockReviews);

            await ReviewController.getAllReviews(mockRequest as Request, mockResponse as Response);

            expect(ReviewModel.getAll).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockReviews);
        });

        it('debería manejar errores y devolver status 500', async () => {
            const error = new Error('Database error');
            vi.mocked(ReviewModel.getAll).mockRejectedValueOnce(error);

            await ReviewController.getAllReviews(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });

    describe('createReview', () => {
        it('debería crear una reseña y devolver status 201', async () => {
            const newReview = { name: 'Usuario Nuevo', comment: 'Comentario Nuevo' };
            mockRequest.body = newReview;

            vi.mocked(validateReview).mockReturnValueOnce({ success: true, data: newReview } as any);
            vi.mocked(ReviewModel.createReview).mockResolvedValueOnce({ id: 3, ...newReview } as Review);

            await ReviewController.createReview(mockRequest as Request, mockResponse as Response);

            expect(validateReview).toHaveBeenCalledWith(newReview);
            expect(ReviewModel.createReview).toHaveBeenCalledWith(newReview as unknown as Review);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(responseJson).toHaveBeenCalledWith({ id: 3, ...newReview });
        });

        it('debería manejar errores de validación y devolver status 400', async () => {
            const invalidReview = { name: '', comment: '' };
            mockRequest.body = invalidReview;

            const validationError = { success: false, error: { message: JSON.stringify({ errors: [{ message: 'Validation error' }] }) } };
            vi.mocked(validateReview).mockReturnValueOnce(validationError as any);

            await ReviewController.createReview(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ error: expect.anything() });
        });

        it('debería manejar errores durante la creación y devolver status 500', async () => {
            const newReview = { name: 'Usuario Nuevo', comment: 'Comentario Nuevo' };
            mockRequest.body = newReview;

            vi.mocked(validateReview).mockReturnValueOnce({ success: true, data: newReview } as any);
            vi.mocked(ReviewModel.createReview).mockRejectedValueOnce(new Error('Database error'));

            await ReviewController.createReview(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: expect.anything() });
        });
    });

    describe('deleteReview', () => {
        it('debería eliminar una reseña y devolver status 200', async () => {
            mockRequest.params = { id: '1' };
            
            vi.mocked(ReviewModel.deleteReview).mockResolvedValueOnce({ message: 'Review deleted successfully', success: true } as any);

            await ReviewController.deleteReview(mockRequest as Request, mockResponse as Response);

            expect(ReviewModel.deleteReview).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith({ message: 'Review deleted successfully' });
        });

        it('debería manejar cuando la reseña no existe y devolver status 404', async () => {
            mockRequest.params = { id: '999' };
            
            vi.mocked(ReviewModel.deleteReview).mockRejectedValueOnce(new Error('Review not found'));

            await ReviewController.deleteReview(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Review not found' });
        });

        it('debería manejar errores durante la eliminación y devolver status 500', async () => {
            mockRequest.params = { id: '1' };
            
            vi.mocked(ReviewModel.deleteReview).mockRejectedValueOnce(new Error('Database error'));

            await ReviewController.deleteReview(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });
}); 