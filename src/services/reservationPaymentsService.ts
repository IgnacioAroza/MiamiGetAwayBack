import { ReservationModel } from '../models/reservation.js';
import { ReservationPaymentModel } from '../models/reservationPayment.js';
import EmailService from './emailService.js';
import db from '../utils/db_render.js';
import { ReservationPayment, CreateReservationPaymentDTO } from '../types/reservationPayments.js';

export default class ReservationPaymentsService {
    static async createPayment(data: CreateReservationPaymentDTO): Promise<ReservationPayment> {
        const paymentData = {
            ...data,
            paymentDate: new Date(),
        }

        const payment = await ReservationPaymentModel.createReservationPayment(paymentData as any);

        const reservation = await ReservationModel.getReservationById(data.reservationId);
        if (!reservation) {
            throw new Error('Reservation not found');
        }

        const updatedReservation = await ReservationModel.updateReservation(data.reservationId, {
            amountPaid: data.amount,
            amountDue: reservation.totalAmount - data.amount,
            paymentStatus: 'partial',
        });

        // 4. Enviar correo de confirmación
        // await EmailService.sendPaymentNotification(updatedReservation, data.amount, isFullPayment);

        return payment;
    }

    static async getPaymentsByReservation(reservationId: number): Promise<ReservationPayment[]> {
        try {
            const { rows } = await db.query(
                'SELECT * FROM reservation_payments WHERE reservation_id = $1 ORDER BY payment_date DESC',
                [reservationId]
            );

            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getAllPayments(): Promise<ReservationPayment[]> {
       return await ReservationPaymentModel.getAllReservationPayments();
    }

    static async getPaymentById(paymentId: number): Promise<ReservationPayment | null> {
        return await ReservationPaymentModel.getReservationPaymentById(paymentId);
    }

    static async updatePayment(paymentId: number, data: Partial<ReservationPayment>): Promise<ReservationPayment> {
        return await ReservationPaymentModel.updateReservationPayment(paymentId, data);
    }

    static async deletePayment(paymentId: number): Promise<void> {
        await ReservationPaymentModel.deleteReservationPayment(paymentId);
    }
}
