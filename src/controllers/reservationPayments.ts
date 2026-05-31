import { Request, Response } from 'express';
import { validateReservationPayment, validatePartialReservationPayment } from '../schemas/reservationPaymentsSchema.js';
import ReservationPaymentsService from '../services/reservationPaymentsService.js';
import ImageService from '../services/imageService.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

export class ReservationPaymentController {
    static async getAllReservationPayments(req: Request, res: Response): Promise<void> {
        try {
            // Obtener filtros desde query params
            const filters: any = {};
            
            // Filtros por fechas de pago
            if (req.query.startDate) {
                const startDate = req.query.startDate as string;
                const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;
                if (!dateRegex.test(startDate)) {
                    res.status(400).json({ error: 'startDate format is invalid. Use MM-DD-YYYY' });
                    return;
                }
                filters.startDate = startDate;
            }
            
            if (req.query.endDate) {
                const endDate = req.query.endDate as string;
                const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;
                if (!dateRegex.test(endDate)) {
                    res.status(400).json({ error: 'endDate format is invalid. Use MM-DD-YYYY' });
                    return;
                }
                filters.endDate = endDate;
            }

            // Filtros por método de pago
            if (req.query.paymentMethod) {
                filters.paymentMethod = req.query.paymentMethod as string;
            }

            // Filtros por cliente
            if (req.query.clientName) {
                filters.clientName = req.query.clientName as string;
            }

            if (req.query.clientEmail) {
                filters.clientEmail = req.query.clientEmail as string;
            }

            if (req.query.q) {
                filters.q = req.query.q as string;
            }

            if (req.query.clientLastname) {
                filters.clientLastname = req.query.clientLastname as string;
            }

            // Filtro por ID de reservación
            if (req.query.reservationId) {
                const reservationId = parseInt(req.query.reservationId as string);
                if (isNaN(reservationId)) {
                    res.status(400).json({ error: 'reservationId must be a valid number' });
                    return;
                }
                filters.reservationId = reservationId;
            }

            // Filtro por estado del pago - comentado temporalmente
            // if (req.query.status) {
            //     filters.status = req.query.status as string;
            // }
            
            const pagination = parsePagination(req.query);
            const { rows, total } = await ReservationPaymentsService.getAllPayments(filters, pagination ?? undefined);
            if (pagination) {
                res.status(200).json(paginatedResponse(rows, total, pagination));
            } else {
                res.status(200).json(rows);
            }
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservation payments' });
        }
    }

    static async getReservationPaymentById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const reservationPayment = await ReservationPaymentsService.getPaymentById(parseInt(id));
            if (!reservationPayment) {
                res.status(404).json({ error: 'Reservation payment not found' });
                return;
            }
            res.status(200).json(reservationPayment);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservation payment' });
        }
    }

    static async createReservationPayment(req: Request, res: Response): Promise<void> {
        // Cuando llega como multipart, los números vienen como strings — coercionar
        const body = {
            ...req.body,
            reservationId: req.body.reservationId ? Number(req.body.reservationId) : undefined,
            amount: req.body.amount ? Number(req.body.amount) : undefined,
        };

        const { error } = validateReservationPayment(body);
        if (error) {
            res.status(400).json({ error: JSON.parse(error.message) });
            return;
        }

        try {
            let receiptImage: string | null = null;
            if (req.file) {
                const result = await ImageService.uploadImages([req.file], { entityType: 'reservation_payments' });
                if (!result.success || result.urls.length === 0) {
                    res.status(500).json({ error: 'Error uploading receipt image', details: result.errors });
                    return;
                }
                receiptImage = result.urls[0];
            }

            const newReservationPayment = await ReservationPaymentsService.createPayment({ ...body, receiptImage });
            res.status(201).json(newReservationPayment);
        } catch (error) {
            res.status(500).json({ error: 'Error creating reservation payment' });
        }
    }

    static async updateReservationPayment(req: Request, res: Response): Promise<void> {
        const { id } = req.params;

        // Transformar datos de snake_case a camelCase
        const transformedData = {
            amount: req.body.amount,
            paymentDate: req.body.payment_date,
            paymentMethod: req.body.payment_method,
            paymentReference: req.body.payment_reference,
            notes: req.body.notes,
            reservationId: req.body.reservation_id
        };

        const { error } = validatePartialReservationPayment(transformedData);
        if (error) {
            res.status(400).json({ error: JSON.parse(error.message) });
            return;
        }
        try {
            let receiptImage: string | null | undefined = undefined;
            if (req.file) {
                const result = await ImageService.uploadImages([req.file], { entityType: 'reservation_payments' });
                if (!result.success || result.urls.length === 0) {
                    res.status(500).json({ error: 'Error uploading receipt image', details: result.errors });
                    return;
                }
                receiptImage = result.urls[0];
            } else if (req.body.remove_receipt_image === 'true') {
                receiptImage = null;
            }

            const dataToUpdate = receiptImage !== undefined
                ? { ...transformedData, receiptImage }
                : transformedData;

            const updatedReservationPayment = await ReservationPaymentsService.updatePayment(parseInt(id), dataToUpdate);
            res.status(200).json(updatedReservationPayment);
        } catch (error) {
            res.status(500).json({ error: 'Error updating reservation payment' });
        }
    }

    static async deleteReservationPayment(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            await ReservationPaymentsService.deletePayment(parseInt(id));
            res.status(200).json({ message: 'Reservation payment deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error deleting reservation payment' });
        }
    }

    static async getReservationPayments(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
            res.status(200).json(payments);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservation payments' });
        }
    }
}
