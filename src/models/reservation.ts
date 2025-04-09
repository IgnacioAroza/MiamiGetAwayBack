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
                    a.name as apartment_name
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
                SELECT r.*, 
                    c.name as client_name,
                    c.lastname as client_lastname,
                    c.email as client_email,
                    c.phone as client_phone,
                    c.address as client_address,
                    c.city as client_city,
                    c.country as client_country,
                    c.notes as client_notes,
                    a.name as apartment_name
                FROM reservations r
                LEFT JOIN clients c ON r.client_id = c.id
                LEFT JOIN apartments a ON r.apartment_id = a.id
                WHERE r.id = $1
            `, [id]);
            
            if (rows.length === 0) {
                return null;
            }
            
            // Realizar transformaciones necesarias (por ejemplo, fechas)
            
            // Convertir fechas de string a objetos Date si es necesario
            if (rows[0].check_in_date && typeof rows[0].check_in_date === 'string') {
                rows[0].check_in_date = new Date(rows[0].check_in_date);
            }
            
            if (rows[0].check_out_date && typeof rows[0].check_out_date === 'string') {
                rows[0].check_out_date = new Date(rows[0].check_out_date);
            }
            
            // Verificar que todos los campos numéricos son realmente números
            ['nights', 'price_per_night', 'cleaning_fee', 'other_expenses', 'taxes', 
             'total_amount', 'amount_paid', 'amount_due', 'parking_fee'].forEach(field => {
                if (rows[0][field] !== undefined && rows[0][field] !== null) {
                    const originalValue = rows[0][field];
                    // Si no es un número, intentar convertirlo
                    if (typeof originalValue !== 'number') {
                        try {
                            const numericValue = Number(originalValue);
                            if (!isNaN(numericValue)) {
                                rows[0][field] = numericValue;
                            }
                        } catch (error) {
                            // Ignorar errores de conversión
                        }
                    }
                }
            });
            
            // Transformar snake_case a camelCase para compatibilidad
            
            // Mapa de transformación de propiedades
            const transformMap = {
                'check_in_date': 'checkInDate',
                'check_out_date': 'checkOutDate',
                'price_per_night': 'pricePerNight',
                'cleaning_fee': 'cleaningFee',
                'other_expenses': 'otherExpenses',
                'total_amount': 'totalAmount',
                'amount_paid': 'amountPaid',
                'amount_due': 'amountDue',
                'parking_fee': 'parkingFee',
                'client_name': 'clientName',
                'client_lastname': 'clientLastname',
                'client_email': 'clientEmail',
                'client_phone': 'clientPhone',
                'client_address': 'clientAddress',
                'client_city': 'clientCity',
                'client_country': 'clientCountry',
                'client_notes': 'clientNotes',
                'payment_status': 'paymentStatus',
                'apartment_id': 'apartmentId',
                'apartment_name': 'apartmentName',
                'client_id': 'clientId',
                'created_at': 'createdAt'
            };
            
            // Añadir propiedades en camelCase manteniendo las originales
            Object.entries(transformMap).forEach(([snakeCase, camelCase]) => {
                if (rows[0][snakeCase] !== undefined) {
                    rows[0][camelCase] = rows[0][snakeCase];
                }
            });
            
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
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
                RETURNING *`, 
                [
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
                    reservationData.createdAt
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

        try {
            const setClause = Object.keys(reservationData)
                .map((key, index) => `${key} = $${index + 1}`)
                .join(', ');
            
            const values = Object.values(reservationData);
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