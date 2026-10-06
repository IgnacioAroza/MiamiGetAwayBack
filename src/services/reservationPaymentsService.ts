import { ReservationPaymentModel } from '../models/reservationPayment.js';
import { ReservationModel } from '../models/reservation.js';
import { ReservationPayment, CreateReservationPaymentDTO } from '../types/reservationPayments.js';
import ImageService from './imageService.js';

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
            let paymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
            if (amountDue <= 0 && totalPaid > 0) paymentStatus = 'completed';
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

    static async createPayment(paymentData: CreateReservationPaymentDTO, uploadedReceipt = false): Promise<ReservationPayment> {
        // Validar los datos de entrada
        if (!paymentData.reservationId || paymentData.reservationId <= 0) {
            throw new Error('Valid reservation ID is required');
        }
        
        if (!paymentData.amount || paymentData.amount <= 0) {
            throw new Error('Valid payment amount is required');
        }
        
        if (!paymentData.paymentMethod || paymentData.paymentMethod.trim() === '') {
            throw new Error('Payment method is required');
        }

        // Preparar los datos para el modelo
        const paymentForModel: Omit<ReservationPayment, 'id'> = {
            reservationId: paymentData.reservationId,
            amount: paymentData.amount,
            paymentDate: paymentData.paymentDate || new Date(),
            paymentMethod: paymentData.paymentMethod,
            paymentReference: paymentData.paymentReference || undefined,
            notes: paymentData.notes || undefined,
            receiptImage: paymentData.receiptImage ?? null
        };

        let payment;
        try {
            payment = await ReservationPaymentModel.createReservationPayment(paymentForModel as ReservationPayment);
        } catch (error) {
            if (uploadedReceipt && paymentData.receiptImage) await ImageService.deleteImages([paymentData.receiptImage], 'reservation_payments');
            throw error;
        }
        try {
            await this.recalculateReservationPayments(paymentData.reservationId);
            return payment;
        } catch (error) {
            throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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
    } = {}, pagination?: import('../utils/pagination.js').PaginationParams): Promise<{ rows: ReservationPayment[], total: number }> {
        return ReservationPaymentModel.getAllReservationPayments(filters, pagination);
    }

    static async getPaymentById(paymentId: number): Promise<ReservationPayment | null> {
        return ReservationPaymentModel.getReservationPaymentById(paymentId);
    }

    static async updatePayment(paymentId: number, data: Partial<ReservationPayment>, uploadedReceipt = false): Promise<ReservationPayment> {
        const existing = data.receiptImage !== undefined
            ? await ReservationPaymentModel.getReservationPaymentById(paymentId) : null;
        let payment;
        try {
            payment = await ReservationPaymentModel.updateReservationPayment(paymentId, data);
        } catch (error) {
            if (uploadedReceipt && data.receiptImage) await ImageService.deleteImages([data.receiptImage], 'reservation_payments');
            throw error;
        }
        if (existing?.receiptImage && existing.receiptImage !== data.receiptImage) {
            const cleanup = await ImageService.deleteImages([existing.receiptImage], 'reservation_payments');
            if (!cleanup.success) console.warn('Could not delete replaced receipt:', cleanup.errors);
        }
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
