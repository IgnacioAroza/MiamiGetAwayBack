import { describe, it, expect, beforeEach, vi } from 'vitest';
import SupplierService from '../../../services/supplierService.js';
import { SupplierModel } from '../../../models/supplier.js';
import { ReservationSupplierModel } from '../../../models/reservationSupplier.js';
import { SupplierPaymentModel } from '../../../models/supplierPayment.js';
import { ReservationModel } from '../../../models/reservation.js';
import ImageService from '../../../services/imageService.js';

vi.mock('../../../models/supplier.js');
vi.mock('../../../models/reservationSupplier.js');
vi.mock('../../../models/supplierPayment.js');
vi.mock('../../../models/reservation.js');
vi.mock('../../../services/imageService.js');

const MOCK_SUPPLIER = { id: 1, name: 'Carolina Méndez', company: 'Coastal Stays', email: 'c@test.com', phone: '555-1234', createdAt: new Date() };
const MOCK_RESERVATION_SUPPLIER = { id: 1, reservationId: 5, supplierId: 1, payoutPerNight: 100, paymentTerms: '48h after check-out', createdAt: new Date() };
const MOCK_SUPPLIER_PAYMENT = { id: 1, reservationSupplierId: 1, amount: 300, method: 'wire' as const, date: new Date('2026-05-26'), referenceNotes: 'REF-001', receiptImages: [], createdAt: new Date() };

describe('SupplierService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- Suppliers CRUD ---

    describe('getAllSuppliers', () => {
        it('delegates to SupplierModel.getAll', async () => {
            vi.mocked(SupplierModel.getAll).mockResolvedValue([MOCK_SUPPLIER]);
            const result = await SupplierService.getAllSuppliers();
            expect(SupplierModel.getAll).toHaveBeenCalledOnce();
            expect(result).toEqual([MOCK_SUPPLIER]);
        });
    });

    describe('getSupplierById', () => {
        it('returns supplier when found', async () => {
            vi.mocked(SupplierModel.getById).mockResolvedValue(MOCK_SUPPLIER);
            const result = await SupplierService.getSupplierById(1);
            expect(result).toEqual(MOCK_SUPPLIER);
        });

        it('throws 404 when not found', async () => {
            vi.mocked(SupplierModel.getById).mockResolvedValue(null);
            await expect(SupplierService.getSupplierById(99)).rejects.toMatchObject({ status: 404 });
        });
    });

    describe('createSupplier', () => {
        it('creates and returns supplier', async () => {
            vi.mocked(SupplierModel.create).mockResolvedValue(MOCK_SUPPLIER);
            const result = await SupplierService.createSupplier({ name: 'Carolina Méndez' });
            expect(SupplierModel.create).toHaveBeenCalledWith({ name: 'Carolina Méndez' });
            expect(result).toEqual(MOCK_SUPPLIER);
        });
    });

    describe('deleteSupplier', () => {
        it('resolves when supplier deleted', async () => {
            vi.mocked(SupplierModel.delete).mockResolvedValue(true);
            await expect(SupplierService.deleteSupplier(1)).resolves.toBeUndefined();
        });

        it('throws 404 when not found', async () => {
            vi.mocked(SupplierModel.delete).mockResolvedValue(false);
            await expect(SupplierService.deleteSupplier(99)).rejects.toMatchObject({ status: 404 });
        });
    });

    // --- Reservation supplier assignment ---

    describe('assignSupplier', () => {
        it('assigns supplier and sets supplierStatus to confirmed', async () => {
            const fullRow = { ...MOCK_RESERVATION_SUPPLIER, supplierIdRef: 1, supplierName: 'Carolina Méndez', supplierCompany: 'Coastal Stays', supplierEmail: 'c@test.com', supplierPhone: '555-1234', totalPayout: 700, totalPaid: 0, balance: 700, totalRevenue: 0 };
            vi.mocked(ReservationModel.getReservationById).mockResolvedValue({ id: 5 } as any);
            vi.mocked(ReservationSupplierModel.getByReservation)
                .mockResolvedValueOnce(null)       // first call: check no existing
                .mockResolvedValueOnce(fullRow);   // second call: fetch full row after assign
            vi.mocked(ReservationSupplierModel.assign).mockResolvedValue(MOCK_RESERVATION_SUPPLIER);
            vi.mocked(ReservationModel.updateReservation).mockResolvedValue({} as any);

            const result = await SupplierService.assignSupplier(5, { supplier_id: 1, payout_per_night: 100 });

            expect(ReservationSupplierModel.assign).toHaveBeenCalledWith(5, { supplier_id: 1, payout_per_night: 100 });
            expect(ReservationModel.updateReservation).toHaveBeenCalledWith(5, { supplier_status: 'confirmed' });
            expect(result).toMatchObject({ reservation_id: 5, supplier: { id: 1 } });
        });

        it('throws 409 when reservation already has a supplier', async () => {
            vi.mocked(ReservationModel.getReservationById).mockResolvedValue({ id: 5 } as any);
            vi.mocked(ReservationSupplierModel.getByReservation).mockResolvedValue(MOCK_RESERVATION_SUPPLIER);

            await expect(
                SupplierService.assignSupplier(5, { supplierId: 1, payoutPerNight: 100 })
            ).rejects.toMatchObject({ status: 409 });
        });

        it('throws 404 when reservation not found', async () => {
            vi.mocked(ReservationModel.getReservationById).mockResolvedValue(null);
            await expect(
                SupplierService.assignSupplier(99, { supplierId: 1, payoutPerNight: 100 })
            ).rejects.toMatchObject({ status: 404 });
        });
    });

    describe('unassignSupplier', () => {
        it('unassigns supplier and sets supplierStatus to unassigned', async () => {
            vi.mocked(ReservationSupplierModel.unassign).mockResolvedValue(true);
            vi.mocked(ReservationModel.updateReservation).mockResolvedValue({} as any);

            await SupplierService.unassignSupplier(5);

            expect(ReservationSupplierModel.unassign).toHaveBeenCalledWith(5);
            expect(ReservationModel.updateReservation).toHaveBeenCalledWith(5, { supplier_status: 'unassigned' });
        });

        it('throws 404 when no supplier assigned', async () => {
            vi.mocked(ReservationSupplierModel.unassign).mockResolvedValue(false);
            await expect(SupplierService.unassignSupplier(5)).rejects.toMatchObject({ status: 404 });
        });
    });

    // --- Supplier payments ---

    describe('createSupplierPayment', () => {
        it('creates payment without images', async () => {
            vi.mocked(SupplierPaymentModel.create).mockResolvedValue(MOCK_SUPPLIER_PAYMENT);

            const result = await SupplierService.createSupplierPayment({
                reservationSupplierId: 1, amount: 300, method: 'wire', date: '2026-05-26'
            });

            expect(ImageService.uploadImages).not.toHaveBeenCalled();
            expect(SupplierPaymentModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ receiptImages: [] })
            );
            expect(result).toEqual(MOCK_SUPPLIER_PAYMENT);
        });

        it('uploads images and passes URLs to model', async () => {
            const imageUrl = 'https://res.cloudinary.com/test/receipt.jpg';
            const file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', originalname: 'r.jpg' } as Express.Multer.File;
            vi.mocked(ImageService.uploadImages).mockResolvedValue({ success: true, urls: [imageUrl], errors: [] });
            vi.mocked(SupplierPaymentModel.create).mockResolvedValue({ ...MOCK_SUPPLIER_PAYMENT, receiptImages: [imageUrl] });

            await SupplierService.createSupplierPayment(
                { reservationSupplierId: 1, amount: 300, method: 'wire', date: '2026-05-26' },
                [file]
            );

            expect(ImageService.uploadImages).toHaveBeenCalledWith([file], { entityType: 'supplier_payments' });
            expect(SupplierPaymentModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ receiptImages: [imageUrl] })
            );
        });

        it('throws 500 when Cloudinary upload fails', async () => {
            const file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' } as Express.Multer.File;
            vi.mocked(ImageService.uploadImages).mockResolvedValue({ success: false, urls: [], errors: ['Upload failed'] });

            await expect(
                SupplierService.createSupplierPayment(
                    { reservationSupplierId: 1, amount: 300, method: 'wire', date: '2026-05-26' },
                    [file]
                )
            ).rejects.toMatchObject({ status: 500 });
            expect(SupplierPaymentModel.create).not.toHaveBeenCalled();
        });
    });

    describe('deleteSupplierPayment', () => {
        it('deletes old Cloudinary images before deleting the payment', async () => {
            const paymentWithImages = { ...MOCK_SUPPLIER_PAYMENT, receiptImages: ['https://cloudinary.com/img1.jpg'] };
            vi.mocked(SupplierPaymentModel.getById).mockResolvedValue(paymentWithImages);
            vi.mocked(SupplierPaymentModel.delete).mockResolvedValue(true);

            await SupplierService.deleteSupplierPayment(1);

            expect(ImageService.deleteImages).toHaveBeenCalledWith(
                ['https://cloudinary.com/img1.jpg'],
                'supplier_payments'
            );
            expect(SupplierPaymentModel.delete).toHaveBeenCalledWith(1);
        });

        it('throws 404 when payment not found', async () => {
            vi.mocked(SupplierPaymentModel.getById).mockResolvedValue(null);
            await expect(SupplierService.deleteSupplierPayment(99)).rejects.toMatchObject({ status: 404 });
        });
    });
});
