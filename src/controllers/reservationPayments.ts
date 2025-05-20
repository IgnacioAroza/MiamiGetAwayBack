import { Request, Response } from 'express';
import { validateReservationPayment, validatePartialReservationPayment } from '../schemas/reservationPaymentsSchema.js';
import ReservationPaymentsService from '../services/reservationPaymentsService.js';

export class ReservationPaymentController {
    static async getAllReservationPayments(req: Request, res: Response): Promise<void> {
        try {
            const reservationPayments = await ReservationPaymentsService.getAllPayments();
            res.status(200).json(reservationPayments);
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
        const { error } = validateReservationPayment(req.body);
        if (error) {
            res.status(400).json({ error: JSON.parse(error.message) });
            return;
        }

        try {
            const newReservationPayment = await ReservationPaymentsService.createPayment(req.body);
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
            const updatedReservationPayment = await ReservationPaymentsService.updatePayment(parseInt(id), transformedData);
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
