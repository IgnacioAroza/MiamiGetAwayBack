import db from '../utils/db_render.js';
import { ReservationPayment } from '../types/reservationPayments.js';
import { validateReservationPayment, validatePartialReservationPayment } from '../schemas/reservationPaymentsSchema.js';

export class ReservationPaymentModel {
    static async getAllReservationPayments(filters: {
        startDate?: string,
        endDate?: string,
        paymentMethod?: string,
        clientName?: string,
        clientEmail?: string,
        q?: string,
        clientLastname?: string,
        reservationId?: number,
        status?: string
    } = {}): Promise<ReservationPayment[]> {
        let query = `
            SELECT 
                rp.id,
                rp.reservation_id as "reservationId",
                rp.amount,
                rp.payment_date as "paymentDate",
                rp.payment_method as "paymentMethod",
                rp.payment_reference as "paymentReference",
                rp.notes,
                c.name as "clientName",
                c.lastname as "clientLastname",
                c.email as "clientEmail",
                r.id as "reservationNumber"
            FROM reservation_payments rp
            LEFT JOIN reservations r ON rp.reservation_id = r.id
            LEFT JOIN clients c ON r.client_id = c.id
        `;
        
        const queryParams: any[] = [];
        const conditions: string[] = [];
        
        try {
            // Filtros por fechas de pago
            if (filters.startDate) {
                queryParams.push(filters.startDate);
                conditions.push(`substr(rp.payment_date::text, 1, 10) >= to_char(to_date($${queryParams.length}, 'MM-DD-YYYY'), 'YYYY-MM-DD')`);
            }
            
            if (filters.endDate) {
                queryParams.push(filters.endDate);
                conditions.push(`substr(rp.payment_date::text, 1, 10) <= to_char(to_date($${queryParams.length}, 'MM-DD-YYYY'), 'YYYY-MM-DD')`);
            }
            
            // Filtro por método de pago
            if (filters.paymentMethod) {
                queryParams.push(filters.paymentMethod);
                conditions.push(`rp.payment_method = $${queryParams.length}`);
            }
            
            // Filtro por ID de reservación
            if (filters.reservationId) {
                queryParams.push(filters.reservationId);
                conditions.push(`rp.reservation_id = $${queryParams.length}`);
            }
            
            // Filtro por estado - comentado temporalmente porque la columna no existe
            // if (filters.status) {
            //     queryParams.push(filters.status);
            //     conditions.push(`rp.status = $${queryParams.length}`);
            // }
            
            // Filtros por cliente
            if (filters.clientName) {
                queryParams.push(`%${filters.clientName}%`);
                conditions.push(`c.name ILIKE $${queryParams.length}`);
            }
            
            if (filters.clientEmail) {
                queryParams.push(filters.clientEmail);
                conditions.push(`c.email = $${queryParams.length}`);
            }

            // Búsqueda general por nombre o apellido del cliente
            if (filters.q) {
                queryParams.push(`%${filters.q}%`);
                const paramIndex1 = queryParams.length;
                queryParams.push(`%${filters.q}%`);
                const paramIndex2 = queryParams.length;
                conditions.push(`(c.name ILIKE $${paramIndex1} OR c.lastname ILIKE $${paramIndex2})`);
            }

            // Búsqueda por apellido específico
            if (filters.clientLastname) {
                queryParams.push(`%${filters.clientLastname}%`);
                conditions.push(`c.lastname ILIKE $${queryParams.length}`);
            }
            
            // Añadir condiciones a la consulta
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            // Ordenar por fecha de pago descendente
            query += ' ORDER BY rp.payment_date DESC';
            
            const { rows } = await db.query(query, queryParams);
            
            return rows;
        } catch (error) {
            console.error('Error in getAllReservationPayments:', error);
            throw error;
        }
    }

    static async getReservationPaymentById(id: number): Promise<ReservationPayment | null> {
        try {
            const { rows } = await db.query(`
                SELECT 
                    id,
                    reservation_id as "reservationId",
                    amount,
                    payment_date as "paymentDate",
                    payment_method as "paymentMethod",
                    payment_reference as "paymentReference",
                    notes
                FROM reservation_payments
                WHERE id = $1
            `, [id]);
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
            const { rows } = await db.query(`
                INSERT INTO reservation_payments 
                    (reservation_id, amount, payment_date, payment_method, payment_reference, notes) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING 
                    id,
                    reservation_id as "reservationId",
                    amount,
                    payment_date as "paymentDate",
                    payment_method as "paymentMethod",
                    payment_reference as "paymentReference",
                    notes
            `, [
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
            // Convertir nombres de columnas de camelCase a snake_case y preparar valores
            const entries = Object.entries(reservationPaymentData);
            const setClause = entries
                .map(([key], index) => {
                    const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    return `${snakeCaseKey} = $${index + 1}`;
                })
                .join(', ');
            const values = entries.map(([_, value]) => value);
            values.push(id);

            const { rows } = await db.query(
                `UPDATE reservation_payments 
                SET ${setClause} 
                WHERE id = $${values.length} 
                RETURNING 
                    id,
                    reservation_id as "reservationId",
                    amount,
                    payment_date as "paymentDate",
                    payment_method as "paymentMethod",
                    payment_reference as "paymentReference",
                    notes
                `,
                values
            );
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

    static async getPaymentsByReservation(reservationId: number): Promise<ReservationPayment[]> {
        const { rows } = await db.query(`
            SELECT 
                id,
                reservation_id as "reservationId",
                amount,
                payment_date as "paymentDate",
                payment_method as "paymentMethod",
                payment_reference as "paymentReference",
                notes
            FROM reservation_payments
            WHERE reservation_id = $1
            ORDER BY payment_date DESC
        `, [reservationId]);
        return rows;
    }
}