import db from '../utils/db_render.js';
import { MonthlySummary, CreateMonthlySummaryDTO, UpdateMonthlySummaryDTO } from '../types/monthlySummary.js';
import { validateMonthlySummary, validatePartialMonthlySummary } from '../schemas/monthlySummary.js';

export class MonthlySummaryModel {
    // Metodos basicos de CRUD
    static async getAllSummaries(): Promise<MonthlySummary[]> {
        try {
            const query = `
                SELECT * FROM monthly_summaries
                ORDER BY year DESC, month DESC;
            `;
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    static async getSalesVolume(params: { from: string; to: string; groupBy: 'day'|'month'|'year' }): Promise<any[]> {
        try {
            const { from, to, groupBy } = params;
            const granularity = groupBy === 'day' || groupBy === 'year' ? groupBy : 'month';

            const query = `
                SELECT 
                    date_trunc('${granularity}', payment_date) AS period,
                    SUM(amount)::numeric(12,2) AS "totalRevenue",
                    COUNT(*)::int AS "totalPayments"
                FROM reservation_payments
                WHERE payment_date >= $1::timestamp
                  AND payment_date <= $2::timestamp + INTERVAL '23 hours 59 minutes 59 seconds'
                GROUP BY 1
                ORDER BY 1;
            `;
            const values = [from, to];
            const result = await db.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    static async getSummaryById(id: number): Promise<MonthlySummary | null> {
        try {
            const query = `
                SELECT * FROM monthly_summaries
                WHERE id = $1;
            `;
            const result = await db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async getSummaryByMonthAndYear(month: number, year: number): Promise<MonthlySummary | null> {
        try {
            const query = `
                SELECT 
                    id,
                    month,
                    year,
                    total_reservations as "totalReservations",
                    total_payments as "totalPayments",
                    total_revenue as "totalRevenue",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                FROM monthly_summaries
                WHERE month = $1 AND year = $2;
            `;
            const result = await db.query(query, [month, year]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async createSummary(data: CreateMonthlySummaryDTO): Promise<MonthlySummary> {
        try {
            // Validar datos
            const validation = validateMonthlySummary(data);
            if (!validation.success) {
                throw new Error('Invalid monthly summary data');
            }

            const query = `
                INSERT INTO monthly_summaries (
                    month, 
                    year, 
                    total_reservations, 
                    total_payments, 
                    total_revenue
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING 
                    id,
                    month,
                    year,
                    total_reservations as "totalReservations",
                    total_payments as "totalPayments",
                    total_revenue as "totalRevenue",
                    created_at as "createdAt",
                    updated_at as "updatedAt";
            `;
            const values = [
                data.month,
                data.year,
                data.totalReservations,
                data.totalPayments,
                data.totalRevenue
            ];
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateSummary(id: number, data: UpdateMonthlySummaryDTO): Promise<MonthlySummary> {
        try {
            // Validar datos
            const validation = validatePartialMonthlySummary(data);
            if (!validation.success) {
                throw new Error('Invalid monthly summary data');
            }

            const fields: string[] = [];
            const values: any[] = [];
            let paramCount = 1;

            if (data.totalReservations !== undefined) {
                fields.push(`total_reservations = $${paramCount}`);
                values.push(data.totalReservations);
                paramCount++;
            }
            
            if (data.totalPayments !== undefined) {
                fields.push(`total_payments = $${paramCount}`);
                values.push(data.totalPayments);
                paramCount++;
            }
            
            if (data.totalRevenue !== undefined) {
                fields.push(`total_revenue = $${paramCount}`);
                values.push(data.totalRevenue);
                paramCount++;
            }

            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(id);

            const query = `
                UPDATE monthly_summaries
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING 
                    id,
                    month,
                    year,
                    total_reservations as "totalReservations",
                    total_payments as "totalPayments",
                    total_revenue as "totalRevenue",
                    created_at as "createdAt",
                    updated_at as "updatedAt";
            `;
            
            const result = await db.query(query, values);
            return result.rows[0];            
        } catch (error) {
            throw error;
        }
    }

    static async deleteSummary(id: number): Promise<{ message: string }> {
        try {
            const query = `
                DELETE FROM monthly_summaries WHERE id = $1;
            `;
            await db.query(query, [id]);
            return { message: 'Monthly summary deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    // Metodos para obtener datos
    static async getReservationsByMonth(month: number, year: number): Promise<any[]> {
        try {
            const query = `
                SELECT 
                    r.id,
                    r.check_in_date as "checkInDate",
                    r.check_out_date as "checkOutDate",
                    r.total_amount as "totalAmount",
                    r.status,
                    c.name as "clientName",
                    c.lastname as "clientLastName",
                    c.email as "clientEmail",
                    c.phone as "clientPhone",
                    a.name as "apartmentName",
                    a.address as "apartmentAddress"
                FROM reservations r
                LEFT JOIN clients c ON r.client_id = c.id
                LEFT JOIN apartments a ON r.apartment_id = a.id
                WHERE EXTRACT(MONTH FROM r.check_in_date) = $1 
                AND EXTRACT(YEAR FROM r.check_in_date) = $2
                ORDER BY r.id ASC;
            `;
            
            const result = await db.query(query, [month, year]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    static async getPaymentsByMonth(month: number, year: number): Promise<any[]> {
        try {
            const query = `
                SELECT 
                    rp.id,
                    rp.amount,
                    rp.payment_date as "paymentDate",
                    rp.reservation_id as "reservationId",
                    r.check_in_date as "checkInDate",
                    r.check_out_date as "checkOutDate",
                    c.name as "clientName",
                    c.lastname as "clientLastName"
                FROM reservation_payments rp
                JOIN reservations r ON rp.reservation_id = r.id
                JOIN clients c ON r.client_id = c.id
                WHERE EXTRACT(MONTH FROM rp.payment_date) = $1 
                AND EXTRACT(YEAR FROM rp.payment_date) = $2
                ORDER BY rp.id ASC;
            `;
            
            const result = await db.query(query, [month, year]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    static async summaryExists(month: number, year: number): Promise<boolean> {
        try {
            const query = `
                SELECT EXISTS(
                    SELECT 1 FROM monthly_summaries 
                    WHERE month = $1 AND year = $2
                );
            `;
            
            const result = await db.query(query, [month, year]);
            return result.rows[0].exists;
        } catch (error) {
            throw error;
        }
    }
}
