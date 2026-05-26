import db from '../utils/db_render.js';
import { SupplierPayment, CreateSupplierPaymentDTO, UpdateSupplierPaymentDTO } from '../types/suppliers.js';

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
}
