import db from '../utils/db_render.js';
import { ReservationSupplier, AssignSupplierDTO } from '../types/suppliers.js';

export class ReservationSupplierModel {
    static async getByReservation(reservationId: number): Promise<ReservationSupplier | null> {
        const { rows } = await db.query(`
            SELECT
                rs.id,
                rs.reservation_id as "reservationId",
                rs.supplier_id as "supplierId",
                rs.payout_per_night as "payoutPerNight",
                rs.payment_terms as "paymentTerms",
                rs.created_at as "createdAt",
                s.name as "supplierName",
                s.company as "supplierCompany",
                s.email as "supplierEmail",
                s.phone as "supplierPhone",
                r.nights * rs.payout_per_night as "totalPayout",
                COALESCE(SUM(sp.amount), 0) as "totalPaid",
                (r.nights * rs.payout_per_night) - COALESCE(SUM(sp.amount), 0) as "balance"
            FROM reservation_suppliers rs
            JOIN suppliers s ON rs.supplier_id = s.id
            JOIN reservations r ON rs.reservation_id = r.id
            LEFT JOIN supplier_payments sp ON sp.reservation_supplier_id = rs.id
            WHERE rs.reservation_id = $1
            GROUP BY rs.id, s.name, s.company, s.email, s.phone, r.nights
        `, [reservationId]);
        return rows[0] || null;
    }

    static async getById(id: number): Promise<ReservationSupplier | null> {
        const { rows } = await db.query(`
            SELECT
                rs.id,
                rs.reservation_id as "reservationId",
                rs.supplier_id as "supplierId",
                rs.payout_per_night as "payoutPerNight",
                rs.payment_terms as "paymentTerms",
                rs.created_at as "createdAt",
                s.name as "supplierName",
                s.company as "supplierCompany",
                s.email as "supplierEmail",
                s.phone as "supplierPhone"
            FROM reservation_suppliers rs
            JOIN suppliers s ON rs.supplier_id = s.id
            WHERE rs.id = $1
        `, [id]);
        return rows[0] || null;
    }

    static async assign(reservationId: number, data: AssignSupplierDTO): Promise<ReservationSupplier> {
        const { rows } = await db.query(`
            INSERT INTO reservation_suppliers
                (reservation_id, supplier_id, payout_per_night, payment_terms)
            VALUES ($1, $2, $3, $4)
            RETURNING
                id,
                reservation_id as "reservationId",
                supplier_id as "supplierId",
                payout_per_night as "payoutPerNight",
                payment_terms as "paymentTerms",
                created_at as "createdAt"
        `, [reservationId, data.supplierId, data.payoutPerNight, data.paymentTerms ?? null]);
        return rows[0];
    }

    static async update(reservationId: number, data: Partial<AssignSupplierDTO>): Promise<ReservationSupplier | null> {
        const fields = Object.entries(data).filter(([, v]) => v !== undefined);
        if (fields.length === 0) return ReservationSupplierModel.getByReservation(reservationId);

        const colMap: Record<string, string> = {
            supplierId: 'supplier_id',
            payoutPerNight: 'payout_per_night',
            paymentTerms: 'payment_terms'
        };

        const setClause = fields
            .map(([key], i) => `${colMap[key] ?? key} = $${i + 1}`)
            .join(', ');
        const values = fields.map(([, v]) => v);
        values.push(reservationId);

        const { rows } = await db.query(`
            UPDATE reservation_suppliers
            SET ${setClause}
            WHERE reservation_id = $${values.length}
            RETURNING
                id,
                reservation_id as "reservationId",
                supplier_id as "supplierId",
                payout_per_night as "payoutPerNight",
                payment_terms as "paymentTerms",
                created_at as "createdAt"
        `, values);
        return rows[0] || null;
    }

    static async unassign(reservationId: number): Promise<boolean> {
        const { rowCount } = await db.query(
            'DELETE FROM reservation_suppliers WHERE reservation_id = $1',
            [reservationId]
        );
        return (rowCount ?? 0) > 0;
    }
}
