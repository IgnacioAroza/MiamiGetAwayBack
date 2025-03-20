import db from '../utils/db_render.js';
import { ReservationPayment } from '../types/reservationPayments.js';
import { validateReservationPayment, validatePartialReservationPayment } from '../schemas/reservationPaymentsSchema.js';

export class ReservationPaymentModel {
    static async getAllReservationPayments(): Promise<ReservationPayment[]> {
        try {
            const { rows } = await db.query('SELECT * FROM reservation_payments');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getReservationPaymentById(id: number): Promise<ReservationPayment | null> {
        try {
            const { rows } = await db.query('SELECT * FROM reservation_payments WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
    
    static async createReservationPayment(reservationPaymentData: ReservationPayment): Promise<ReservationPayment> {
        const validateResult = validateReservationPayment(reservationPaymentData);
        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }
        
        try {
            const { rows } = await db.query('INSERT INTO reservation_payments (reservation_id, amount, payment_date, payment_method, payment_reference, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [
                reservationPaymentData.reservationId,
                reservationPaymentData.amount,
                reservationPaymentData.paymentDate,
                reservationPaymentData.paymentMethod,
                reservationPaymentData.paymentReference,
                reservationPaymentData.notes
            ]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateReservationPayment(id: number, reservationPaymentData: Partial<ReservationPayment>): Promise<ReservationPayment> {
        const validateResult = validatePartialReservationPayment(reservationPaymentData);
        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }
        
        try {
            const { rows } = await db.query('UPDATE reservation_payments SET (reservation_id, amount, payment_date, payment_method, payment_reference, notes) = ($1, $2, $3, $4, $5, $6) WHERE id = $7 RETURNING *', [
                reservationPaymentData.reservationId,
                reservationPaymentData.amount,
                reservationPaymentData.paymentDate,
                reservationPaymentData.paymentMethod,
                reservationPaymentData.paymentReference,
                reservationPaymentData.notes,
                id
            ]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async deleteReservationPayment(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM reservation_payments WHERE id = $1 RETURNING *', [id]);
            if (rows.length === 0) {
                throw new Error('Reservation payment not found');
            }
            return { message: 'Reservation payment deleted successfully' };
        } catch (error) {
            throw error;
        }
    }
}
