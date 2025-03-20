import db from '../utils/db_render.js';
import { Reservation } from '../types/reservations.js';
import { validateReservation, validatePartialReservation } from '../schemas/reservationSchema.js';

export class ReservationModel {
    static async getAllReservations(filters: {
        startDate?: Date,
        endDate?: Date,
        status?: string,
        clientName?: string,
        clientEmail?: string
    } = {}): Promise<Reservation[]> {
        try {
            let query = 'SELECT * FROM reservations';
            const queryParams: any[] = [];
            const conditions: string[] = [];
            
            // Añadir filtros si existen
            if (filters.startDate) {
                queryParams.push(filters.startDate);
                conditions.push(`check_in_date >= $${queryParams.length}`);
            }
            
            if (filters.endDate) {
                queryParams.push(filters.endDate);
                conditions.push(`check_out_date <= $${queryParams.length}`);
            }
            
            if (filters.status) {
                queryParams.push(filters.status);
                conditions.push(`status = $${queryParams.length}`);
            }
            
            if (filters.clientName) {
                queryParams.push(`%${filters.clientName}%`);
                conditions.push(`client_name ILIKE $${queryParams.length}`);
            }
            
            if (filters.clientEmail) {
                queryParams.push(filters.clientEmail);
                conditions.push(`client_email = $${queryParams.length}`);
            }
            
            // Añadir condiciones a la consulta
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            // Ordenar por fecha de check-in descendente (más recientes primero)
            query += ' ORDER BY check_in_date DESC';
            
            const { rows } = await db.query(query, queryParams);
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
            const { rows } = await db.query('INSERT INTO reservations (apartment_id, client_id, client_name, client_email, client_phone, check_in_date, check_out_date, nights, price_per_night, cleaning_fee, other_expenses, taxes, total_amount, amount_paid, amount_due, parking_fee, status, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *', [
                reservationData.apartmentId,
                reservationData.clientId,
                reservationData.clientName,
                reservationData.clientEmail,
                reservationData.clientPhone,
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
            const { rows } = await db.query('UPDATE reservations SET (apartment_id, client_id, client_name, client_email, client_phone, check_in_date, check_out_date, nights, price_per_night, cleaning_fee, other_expenses, taxes, total_amount, amount_paid, amount_due, parking_fee, status, payment_status) = ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) WHERE id = $1 RETURNING *', [
                reservationData.apartmentId,
                reservationData.clientId,
                reservationData.clientName,
                reservationData.clientEmail,
                reservationData.clientPhone,
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