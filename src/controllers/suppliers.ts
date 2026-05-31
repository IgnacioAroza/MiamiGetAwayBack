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

// ---- Suppliers CRUD ----

export class SupplierController {
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const pagination = parsePagination(req.query);
            const { rows, total } = await SupplierService.getAllSuppliers(pagination ?? undefined);
            if (pagination) {
                res.status(200).json(paginatedResponse(rows, total, pagination));
            } else {
                res.status(200).json(rows);
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { res.status(400).json({ error: 'Invalid supplier ID' }); return; }
            const supplier = await SupplierService.getSupplierById(id);
            res.status(200).json(supplier);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async create(req: Request, res: Response): Promise<void> {
        try {
            const result = validateSupplier(req.body);
            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) });
                return;
            }
            const supplier = await SupplierService.createSupplier(result.data);
            res.status(201).json(supplier);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { res.status(400).json({ error: 'Invalid supplier ID' }); return; }
            const result = validatePartialSupplier(req.body);
            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) });
                return;
            }
            const supplier = await SupplierService.updateSupplier(id, result.data);
            res.status(200).json(supplier);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async remove(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { res.status(400).json({ error: 'Invalid supplier ID' }); return; }
            await SupplierService.deleteSupplier(id);
            res.status(200).json({ message: 'Supplier deleted successfully' });
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }
}

// ---- Reservation supplier assignment ----

export class ReservationSupplierController {
    static async get(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
            const data = await SupplierService.getReservationSupplier(reservationId);
            res.status(200).json(data ?? null);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async assign(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
            const result = validateAssignSupplier(req.body);
            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) });
                return;
            }
            const data = await SupplierService.assignSupplier(reservationId, result.data);
            res.status(201).json(data);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
            const data = await SupplierService.updateReservationSupplier(reservationId, req.body);
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async unassign(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
            await SupplierService.unassignSupplier(reservationId);
            res.status(200).json({ message: 'Supplier unassigned successfully' });
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async setStatus(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
            const { status } = req.body;
            if (!['unassigned', 'searching', 'confirmed'].includes(status)) {
                res.status(400).json({ error: 'status must be unassigned | searching | confirmed' });
                return;
            }
            await SupplierService.setSupplierStatus(reservationId, status);
            res.status(200).json({ message: 'Supplier status updated' });
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async getPayments(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
            const row = await SupplierService.getReservationSupplierRow(reservationId);
            if (!row) { res.status(200).json([]); return; }
            const payments = await SupplierService.getPaymentsByReservationSupplier(row.id);
            res.status(200).json(payments);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async createPayment(req: Request, res: Response): Promise<void> {
        try {
            const reservationId = parseInt(req.params.id);
            if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
            const row = await SupplierService.getReservationSupplierRow(reservationId);
            if (!row) { res.status(404).json({ error: 'No supplier assigned to this reservation' }); return; }

            const body = {
                ...req.body,
                reservationSupplierId: row.id,
                amount: Number(req.body.amount)
            };
            const result = validateSupplierPayment(body);
            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) });
                return;
            }
            const files = req.files as Express.Multer.File[] | undefined;
            const payment = await SupplierService.createSupplierPayment(result.data, files);
            res.status(201).json(payment);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }
}

// ---- Supplier payments ----

export class SupplierPaymentController {
    static async getByReservationSupplier(req: Request, res: Response): Promise<void> {
        try {
            const reservationSupplierId = parseInt(req.params.reservationSupplierId);
            if (isNaN(reservationSupplierId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
            const payments = await SupplierService.getPaymentsByReservationSupplier(reservationSupplierId);
            res.status(200).json(payments);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
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
                res.status(400).json({ error: JSON.parse(result.error.message) });
                return;
            }
            const files = req.files as Express.Multer.File[] | undefined;
            const payment = await SupplierService.createSupplierPayment(result.data, files);
            res.status(201).json(payment);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { res.status(400).json({ error: 'Invalid payment ID' }); return; }
            const body = { ...req.body };
            if (body.amount !== undefined) body.amount = Number(body.amount);
            const result = validatePartialSupplierPayment(body);
            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) });
                return;
            }
            const files = req.files as Express.Multer.File[] | undefined;
            const payment = await SupplierService.updateSupplierPayment(id, result.data, files);
            res.status(200).json(payment);
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }

    static async remove(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) { res.status(400).json({ error: 'Invalid payment ID' }); return; }
            await SupplierService.deleteSupplierPayment(id);
            res.status(200).json({ message: 'Supplier payment deleted successfully' });
        } catch (error: any) {
            res.status(error.status ?? 500).json({ error: error.message });
        }
    }
}
