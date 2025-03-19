import db from '../utils/db_render.js';
import { Reservation } from '../types/reservations.js';
import { validateReservation, validatePartialReservation } from '../schemas/reservationSchema.js';

export class ReservationModel {
    static async getAllReservations(): Promise<Reservation[]> {
        try {
            const { rows } = await db.query('SELECT * FROM reservations');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getReservationById(id: number): Promise<Reservation | null> {
        try {
            const { rows } = await db.query('SELECT * FROM reservations WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async createReservation(reservationData: Reservation): Promise<Reservation> {
        const validateResult = validateReservation(reservationData);
        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            const { rows } = await db.query('INSERT INTO reservations (apartment_id, client_id, check_in_date, check_out_date, nights, price_per_night, cleaning_fee, other_expenses, taxes, total_amount, amount_paid, amount_due, parking_fee, status, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *', [
                reservationData.apartmentId,
                reservationData.clientId,
                reservationData.checkInDate,
                reservationData.checkOutDate,
                reservationData.nights,
                reservationData.pricePerNight,
                reservationData.cleaningFee,
                reservationData.otherExpenses,
                reservationData.taxes,
                reservationData.totalAmount,
                reservationData.amountPaid,
                reservationData.amountDue,
                reservationData.parkingFee,
                reservationData.status,
                reservationData.paymentStatus
            ]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateReservation(id: number, reservationData: Partial<Reservation>): Promise<Reservation> {
        const validateResult = validatePartialReservation(reservationData);
        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            const { rows } = await db.query('UPDATE reservations SET (apartment_id, client_id, check_in_date, check_out_date, nights, price_per_night, cleaning_fee, other_expenses, taxes, total_amount, amount_paid, amount_due, parking_fee, status, payment_status) = ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) WHERE id = $1 RETURNING *', [
                reservationData.apartmentId,
                reservationData.clientId,
                reservationData.checkInDate,
                reservationData.checkOutDate,
                reservationData.nights,
                reservationData.pricePerNight,
                reservationData.cleaningFee,
                reservationData.otherExpenses,
                reservationData.taxes,
                reservationData.totalAmount,
                reservationData.amountPaid,
                reservationData.amountDue,
                reservationData.parkingFee,
                reservationData.status,
                reservationData.paymentStatus,
                id
            ]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async deleteReservation(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);
            if (rows.length === 0) {
                throw new Error('Reservation not found');
            }
            return { message: 'Reservation deleted successfully' };
        } catch (error) {
            throw error;
        }
    }
}