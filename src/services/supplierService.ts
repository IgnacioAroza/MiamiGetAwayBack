import { SupplierModel } from '../models/supplier.js';
import { ReservationSupplierModel } from '../models/reservationSupplier.js';
import { SupplierPaymentModel } from '../models/supplierPayment.js';
import { ReservationModel } from '../models/reservation.js';
import ImageService from './imageService.js';
import {
    Supplier,
    CreateSupplierDTO,
    UpdateSupplierDTO,
    ReservationSupplier,
    ReservationSupplierResponse,
    AssignSupplierDTO,
    SupplierPayment,
    CreateSupplierPaymentDTO,
    UpdateSupplierPaymentDTO
} from '../types/suppliers.js';

function formatReservationSupplier(row: ReservationSupplier): ReservationSupplierResponse {
    const total = Number(row.totalPayout ?? 0);
    const paid = Number(row.totalPaid ?? 0);
    const revenue = Number(row.totalRevenue ?? 0);
    const cleaningFee = Number(row.cleaningFee ?? 0);
    return {
        id: row.id,
        reservation_id: row.reservationId,
        supplier: {
            id: row.supplierIdRef ?? row.supplierId,
            name: row.supplierName ?? '',
            company: row.supplierCompany ?? null,
            email: row.supplierEmail ?? null,
            phone: row.supplierPhone ?? null
        },
        payout_per_night: Number(row.payoutPerNight),
        cleaning_fee: cleaningFee,
        payment_terms: row.paymentTerms ?? null,
        calculated: {
            total,
            paid,
            balance: total - paid,
            profit: revenue - total
        }
    };
}

export default class SupplierService {
    // --- Suppliers CRUD ---

    static async getAllSuppliers(pagination?: import('../utils/pagination.js').PaginationParams): Promise<{ rows: Supplier[], total: number }> {
        return SupplierModel.getAll(pagination);
    }

    static async getSupplierById(id: number): Promise<Supplier> {
        const supplier = await SupplierModel.getById(id);
        if (!supplier) throw Object.assign(new Error('Supplier not found'), { status: 404 });
        return supplier;
    }

    static async createSupplier(data: CreateSupplierDTO): Promise<Supplier> {
        return SupplierModel.create(data);
    }

    static async updateSupplier(id: number, data: UpdateSupplierDTO): Promise<Supplier> {
        const updated = await SupplierModel.update(id, data);
        if (!updated) throw Object.assign(new Error('Supplier not found'), { status: 404 });
        return updated;
    }

    static async deleteSupplier(id: number): Promise<void> {
        const deleted = await SupplierModel.delete(id);
        if (!deleted) throw Object.assign(new Error('Supplier not found'), { status: 404 });
    }

    // --- Reservation supplier assignment ---

    static async getReservationSupplier(reservationId: number): Promise<ReservationSupplierResponse | null> {
        const row = await ReservationSupplierModel.getByReservation(reservationId);
        if (!row) return null;
        return formatReservationSupplier(row);
    }

    static async assignSupplier(reservationId: number, data: AssignSupplierDTO): Promise<ReservationSupplierResponse> {
        const reservation = await ReservationModel.getReservationById(reservationId);
        if (!reservation) throw Object.assign(new Error('Reservation not found'), { status: 404 });

        const existing = await ReservationSupplierModel.getByReservation(reservationId);
        if (existing) throw Object.assign(new Error('Reservation already has a supplier assigned'), { status: 409 });

        await ReservationSupplierModel.assign(reservationId, data);
        await ReservationModel.updateReservation(reservationId, { supplier_status: 'confirmed' } as any);

        const row = await ReservationSupplierModel.getByReservation(reservationId);
        return formatReservationSupplier(row!);
    }

    static async updateReservationSupplier(reservationId: number, data: Partial<AssignSupplierDTO>): Promise<ReservationSupplierResponse> {
        const updated = await ReservationSupplierModel.update(reservationId, data);
        if (!updated) throw Object.assign(new Error('No supplier assigned to this reservation'), { status: 404 });
        const row = await ReservationSupplierModel.getByReservation(reservationId);
        if (!row) throw Object.assign(new Error('No supplier assigned to this reservation'), { status: 404 });
        return formatReservationSupplier(row);
    }

    static async unassignSupplier(reservationId: number): Promise<void> {
        const deleted = await ReservationSupplierModel.unassign(reservationId);
        if (!deleted) throw Object.assign(new Error('No supplier assigned to this reservation'), { status: 404 });

        await ReservationModel.updateReservation(reservationId, { supplier_status: 'unassigned' } as any);
    }

    static async getReservationSupplierRow(reservationId: number): Promise<ReservationSupplier | null> {
        return ReservationSupplierModel.getByReservation(reservationId);
    }

    static async setSupplierStatus(reservationId: number, status: 'unassigned' | 'searching' | 'confirmed'): Promise<void> {
        const reservation = await ReservationModel.getReservationById(reservationId);
        if (!reservation) throw Object.assign(new Error('Reservation not found'), { status: 404 });
        await ReservationModel.updateReservation(reservationId, { supplier_status: status } as any);
    }

    // --- Supplier payments ---

    static async getPaymentsByReservationSupplier(reservationSupplierId: number): Promise<SupplierPayment[]> {
        return SupplierPaymentModel.getByReservationSupplier(reservationSupplierId);
    }

    static async createSupplierPayment(data: CreateSupplierPaymentDTO, files?: Express.Multer.File[]): Promise<SupplierPayment> {
        let receiptImages: string[] = [];

        if (files && files.length > 0) {
            const uploadResult = await ImageService.uploadImages(files, { entityType: 'supplier_payments' });
            if (!uploadResult.success) throw Object.assign(new Error('Error uploading receipt images'), { status: 500 });
            receiptImages = uploadResult.urls;
        }

        return SupplierPaymentModel.create({ ...data, receiptImages });
    }

    static async updateSupplierPayment(id: number, data: UpdateSupplierPaymentDTO, files?: Express.Multer.File[]): Promise<SupplierPayment> {
        const existing = await SupplierPaymentModel.getById(id);
        if (!existing) throw Object.assign(new Error('Supplier payment not found'), { status: 404 });

        let receiptImages = data.receiptImages;

        if (files && files.length > 0) {
            if (existing.receiptImages?.length > 0) {
                await ImageService.deleteImages(existing.receiptImages, 'supplier_payments');
            }
            const uploadResult = await ImageService.uploadImages(files, { entityType: 'supplier_payments' });
            if (!uploadResult.success) throw Object.assign(new Error('Error uploading receipt images'), { status: 500 });
            receiptImages = uploadResult.urls;
        }

        const updated = await SupplierPaymentModel.update(id, { ...data, receiptImages });
        if (!updated) throw Object.assign(new Error('Supplier payment not found'), { status: 404 });
        return updated;
    }

    static async deleteSupplierPayment(id: number): Promise<void> {
        const existing = await SupplierPaymentModel.getById(id);
        if (!existing) throw Object.assign(new Error('Supplier payment not found'), { status: 404 });

        if (existing.receiptImages?.length > 0) {
            await ImageService.deleteImages(existing.receiptImages, 'supplier_payments');
        }

        await SupplierPaymentModel.delete(id);
    }
}
