import db from '../utils/db_render.js';
import { Reservation } from '../types/reservations.js';
import { validateReservation, validatePartialReservation, parseReservationDate } from '../schemas/reservationSchema.js';
import { PaginationParams } from '../utils/pagination.js';

export class ReservationModel {
    static async getAllReservations(filters: {
        startDate?: string,
        endDate?: string,
        status?: string,
        clientName?: string,
        clientEmail?: string,
        q?: string,
        clientLastname?: string,
        upcoming?: boolean,
        fromDate?: string,
        withinDays?: number
    } = {}, pagination?: PaginationParams): Promise<{ rows: Reservation[], total: number }> {
        let query = `
            SELECT r.id,
                r.apartment_id as "apartmentId",
                r.client_id as "clientId",
                r.check_in_date as "checkInDate",
                r.check_out_date as "checkOutDate",
                r.nights,
                r.price_per_night as "pricePerNight",
                r.cleaning_fee as "cleaningFee",
                r.cancellation_fee as "cancellationFee",
                r.other_expenses as "otherExpenses",
                r.taxes,
                r.total_amount as "totalAmount",
                r.amount_paid as "amountPaid",
                r.amount_due as "amountDue",
                r.parking_fee as "parkingFee",
                r.status,
                r.payment_status as "paymentStatus",
                r.supplier_status as "supplierStatus",
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
                a.address as "apartmentAddress"
            FROM reservations r
            LEFT JOIN clients c ON r.client_id = c.id
            LEFT JOIN apartments a ON r.apartment_id = a.id
        `;
        const queryParams: any[] = [];
        const conditions: string[] = [];
        
        try {
            // Añadir filtros si existen
            if (filters.startDate) {
                queryParams.push(filters.startDate);
                conditions.push(`mga_parse_date(r.check_in_date) >= $${queryParams.length}::date`);
            }

            if (filters.endDate) {
                queryParams.push(filters.endDate);
                conditions.push(`mga_parse_date(r.check_out_date) <= $${queryParams.length}::date`);
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

            // Nuevo filtro: búsqueda general por nombre o apellido
            if (filters.q) {
                queryParams.push(`%${filters.q}%`);
                const paramIndex1 = queryParams.length;
                queryParams.push(`%${filters.q}%`);
                const paramIndex2 = queryParams.length;
                conditions.push(`(c.name ILIKE $${paramIndex1} OR c.lastname ILIKE $${paramIndex2})`);
            }

            // Nuevo filtro: búsqueda por apellido específico
            if (filters.clientLastname) {
                queryParams.push(`%${filters.clientLastname}%`);
                conditions.push(`c.lastname ILIKE $${queryParams.length}`);
            }

            // Nuevo filtro: próximas reservas
            if (filters.upcoming) {
                // Excluir reservas con check_in_date null cuando upcoming=true
                conditions.push(`r.check_in_date IS NOT NULL`);
                
                // Determinar la fecha base para comparación
                if (filters.fromDate) {
                    queryParams.push(filters.fromDate);
                    conditions.push(`mga_parse_date(r.check_in_date) >= $${queryParams.length}::date`);
                } else {
                    conditions.push(`mga_parse_date(r.check_in_date) >= CURRENT_DATE`);
                }

                if (filters.withinDays !== undefined) {
                    queryParams.push(filters.withinDays);
                    if (filters.fromDate) {
                        const fromDateParam = queryParams.findIndex(p => p === filters.fromDate) + 1;
                        conditions.push(`mga_parse_date(r.check_in_date) < $${fromDateParam}::date + ($${queryParams.length} || ' days')::interval`);
                    } else {
                        conditions.push(`mga_parse_date(r.check_in_date) < CURRENT_DATE + ($${queryParams.length} || ' days')::interval`);
                    }
                }
            }
            
            const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
            query += whereClause;
            query += filters.upcoming
                ? ` ORDER BY mga_parse_date(r.check_in_date) ASC`
                : ` ORDER BY mga_parse_date(r.check_in_date) DESC`;

            if (pagination) {
                const countQuery = `SELECT COUNT(*) FROM reservations r LEFT JOIN clients c ON r.client_id = c.id LEFT JOIN apartments a ON r.apartment_id = a.id${whereClause}`;
                queryParams.push(pagination.limit, pagination.offset);
                query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
                const [data, count] = await Promise.all([
                    db.query(query, queryParams),
                    db.query(countQuery, queryParams.slice(0, -2)),
                ]);
                return { rows: data.rows, total: parseInt(count.rows[0].count) };
            }
            const { rows } = await db.query(query, queryParams);
            return { rows, total: rows.length };
        } catch (error) {
            console.error('Error in getAllReservations:', error);
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
                    r.cancellation_fee as "cancellationFee",
                    r.other_expenses as "otherExpenses",
                    r.taxes,
                    r.total_amount as "totalAmount",
                    r.amount_paid as "amountPaid",
                    r.amount_due as "amountDue",
                    r.parking_fee as "parkingFee",
                    r.status,
                    r.payment_status as "paymentStatus",
                    r.supplier_status as "supplierStatus",
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
                    a.description as "apartmentDescription",
                    a.bathrooms as "apartmentBathrooms",
                    a.rooms as "apartmentBedrooms"
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
                    cleaning_fee, cancellation_fee, other_expenses, taxes, total_amount, 
                    amount_paid, amount_due, parking_fee, status, payment_status,
                    notes, created_at
                ) VALUES (
                    $1, $2, 
                    $3, $4, $5, $6, $7, $8, $9, $10, $11, 
                    $12, $13, $14, $15, $16, $17, $18
                )
                RETURNING
                    id,
                    apartment_id as "apartmentId",
                    client_id as "clientId",
                    check_in_date as "checkInDate",
                    check_out_date as "checkOutDate",
                    nights,
                    price_per_night as "pricePerNight",
                    cleaning_fee as "cleaningFee",
                    cancellation_fee as "cancellationFee",
                    other_expenses as "otherExpenses",
                    taxes,
                    total_amount as "totalAmount",
                    amount_paid as "amountPaid",
                    amount_due as "amountDue",
                    parking_fee as "parkingFee",
                    status,
                    payment_status as "paymentStatus",
                    supplier_status as "supplierStatus",
                    notes,
                    created_at as "createdAt"`,
                [
                    reservationData.apartmentId,
                    reservationData.clientId,
                    reservationData.checkInDate, // Ya es un string, no necesita conversión
                    reservationData.checkOutDate, // Ya es un string, no necesita conversión
                    reservationData.nights,
                    reservationData.pricePerNight,
                    reservationData.cleaningFee,
                    (reservationData as any).cancellationFee ?? 0,
                    reservationData.otherExpenses,
                    reservationData.taxes,
                    reservationData.totalAmount,
                    reservationData.amountPaid,
                    reservationData.amountDue,
                    reservationData.parkingFee,
                    reservationData.status,
                    reservationData.paymentStatus,
                    reservationData.notes,
                    reservationData.createdAt || new Date().toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).replace(',', '').replace(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+)/, '$1-$2-$3 $4:$5')
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

            // Ya no necesitamos convertir fechas a cadenas ISO
            values = Object.values(reservationData);

            // Asegurarse de que los índices de los parámetros sean correctos
            values.push(id);

            const { rows } = await db.query(
                `UPDATE reservations
                SET ${setClause}
                WHERE id = $${values.length}
                RETURNING
                    id,
                    apartment_id as "apartmentId",
                    client_id as "clientId",
                    check_in_date as "checkInDate",
                    check_out_date as "checkOutDate",
                    nights,
                    price_per_night as "pricePerNight",
                    cleaning_fee as "cleaningFee",
                    cancellation_fee as "cancellationFee",
                    other_expenses as "otherExpenses",
                    taxes,
                    total_amount as "totalAmount",
                    amount_paid as "amountPaid",
                    amount_due as "amountDue",
                    parking_fee as "parkingFee",
                    status,
                    payment_status as "paymentStatus",
                    supplier_status as "supplierStatus",
                    notes,
                    created_at as "createdAt"`,
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
                r.cancellation_fee as "cancellationFee",
                r.other_expenses as "otherExpenses",
                r.taxes,
                r.total_amount as "totalAmount",
                r.amount_paid as "amountPaid",
                r.amount_due as "amountDue",
                r.parking_fee as "parkingFee",
                r.status,
                r.payment_status as "paymentStatus",
                r.supplier_status as "supplierStatus",
                r.notes,
                r.created_at as "createdAt",
                c.name as "clientName",
                c.lastname as "clientLastname",
                c.email as "clientEmail",
                c.phone as "clientPhone",
                c.address as "clientAddress",
                c.city as "clientCity",
                c.country as "clientCountry",
                a.name as "apartmentName",
                a.address as "apartmentAddress",
                a.description as "apartmentDescription",
                a.bathrooms as "apartmentBathrooms",
                a.rooms as "apartmentBedrooms"
            FROM reservations r
            LEFT JOIN clients c ON r.client_id = c.id
            LEFT JOIN apartments a ON r.apartment_id = a.id
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
