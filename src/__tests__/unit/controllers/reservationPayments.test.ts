import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../../services/reservationPaymentsService.js');
vi.mock('../../../services/imageService.js');
vi.mock('../../../schemas/reservationPaymentsSchema.js', () => ({
    validateReservationPayment: vi.fn().mockReturnValue({ success: true }),
    validatePartialReservationPayment: vi.fn().mockReturnValue({ success: true })
}));

import { ReservationPaymentController } from '../../../controllers/reservationPayments.js';
import ReservationPaymentsService from '../../../services/reservationPaymentsService.js';
import ImageService from '../../../services/imageService.js';
import { validateReservationPayment, validatePartialReservationPayment } from '../../../schemas/reservationPaymentsSchema.js';

const MOCK_PAYMENT = {
    id: 1,
    reservationId: 1,
    amount: 500,
    paymentDate: new Date(),
    paymentMethod: 'cash',
    paymentReference: 'REF-001',
    notes: 'Test payment',
    receiptImage: null
};

describe('ReservationPaymentController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let statusCode: number;
    let responseBody: any;

    beforeEach(() => {
        vi.clearAllMocks();
        statusCode = 0;
        responseBody = {};
        mockRequest = { body: {}, params: {}, query: {}, file: undefined };
        mockResponse = {
            status: vi.fn().mockImplementation((code) => { statusCode = code; return mockResponse; }),
            json: vi.fn().mockImplementation((data) => { responseBody = data; return mockResponse; })
        };
    });

    describe('createReservationPayment', () => {
        const validBody = {
            reservationId: '1',
            amount: '500',
            paymentDate: '2026-05-26T00:00:00Z',
            paymentMethod: 'cash'
        };

        it('creates payment without image — receiptImage is null', async () => {
            mockRequest.body = validBody;
            vi.mocked(ReservationPaymentsService.createPayment).mockResolvedValue(MOCK_PAYMENT);

            await ReservationPaymentController.createReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ReservationPaymentsService.createPayment).toHaveBeenCalledWith(
                expect.objectContaining({ receiptImage: null })
            );
            expect(statusCode).toBe(201);
            expect(responseBody).toEqual(MOCK_PAYMENT);
        });

        it('creates payment with image — uploads to Cloudinary and passes URL', async () => {
            const imageUrl = 'https://res.cloudinary.com/test/receipt.jpg';
            mockRequest.body = validBody;
            mockRequest.file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', originalname: 'receipt.jpg' } as Express.Multer.File;
            vi.mocked(ImageService.uploadImages).mockResolvedValue({ success: true, urls: [imageUrl], errors: [] });
            vi.mocked(ReservationPaymentsService.createPayment).mockResolvedValue({ ...MOCK_PAYMENT, receiptImage: imageUrl });

            await ReservationPaymentController.createReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ImageService.uploadImages).toHaveBeenCalledWith(
                [mockRequest.file],
                { entityType: 'reservation_payments' }
            );
            expect(ReservationPaymentsService.createPayment).toHaveBeenCalledWith(
                expect.objectContaining({ receiptImage: imageUrl })
            );
            expect(statusCode).toBe(201);
        });

        it('returns 500 when Cloudinary upload fails', async () => {
            mockRequest.body = validBody;
            mockRequest.file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', originalname: 'receipt.jpg' } as Express.Multer.File;
            vi.mocked(ImageService.uploadImages).mockResolvedValue({ success: false, urls: [], errors: ['Upload failed'] });

            await ReservationPaymentController.createReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ReservationPaymentsService.createPayment).not.toHaveBeenCalled();
            expect(statusCode).toBe(500);
            expect(responseBody).toMatchObject({ error: 'Error uploading receipt image' });
        });

        it('returns 400 when validation fails', async () => {
            mockRequest.body = { reservationId: '1', amount: '500' };
            vi.mocked(validateReservationPayment).mockReturnValue({
                success: false,
                error: { message: JSON.stringify([{ message: 'paymentMethod required' }]) }
            } as any);

            await ReservationPaymentController.createReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ReservationPaymentsService.createPayment).not.toHaveBeenCalled();
            expect(statusCode).toBe(400);
        });
    });

    describe('updateReservationPayment', () => {
        beforeEach(() => {
            mockRequest.params = { id: '1' };
            vi.mocked(ReservationPaymentsService.updatePayment).mockResolvedValue(MOCK_PAYMENT);
        });

        it('updates payment without new image — does not include receiptImage in update', async () => {
            mockRequest.body = { amount: 600, payment_method: 'card' };

            await ReservationPaymentController.updateReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ImageService.uploadImages).not.toHaveBeenCalled();
            const callArg = vi.mocked(ReservationPaymentsService.updatePayment).mock.calls[0][1];
            expect(callArg).not.toHaveProperty('receiptImage');
            expect(statusCode).toBe(200);
        });

        it('updates payment with new image — uploads and sets receiptImage', async () => {
            const imageUrl = 'https://res.cloudinary.com/test/new-receipt.jpg';
            mockRequest.body = { amount: 600 };
            mockRequest.file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', originalname: 'new.jpg' } as Express.Multer.File;
            vi.mocked(ImageService.uploadImages).mockResolvedValue({ success: true, urls: [imageUrl], errors: [] });
            vi.mocked(ReservationPaymentsService.updatePayment).mockResolvedValue({ ...MOCK_PAYMENT, receiptImage: imageUrl });

            await ReservationPaymentController.updateReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ImageService.uploadImages).toHaveBeenCalledWith(
                [mockRequest.file],
                { entityType: 'reservation_payments' }
            );
            expect(ReservationPaymentsService.updatePayment).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ receiptImage: imageUrl })
            );
            expect(statusCode).toBe(200);
        });

        it('removes image when remove_receipt_image=true', async () => {
            mockRequest.body = { remove_receipt_image: 'true' };

            await ReservationPaymentController.updateReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ImageService.uploadImages).not.toHaveBeenCalled();
            expect(ReservationPaymentsService.updatePayment).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ receiptImage: null })
            );
            expect(statusCode).toBe(200);
        });

        it('returns 500 when Cloudinary upload fails on update', async () => {
            mockRequest.body = {};
            mockRequest.file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', originalname: 'r.jpg' } as Express.Multer.File;
            vi.mocked(ImageService.uploadImages).mockResolvedValue({ success: false, urls: [], errors: ['Upload error'] });

            await ReservationPaymentController.updateReservationPayment(mockRequest as Request, mockResponse as Response);

            expect(ReservationPaymentsService.updatePayment).not.toHaveBeenCalled();
            expect(statusCode).toBe(500);
        });
    });
});
