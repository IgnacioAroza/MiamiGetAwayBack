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
            let query = `
                SELECT r.*, 
                    c.name as client_name,
                    c.lastname as client_lastname,
                    c.email as client_email,
                    c.phone as client_phone,
                    c.address as client_address,
                    c.city as client_city,
                    c.country as client_country,
                    c.notes as client_notes,
                    a.name as apartment_name,
                    a.address as apartment_address
                FROM reservations r
                LEFT JOIN clients c ON r.client_id = c.id
                LEFT JOIN apartments a ON r.apartment_id = a.id
            `;
            const queryParams: any[] = [];
            const conditions: string[] = [];
            
            // Añadir filtros si existen
            if (filters.startDate) {
                queryParams.push(filters.startDate);
                conditions.push(`r.check_in_date >= $${queryParams.length}`);
            }
            
            if (filters.endDate) {
                queryParams.push(filters.endDate);
                conditions.push(`r.check_out_date <= $${queryParams.length}`);
            }
            
            if (filters.status) {
                queryParams.push(filters.status);
                conditions.push(`r.status = $${queryParams.length}`);
            }
            
            if (filters.clientName) {
                queryParams.push(`%${filters.clientName}%`);
                conditions.push(`c.name ILIKE $${queryParams.length}`);
            }
            
            if (filters.clientEmail) {
                queryParams.push(filters.clientEmail);
                conditions.push(`c.email = $${queryParams.length}`);
            }
            
            // Añadir condiciones a la consulta
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            // Ordenar por fecha de check-in descendente (más recientes primero)
            query += ' ORDER BY r.check_in_date DESC';
            
            const { rows } = await db.query(query, queryParams);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getReservationById(id: number): Promise<Reservation | null> {
        try {
            const { rows } = await db.query(`
                SELECT r.id,
                    r.apartment_id as "apartmentId",
                    r.client_id as "clientId",
                    r.check_in_date as "checkInDate",
                    r.check_out_date as "checkOutDate",
                    r.nights,
                    r.price_per_night as "pricePerNight",
                    r.cleaning_fee as "cleaningFee",
                    r.other_expenses as "otherExpenses",
                    r.taxes,
                    r.total_amount as "totalAmount",
                    r.amount_paid as "amountPaid",
                    r.amount_due as "amountDue",
                    r.parking_fee as "parkingFee",
                    r.status,
                    r.payment_status as "paymentStatus",
                    r.notes,
                    r.created_at as "createdAt",
                    c.name as "clientName",
                    c.lastname as "clientLastname",
                    c.email as "clientEmail",
                    c.phone as "clientPhone",
                    c.address as "clientAddress",
                    c.city as "clientCity",
                    c.country as "clientCountry",
                    c.notes as "clientNotes",
                    a.name as "apartmentName",
                    a.address as "apartmentAddress",
                    a.description as "apartmentDescription"
                FROM reservations r
                LEFT JOIN clients c ON r.client_id = c.id
                LEFT JOIN apartments a ON r.apartment_id = a.id
                WHERE r.id = $1
            `, [id]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
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
            const { rows } = await db.query(
                `INSERT INTO reservations (
                    apartment_id, client_id, 
                    check_in_date, check_out_date, nights, price_per_night, 
                    cleaning_fee, other_expenses, taxes, total_amount, 
                    amount_paid, amount_due, parking_fee, status, payment_status,
                    notes, created_at
                ) VALUES (
                    $1, $2, 
                    $3, $4, $5, $6, $7, $8, $9, $10, 
                    $11, $12, $13, $14, $15, $16, $17
                ) 
                RETURNING *`, 
                [
                    reservationData.apartmentId,
                    reservationData.clientId,
                    reservationData.checkInDate instanceof Date ? reservationData.checkInDate.toISOString() : reservationData.checkInDate,
                    reservationData.checkOutDate instanceof Date ? reservationData.checkOutDate.toISOString() : reservationData.checkOutDate,
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
                    reservationData.notes,
                    new Date().toISOString() // created_at
                ]
            );
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

        let setClause = ''; // Declare setClause outside the try block
        let values: any[] = []; // Declare values outside the try block
        try {
            // Convertir nombres de columnas de camelCase a snake_case
            setClause = Object.keys(reservationData)
                .map((key, index) => {
                    const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    return `${snakeCaseKey} = $${index + 1}`;
                })
                .join(', ');

            // Convertir fechas a cadenas ISO si están presentes
            values = Object.values(reservationData).map(value => {
                if (value instanceof Date) {
                    return value.toISOString();
                }
                return value;
            });

            // Asegurarse de que los índices de los parámetros sean correctos
            values.push(id);

            const { rows } = await db.query(
                `UPDATE reservations 
                SET ${setClause} 
                WHERE id = $${values.length} 
                RETURNING *`,
                values
            );
            return rows[0];
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error in updateReservation SQL:', error.message, 'Query:', setClause, 'Values:', values);
            } else {
                console.error('Error in updateReservation SQL:', error, 'Query:', setClause, 'Values:', values);
            }
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

    static async getReservationWithClientDetails(reservationId: number): Promise<any> {
        const result = await db.query(`
            SELECT 
                r.id,
                r.apartment_id as "apartmentId",
                r.client_id as "clientId",
                r.check_in_date as "checkInDate",
                r.check_out_date as "checkOutDate",
                r.nights,
                r.price_per_night as "pricePerNight",
                r.cleaning_fee as "cleaningFee",
                r.other_expenses as "otherExpenses",
                r.taxes,
                r.total_amount as "totalAmount",
                r.amount_paid as "amountPaid",
                r.amount_due as "amountDue",
                r.parking_fee as "parkingFee",
                r.status,
                r.payment_status as "paymentStatus",
                r.notes,
                r.created_at as "createdAt",
                c.name as "clientName",
                c.lastname as "clientLastname",
                c.email as "clientEmail",
                c.phone as "clientPhone",
                c.address as "clientAddress",
                c.city as "clientCity",
                c.country as "clientCountry"
            FROM reservations r
            LEFT JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
        `, [reservationId]);

        return result.rows[0] || null;
    }

    static async getReservationsForStatusUpdate(): Promise<any[]> {
        const result = await db.query(`
            SELECT id, check_in_date, check_out_date, status
            FROM reservations
            WHERE status IN ('confirmed', 'checked_in')
        `);
        return result.rows;
    }

    static async updateReservationStatus(reservationId: number, newStatus: string): Promise<void> {
        await db.query(
            'UPDATE reservations SET status = $1 WHERE id = $2',
            [newStatus, reservationId]
        );
    }
}