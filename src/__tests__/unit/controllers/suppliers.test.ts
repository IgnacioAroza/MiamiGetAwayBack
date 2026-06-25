import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../../services/supplierService.js');
vi.mock('../../../schemas/suppliersSchema.js', () => ({
    validateSupplier: vi.fn().mockReturnValue({ success: true, data: {} }),
    validatePartialSupplier: vi.fn().mockReturnValue({ success: true, data: {} }),
    validateAssignSupplier: vi.fn().mockReturnValue({ success: true, data: {} }),
    validateSupplierPayment: vi.fn().mockReturnValue({ success: true, data: {} }),
    validatePartialSupplierPayment: vi.fn().mockReturnValue({ success: true, data: {} })
}));

import { SupplierController, ReservationSupplierController, SupplierPaymentController } from '../../../controllers/suppliers.js';
import SupplierService from '../../../services/supplierService.js';
import {
    validateSupplier,
    validateAssignSupplier,
    validateSupplierPayment
} from '../../../schemas/suppliersSchema.js';

const MOCK_SUPPLIER = { id: 1, name: 'Carolina Méndez', company: 'Coastal Stays', email: 'c@test.com', phone: '555-1234', createdAt: new Date() };
const MOCK_RESERVATION_SUPPLIER = { id: 1, reservationId: 5, supplierId: 1, payoutPerNight: 100, paymentTerms: '48h', createdAt: new Date() };
const MOCK_SUPPLIER_PAYMENT = { id: 1, reservationSupplierId: 1, amount: 300, method: 'wire' as const, date: new Date(), referenceNotes: null, receiptImages: [], createdAt: new Date() };

describe('Supplier controllers', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusCode: number;
    let responseBody: any;

    beforeEach(() => {
        vi.clearAllMocks();
        statusCode = 0;
        responseBody = {};
        req = { body: {}, params: {}, query: {}, files: undefined };
        res = {
            status: vi.fn().mockImplementation((code) => { statusCode = code; return res; }),
            json: vi.fn().mockImplementation((data) => { responseBody = data; return res; }),
            send: vi.fn()
        };
    });

    // ---- SupplierController ----

    describe('SupplierController.getAll', () => {
        it('returns 200 with list of suppliers', async () => {
            vi.mocked(SupplierService.getAllSuppliers).mockResolvedValue({ rows: [MOCK_SUPPLIER], total: 1 } as any);

            await SupplierController.getAll(req as Request, res as Response);

            expect(statusCode).toBe(200);
            expect(responseBody).toEqual([MOCK_SUPPLIER]);
        });
    });

    describe('SupplierController.create', () => {
        it('returns 201 with created supplier', async () => {
            req.body = { name: 'Carolina Méndez' };
            vi.mocked(validateSupplier).mockReturnValue({ success: true, data: req.body } as any);
            vi.mocked(SupplierService.createSupplier).mockResolvedValue(MOCK_SUPPLIER);

            await SupplierController.create(req as Request, res as Response);

            expect(SupplierService.createSupplier).toHaveBeenCalledWith(req.body);
            expect(statusCode).toBe(201);
            expect(responseBody).toEqual(MOCK_SUPPLIER);
        });

        it('returns 400 when validation fails', async () => {
            vi.mocked(validateSupplier).mockReturnValue({
                success: false,
                error: { message: JSON.stringify([{ message: 'name required' }]) }
            } as any);

            await SupplierController.create(req as Request, res as Response);

            expect(SupplierService.createSupplier).not.toHaveBeenCalled();
            expect(statusCode).toBe(400);
        });
    });

    describe('SupplierController.remove', () => {
        it('returns 200 on successful delete', async () => {
            req.params = { id: '1' };
            vi.mocked(SupplierService.deleteSupplier).mockResolvedValue();

            await SupplierController.remove(req as Request, res as Response);

            expect(SupplierService.deleteSupplier).toHaveBeenCalledWith(1);
            expect(statusCode).toBe(200);
        });

        it('returns 404 when supplier not found', async () => {
            req.params = { id: '99' };
            vi.mocked(SupplierService.deleteSupplier).mockRejectedValue(Object.assign(new Error('Supplier not found'), { status: 404 }));

            await SupplierController.remove(req as Request, res as Response);

            expect(statusCode).toBe(404);
        });
    });

    // ---- ReservationSupplierController ----

    describe('ReservationSupplierController.assign', () => {
        it('returns 201 when supplier assigned', async () => {
            req.params = { id: '5' };
            req.body = { supplierId: 1, payoutPerNight: 100 };
            vi.mocked(validateAssignSupplier).mockReturnValue({ success: true, data: req.body } as any);
            vi.mocked(SupplierService.assignSupplier).mockResolvedValue(MOCK_RESERVATION_SUPPLIER);

            await ReservationSupplierController.assign(req as Request, res as Response);

            expect(SupplierService.assignSupplier).toHaveBeenCalledWith(5, req.body);
            expect(statusCode).toBe(201);
            expect(responseBody).toEqual(MOCK_RESERVATION_SUPPLIER);
        });

        it('returns 409 when supplier already assigned', async () => {
            req.params = { id: '5' };
            vi.mocked(validateAssignSupplier).mockReturnValue({ success: true, data: {} } as any);
            vi.mocked(SupplierService.assignSupplier).mockRejectedValue(Object.assign(new Error('already has supplier'), { status: 409 }));

            await ReservationSupplierController.assign(req as Request, res as Response);

            expect(statusCode).toBe(409);
        });
    });

    describe('ReservationSupplierController.unassign', () => {
        it('returns 200 and sets status to unassigned', async () => {
            req.params = { id: '5' };
            vi.mocked(SupplierService.unassignSupplier).mockResolvedValue();

            await ReservationSupplierController.unassign(req as Request, res as Response);

            expect(SupplierService.unassignSupplier).toHaveBeenCalledWith(5);
            expect(statusCode).toBe(200);
        });
    });

    describe('ReservationSupplierController.setStatus', () => {
        it('returns 200 when status is valid', async () => {
            req.params = { id: '5' };
            req.body = { status: 'searching' };
            vi.mocked(SupplierService.setSupplierStatus).mockResolvedValue();

            await ReservationSupplierController.setStatus(req as Request, res as Response);

            expect(SupplierService.setSupplierStatus).toHaveBeenCalledWith(5, 'searching');
            expect(statusCode).toBe(200);
        });

        it('returns 400 for invalid status value', async () => {
            req.params = { id: '5' };
            req.body = { status: 'invalid_status' };

            await ReservationSupplierController.setStatus(req as Request, res as Response);

            expect(SupplierService.setSupplierStatus).not.toHaveBeenCalled();
            expect(statusCode).toBe(400);
        });
    });

    // ---- SupplierPaymentController ----

    describe('SupplierPaymentController.create', () => {
        it('returns 201 without images', async () => {
            req.body = { reservationSupplierId: '1', amount: '300', method: 'wire', date: '2026-05-26' };
            vi.mocked(validateSupplierPayment).mockReturnValue({ success: true, data: { reservationSupplierId: 1, amount: 300, method: 'wire', date: '2026-05-26' } } as any);
            vi.mocked(SupplierService.createSupplierPayment).mockResolvedValue(MOCK_SUPPLIER_PAYMENT);

            await SupplierPaymentController.create(req as Request, res as Response);

            expect(SupplierService.createSupplierPayment).toHaveBeenCalledWith(
                expect.objectContaining({ amount: 300 }),
                undefined
            );
            expect(statusCode).toBe(201);
        });

        it('returns 201 and passes files when present', async () => {
            const file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' } as Express.Multer.File;
            req.body = { reservationSupplierId: '1', amount: '300', method: 'wire', date: '2026-05-26' };
            req.files = [file];
            vi.mocked(validateSupplierPayment).mockReturnValue({ success: true, data: { reservationSupplierId: 1, amount: 300, method: 'wire', date: '2026-05-26' } } as any);
            vi.mocked(SupplierService.createSupplierPayment).mockResolvedValue(MOCK_SUPPLIER_PAYMENT);

            await SupplierPaymentController.create(req as Request, res as Response);

            expect(SupplierService.createSupplierPayment).toHaveBeenCalledWith(
                expect.any(Object),
                [file]
            );
            expect(statusCode).toBe(201);
        });
    });

    describe('SupplierPaymentController.remove', () => {
        it('returns 200 on successful delete', async () => {
            req.params = { id: '1' };
            vi.mocked(SupplierService.deleteSupplierPayment).mockResolvedValue();

            await SupplierPaymentController.remove(req as Request, res as Response);

            expect(SupplierService.deleteSupplierPayment).toHaveBeenCalledWith(1);
            expect(statusCode).toBe(200);
        });
    });
});
