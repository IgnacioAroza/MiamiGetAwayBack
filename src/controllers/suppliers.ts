import { Request, Response } from 'express';
import SupplierService from '../services/supplierService.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import {
    validateSupplier,
    validatePartialSupplier,
    validateAssignSupplier,
    validateSupplierPayment,
    validatePartialSupplierPayment
} from '../schemas/suppliersSchema.js';
import { ok, created, badRequest, notFound, serverError, sendError } from '../utils/response.js';

// ---- Suppliers CRUD ----

export class SupplierController {
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const pagination = parsePagination(req.query);
            const { rows, total } = await SupplierService.getAllSuppliers(pagination ?? undefined);
            if (pagination) {
                ok(res, paginatedResponse(rows, total, pagination));
            } else {
                ok(res, rows);
            }
        } catch (error: any) {
            serverError(res, error.message);
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { badRequest(res, 'Invalid supplier ID'); return; }
            const supplier = await SupplierService.getSupplierById(id);
            ok(res, supplier);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async create(req: Request, res: Response): Promise<void> {
        try {
            const result = validateSupplier(req.body);
            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message));
                return;
            }
            const supplier = await SupplierService.createSupplier(result.data);
            created(res, supplier);
        } catch (error: any) {
            serverError(res, error.message);
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { badRequest(res, 'Invalid supplier ID'); return; }
            const result = validatePartialSupplier(req.body);
            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message));
                return;
            }
            const supplier = await SupplierService.updateSupplier(id, result.data);
            ok(res, supplier);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async remove(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { badRequest(res, 'Invalid supplier ID'); return; }
            await SupplierService.deleteSupplier(id);
            ok(res, { message: 'Supplier deleted successfully' });
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }
}

// ---- Reservation supplier assignment ----

export class ReservationSupplierController {
    static async get(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { badRequest(res, 'Invalid reservation ID'); return; }
            const data = await SupplierService.getReservationSupplier(reservationId);
            ok(res, data ?? null);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async assign(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { badRequest(res, 'Invalid reservation ID'); return; }
            const result = validateAssignSupplier(req.body);
            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message));
                return;
            }
            const data = await SupplierService.assignSupplier(reservationId, result.data);
            created(res, data);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { badRequest(res, 'Invalid reservation ID'); return; }
            const data = await SupplierService.updateReservationSupplier(reservationId, req.body);
            ok(res, data);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async unassign(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { badRequest(res, 'Invalid reservation ID'); return; }
            await SupplierService.unassignSupplier(reservationId);
            ok(res, { message: 'Supplier unassigned successfully' });
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async setStatus(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { badRequest(res, 'Invalid reservation ID'); return; }
            const { status } = req.body;
            if (!['unassigned', 'searching', 'confirmed'].includes(status)) {
                badRequest(res, 'status must be unassigned | searching | confirmed');
                return;
            }
            await SupplierService.setSupplierStatus(reservationId, status);
            ok(res, { message: 'Supplier status updated' });
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async getPayments(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { badRequest(res, 'Invalid reservation ID'); return; }
            const row = await SupplierService.getReservationSupplierRow(reservationId);
            if (!row) { ok(res, []); return; }
            const payments = await SupplierService.getPaymentsByReservationSupplier(row.id);
            ok(res, payments);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async createPayment(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { badRequest(res, 'Invalid reservation ID'); return; }
            const row = await SupplierService.getReservationSupplierRow(reservationId);
            if (!row) { notFound(res, 'No supplier assigned to this reservation'); return; }

            const body = {
                ...req.body,
                reservationSupplierId: row.id,
                amount: Number(req.body.amount)
            };
            const result = validateSupplierPayment(body);
            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message));
                return;
            }
            const files = req.files as Express.Multer.File[] | undefined;
            const payment = await SupplierService.createSupplierPayment(result.data, files);
            created(res, payment);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }
}

// ---- Supplier payments ----

export class SupplierPaymentController {
    static async getByReservationSupplier(req: Request, res: Response): Promise<void> {
        try {
            const reservationSupplierId = parseInt(req.params.reservationSupplierId);
            if (isNaN(reservationSupplierId)) { badRequest(res, 'Invalid ID'); return; }
            const payments = await SupplierService.getPaymentsByReservationSupplier(reservationSupplierId);
            ok(res, payments);
        } catch (error: any) {
            serverError(res, error.message);
        }
    }

    static async create(req: Request, res: Response): Promise<void> {
        try {
            const body = {
                ...req.body,
                reservationSupplierId: Number(req.body.reservationSupplierId),
                amount: Number(req.body.amount)
            };
            const result = validateSupplierPayment(body);
            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message));
                return;
            }
            const files = req.files as Express.Multer.File[] | undefined;
            const payment = await SupplierService.createSupplierPayment(result.data, files);
            created(res, payment);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { badRequest(res, 'Invalid payment ID'); return; }
            const body = { ...req.body };
            if (body.amount !== undefined) body.amount = Number(body.amount);
            const result = validatePartialSupplierPayment(body);
            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message));
                return;
            }
            const files = req.files as Express.Multer.File[] | undefined;
            const payment = await SupplierService.updateSupplierPayment(id, result.data, files);
            ok(res, payment);
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }

    static async remove(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { badRequest(res, 'Invalid payment ID'); return; }
            await SupplierService.deleteSupplierPayment(id);
            ok(res, { message: 'Supplier payment deleted successfully' });
        } catch (error: any) {
            sendError(res, error.status ?? 500, error.message);
        }
    }
}
