import db from '../utils/db_render.js';
import { SupplierPayment, SupplierPaymentWithDetails, SupplierPaymentSummary, CreateSupplierPaymentDTO, UpdateSupplierPaymentDTO } from '../types/suppliers.js';
import { PaginationParams } from '../utils/pagination.js';

export class SupplierPaymentModel {
    static async getByReservationSupplier(reservationSupplierId: number): Promise<SupplierPayment[]> {
        const { rows } = await db.query(`
            SELECT
                id,
                reservation_supplier_id as "reservationSupplierId",
                amount,
                method,
                date,
                reference_notes as "referenceNotes",
                receipt_images as "receiptImages",
                created_at as "createdAt"
            FROM supplier_payments
            WHERE reservation_supplier_id = $1
            ORDER BY date DESC
        `, [reservationSupplierId]);
        return rows;
    }

    static async getById(id: number): Promise<SupplierPayment | null> {
        const { rows } = await db.query(`
            SELECT
                id,
                reservation_supplier_id as "reservationSupplierId",
                amount,
                method,
                date,
                reference_notes as "referenceNotes",
                receipt_images as "receiptImages",
                created_at as "createdAt"
            FROM supplier_payments
            WHERE id = $1
        `, [id]);
        return rows[0] || null;
    }

    static async create(data: CreateSupplierPaymentDTO): Promise<SupplierPayment> {
        const { rows } = await db.query(`
            INSERT INTO supplier_payments
                (reservation_supplier_id, amount, method, date, reference_notes, receipt_images)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                reservation_supplier_id as "reservationSupplierId",
                amount,
                method,
                date,
                reference_notes as "referenceNotes",
                receipt_images as "receiptImages",
                created_at as "createdAt"
        `, [
            data.reservationSupplierId,
            data.amount,
            data.method,
            data.date,
            data.referenceNotes ?? null,
            data.receiptImages ?? []
        ]);
        return rows[0];
    }

    static async update(id: number, data: UpdateSupplierPaymentDTO): Promise<SupplierPayment | null> {
        const colMap: Record<string, string> = {
            referenceNotes: 'reference_notes',
            receiptImages: 'receipt_images'
        };

        const fields = Object.entries(data).filter(([, v]) => v !== undefined);
        if (fields.length === 0) return SupplierPaymentModel.getById(id);

        const setClause = fields
            .map(([key], i) => `${colMap[key] ?? key} = $${i + 1}`)
            .join(', ');
        const values = fields.map(([, v]) => v);
        values.push(id);

        const { rows } = await db.query(`
            UPDATE supplier_payments
            SET ${setClause}
            WHERE id = $${values.length}
            RETURNING
                id,
                reservation_supplier_id as "reservationSupplierId",
                amount,
                method,
                date,
                reference_notes as "referenceNotes",
                receipt_images as "receiptImages",
                created_at as "createdAt"
        `, values);
        return rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const { rowCount } = await db.query('DELETE FROM supplier_payments WHERE id = $1', [id]);
        return (rowCount ?? 0) > 0;
    }

    static async getAll(
        filters: {
            supplierId?: number;
            reservationId?: number;
            startDate?: string;
            endDate?: string;
        } = {},
        pagination?: PaginationParams
    ): Promise<{ rows: SupplierPaymentWithDetails[], total: number, summary: SupplierPaymentSummary | null }> {
        const queryParams: any[] = [];
        const conditions: string[] = [];

        if (filters.supplierId) {
            queryParams.push(filters.supplierId);
            conditions.push(`rs.supplier_id = $${queryParams.length}`);
        }

        if (filters.reservationId) {
            queryParams.push(filters.reservationId);
            conditions.push(`rs.reservation_id = $${queryParams.length}`);
        }

        if (filters.startDate) {
            queryParams.push(filters.startDate);
            conditions.push(`sp.date >= $${queryParams.length}::date`);
        }

        if (filters.endDate) {
            queryParams.push(filters.endDate);
            conditions.push(`sp.date <= $${queryParams.length}::date`);
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        const baseFrom = `
            FROM supplier_payments sp
            JOIN reservation_suppliers rs ON sp.reservation_supplier_id = rs.id
            JOIN reservations r ON rs.reservation_id = r.id
            LEFT JOIN apartments a ON r.apartment_id = a.id
            JOIN suppliers s ON rs.supplier_id = s.id
        `;

        let dataQuery = `
            SELECT
                sp.id,
                sp.amount,
                sp.method,
                to_char(sp.date, 'YYYY-MM-DD') as date,
                sp.reference_notes as "referenceNotes",
                sp.receipt_images as "receiptImages",
                sp.created_at as "createdAt",
                s.id as "supplierId",
                s.name as "supplierName",
                s.email as "supplierEmail",
                s.phone as "supplierPhone",
                r.id as "reservationId",
                a.name as "apartmentName",
                r.check_in_date as "checkInDate",
                r.check_out_date as "checkOutDate",
                r.nights
            ${baseFrom}
            ${whereClause}
            ORDER BY sp.date DESC, sp.id DESC
        `;

        let summary: SupplierPaymentSummary | null = null;

        if (filters.supplierId) {
            const summaryResult = await db.query(`
                SELECT
                    COALESCE((
                        SELECT SUM(sp2.amount)
                        FROM supplier_payments sp2
                        JOIN reservation_suppliers rs2 ON sp2.reservation_supplier_id = rs2.id
                        WHERE rs2.supplier_id = $1
                    ), 0) as total_paid,
                    COALESCE((
                        SELECT SUM(rs3.payout_per_night * r3.nights + rs3.cleaning_fee)
                        FROM reservation_suppliers rs3
                        JOIN reservations r3 ON rs3.reservation_id = r3.id
                        WHERE rs3.supplier_id = $1
                    ), 0) as total_owed
            `, [filters.supplierId]);

            const totalPaid = Number(summaryResult.rows[0].total_paid);
            const totalOwed = Number(summaryResult.rows[0].total_owed);
            summary = { totalPaid, totalOwed, balance: totalOwed - totalPaid };
        }

        if (pagination) {
            const countQuery = `SELECT COUNT(*) ${baseFrom} ${whereClause}`;
            queryParams.push(pagination.limit, pagination.offset);
            dataQuery += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
            const [data, count] = await Promise.all([
                db.query(dataQuery, queryParams),
                db.query(countQuery, queryParams.slice(0, -2)),
            ]);
            return { rows: data.rows, total: parseInt(count.rows[0].count), summary };
        }

        const { rows } = await db.query(dataQuery, queryParams);
        return { rows, total: rows.length, summary };
    }
}
