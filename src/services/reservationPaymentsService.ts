import { ReservationPaymentModel } from '../models/reservationPayment.js';
import { ReservationModel } from '../models/reservation.js';
import { ReservationPayment, CreateReservationPaymentDTO } from '../types/reservationPayments.js';

export default class ReservationPaymentsService {
    // Función para recalcular y actualizar los campos de pago de la reserva
    static async recalculateReservationPayments(reservationId: number): Promise<void> {
        try {
            // Obtener todos los pagos de la reserva
            const payments = await ReservationPaymentModel.getPaymentsByReservation(reservationId);
            const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

            // Obtener la reserva
            const reservation = await ReservationModel.getReservationById(reservationId);
            if (!reservation) return;

            const amountDue = reservation.totalAmount - totalPaid;
            let paymentStatus: 'pending' | 'partial' | 'complete' = 'pending';
            if (amountDue <= 0 && totalPaid > 0) paymentStatus = 'complete';
            else if (totalPaid > 0 && amountDue > 0) paymentStatus = 'partial';

            await ReservationModel.updateReservation(reservationId, {
                amountPaid: totalPaid,
                amountDue: Math.max(0, amountDue),
                paymentStatus
            });
        } catch (error) {
            console.error('Error in recalculateReservationPayments:', error);
            throw error;
        }
    }

    static async createPayment(data: CreateReservationPaymentDTO): Promise<ReservationPayment> {
        if (!data.amount || isNaN(Number(data.amount))) {
            throw new Error('Amount is required and must be a number');
        }

        const paymentData = {
            ...data,
            paymentDate: new Date(),
        };

        const payment = await ReservationPaymentModel.createReservationPayment(paymentData as any);
        await this.recalculateReservationPayments(data.reservationId);
        return payment;
    }

    static async getPaymentsByReservation(reservationId: number): Promise<ReservationPayment[]> {
        return ReservationPaymentModel.getPaymentsByReservation(reservationId);
    }

    static async getAllPayments(filters: {
        startDate?: string,
        endDate?: string,
        paymentMethod?: string,
        clientName?: string,
        clientEmail?: string,
        q?: string,
        clientLastname?: string,
        reservationId?: number
        // status?: string - comentado temporalmente porque la columna no existe
    } = {}): Promise<ReservationPayment[]> {
        return ReservationPaymentModel.getAllReservationPayments(filters);
    }

    static async getPaymentById(paymentId: number): Promise<ReservationPayment | null> {
        return ReservationPaymentModel.getReservationPaymentById(paymentId);
    }

    static async updatePayment(paymentId: number, data: Partial<ReservationPayment>): Promise<ReservationPayment> {
        const payment = await ReservationPaymentModel.updateReservationPayment(paymentId, data);
        const updatedPayment = await ReservationPaymentModel.getReservationPaymentById(paymentId);
        if (updatedPayment?.reservationId) {
            await this.recalculateReservationPayments(updatedPayment.reservationId);
        }
        return payment;
    }

    static async deletePayment(paymentId: number): Promise<void> {
        const payment = await ReservationPaymentModel.getReservationPaymentById(paymentId);
        await ReservationPaymentModel.deleteReservationPayment(paymentId);
        if (payment?.reservationId) {
            await this.recalculateReservationPayments(payment.reservationId);
        }
    }
}