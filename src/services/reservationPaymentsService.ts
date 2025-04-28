import { ReservationModel } from '../models/reservation.js';
import { ReservationPaymentModel } from '../models/reservationPayment.js';
import EmailService from './emailService.js';
import db from '../utils/db_render.js';
import { ReservationPayment, CreateReservationPaymentDTO } from '../types/reservationPayments.js';

export default class ReservationPaymentsService {
    static async createPayment(data: CreateReservationPaymentDTO): Promise<ReservationPayment> {
        if (!data.amount || isNaN(data.amount)) {
            throw new Error('Invalid payment amount');
        }

        const paymentData = {
            ...data,
            paymentDate: new Date(),
        }

        const payment = await ReservationPaymentModel.createReservationPayment(paymentData as any);

        const reservation = await ReservationModel.getReservationById(data.reservationId);
        if (!reservation) {
            throw new Error('Reservation not found');
        }

        const newAmountPaid = (reservation.amountPaid || 0) + data.amount;
        const newAmountDue = reservation.totalAmount - newAmountPaid;
        
        const paymentStatus = newAmountDue <= 0 ? 'complete' : 'partial';

        const updatedReservation = await ReservationModel.updateReservation(data.reservationId, {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            paymentStatus: paymentStatus,
        });

        const paymentAmount = Number(data.amount);
        if (isNaN(paymentAmount)) {
            throw new Error('Invalid payment amount');
        }

        const isPaymentComplete = newAmountDue <= 0;

        // Comentamos el envío automático de email de pago
        /*await EmailService.sendPaymentNotification(updatedReservation, paymentAmount, isPaymentComplete);*/

        return payment;
    }

    static async getPaymentsByReservation(reservationId: number): Promise<ReservationPayment[]> {
        return await ReservationPaymentModel.getPaymentsByReservation(reservationId);
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
