import db from '../utils/db_render.js';
import { TransferVehicle, TransferInquiry, CreateInquiryDTO } from '../types/transfers.js';
import { normalizeImageArray } from '../utils/imageUtils.js';
import { PaginationParams } from '../utils/pagination.js';

export default class TransferModel {
    private static parseImages(row: any): any {
        if (typeof row.images === 'string') {
            try { row.images = normalizeImageArray(JSON.parse(row.images)); }
            catch { row.images = []; }
        } else if (Array.isArray(row.images)) {
            row.images = normalizeImageArray(row.images);
        } else {
            row.images = [];
        }
        return row;
    }

    // Vehicles
    static async getAllVehicles(pagination?: PaginationParams): Promise<{ rows: TransferVehicle[], total: number }> {
        const base = 'SELECT * FROM transfer_vehicles ORDER BY id ASC';
        const countQuery = 'SELECT COUNT(*) FROM transfer_vehicles';
        if (pagination) {
            const [data, count] = await Promise.all([
                db.query(`${base} LIMIT $1 OFFSET $2`, [pagination.limit, pagination.offset]),
                db.query(countQuery),
            ]);
            return { rows: data.rows.map(row => this.parseImages(row)), total: parseInt(count.rows[0].count) };
        }
        const { rows } = await db.query(base);
        const count = await db.query(countQuery);
        return { rows: rows.map(row => this.parseImages(row)), total: parseInt(count.rows[0].count) };
    }

    static async getVehicleById(id: number): Promise<TransferVehicle | null> {
        const { rows } = await db.query('SELECT * FROM transfer_vehicles WHERE id = $1', [id]);
        if (!rows[0]) return null;
        return this.parseImages(rows[0]);
    }

    static async createVehicle(data: Omit<TransferVehicle, 'id' | 'created_at'>): Promise<TransferVehicle> {
        const { name, category, capacity, luggage_capacity, description, images } = data;
        const { rows } = await db.query(
            `INSERT INTO transfer_vehicles (name, category, capacity, luggage_capacity, description, images)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, category, capacity, luggage_capacity, description ?? null, images || []]
        );
        return this.parseImages(rows[0]);
    }

    static async updateVehicle(id: number, data: Partial<Omit<TransferVehicle, 'id' | 'created_at'>>): Promise<TransferVehicle> {
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;

        if (data.name !== undefined)             { fields.push(`name = $${i++}`);             values.push(data.name); }
        if (data.category !== undefined)         { fields.push(`category = $${i++}`);         values.push(data.category); }
        if (data.capacity !== undefined)         { fields.push(`capacity = $${i++}`);         values.push(data.capacity); }
        if (data.luggage_capacity !== undefined) { fields.push(`luggage_capacity = $${i++}`); values.push(data.luggage_capacity); }
        if (data.description !== undefined)      { fields.push(`description = $${i++}`);      values.push(data.description ?? null); }
        if (data.images !== undefined)           { fields.push(`images = $${i++}`);           values.push(data.images); }

        if (fields.length === 0) throw new Error('No valid fields to update');

        values.push(id);
        const { rows } = await db.query(
            `UPDATE transfer_vehicles SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            values
        );
        if (!rows[0]) throw new Error('Vehicle not found');
        return this.parseImages(rows[0]);
    }

    static async deleteVehicle(id: number): Promise<void> {
        const { rows } = await db.query('DELETE FROM transfer_vehicles WHERE id = $1 RETURNING *', [id]);
        if (!rows[0]) throw new Error('Vehicle not found');
    }

    // Inquiries
    static async createInquiry(data: CreateInquiryDTO): Promise<TransferInquiry> {
        const { vehicle_id, pick_up, drop_off, date, time, passengers, luggage_large, luggage_medium, luggage_carry_on, service_type, client_name, client_email, client_phone, notes } = data;
        const { rows } = await db.query(
            `WITH inserted AS (
                INSERT INTO transfer_inquiries (vehicle_id, pick_up, drop_off, date, time, passengers, luggage_large, luggage_medium, luggage_carry_on, service_type, client_name, client_email, client_phone, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
             )
             SELECT i.*, v.name AS vehicle_name
             FROM inserted i
             LEFT JOIN transfer_vehicles v ON i.vehicle_id = v.id`,
            [vehicle_id ?? null, pick_up, drop_off, date, time, passengers, luggage_large ?? 0, luggage_medium ?? 0, luggage_carry_on ?? 0, service_type, client_name, client_email, client_phone, notes ?? null]
        );
        return rows[0];
    }

    static async getAllInquiries(pagination?: PaginationParams): Promise<{ rows: TransferInquiry[], total: number }> {
        const base = `SELECT ti.*, v.name AS vehicle_name
             FROM transfer_inquiries ti
             LEFT JOIN transfer_vehicles v ON ti.vehicle_id = v.id
             ORDER BY ti.created_at DESC`;
        const countQuery = 'SELECT COUNT(*) FROM transfer_inquiries';
        if (pagination) {
            const [data, count] = await Promise.all([
                db.query(`${base} LIMIT $1 OFFSET $2`, [pagination.limit, pagination.offset]),
                db.query(countQuery),
            ]);
            return { rows: data.rows, total: parseInt(count.rows[0].count) };
        }
        const { rows } = await db.query(base);
        const count = await db.query(countQuery);
        return { rows, total: parseInt(count.rows[0].count) };
    }

    static async updateInquiryStatus(id: number, status: string): Promise<TransferInquiry> {
        const { rows } = await db.query(
            `UPDATE transfer_inquiries SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );
        if (!rows[0]) throw new Error('Inquiry not found');
        return rows[0];
    }
}
