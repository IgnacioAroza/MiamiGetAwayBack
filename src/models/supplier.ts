import db from '../utils/db_render.js';
import { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '../types/suppliers.js';
import { PaginationParams } from '../utils/pagination.js';

export class SupplierModel {
    static async getAll(pagination?: PaginationParams): Promise<{ rows: Supplier[], total: number }> {
        const base = `SELECT id, name, company, email, phone, created_at as "createdAt" FROM suppliers ORDER BY name ASC`;
        if (pagination) {
            const [data, count] = await Promise.all([
                db.query(base + ' LIMIT $1 OFFSET $2', [pagination.limit, pagination.offset]),
                db.query('SELECT COUNT(*) FROM suppliers'),
            ]);
            return { rows: data.rows, total: parseInt(count.rows[0].count) };
        }
        const { rows } = await db.query(base);
        return { rows, total: rows.length };
    }

    static async getById(id: number): Promise<Supplier | null> {
        const { rows } = await db.query(`
            SELECT
                id,
                name,
                company,
                email,
                phone,
                created_at as "createdAt"
            FROM suppliers
            WHERE id = $1
        `, [id]);
        return rows[0] || null;
    }

    static async create(data: CreateSupplierDTO): Promise<Supplier> {
        const { rows } = await db.query(`
            INSERT INTO suppliers (name, company, email, phone)
            VALUES ($1, $2, $3, $4)
            RETURNING
                id,
                name,
                company,
                email,
                phone,
                created_at as "createdAt"
        `, [data.name, data.company ?? null, data.email ?? null, data.phone ?? null]);
        return rows[0];
    }

    static async update(id: number, data: UpdateSupplierDTO): Promise<Supplier | null> {
        const fields = Object.entries(data).filter(([, v]) => v !== undefined);
        if (fields.length === 0) return SupplierModel.getById(id);

        const setClause = fields
            .map(([key], i) => `${key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)} = $${i + 1}`)
            .join(', ');
        const values = fields.map(([, v]) => v);
        values.push(id);

        const { rows } = await db.query(`
            UPDATE suppliers
            SET ${setClause}
            WHERE id = $${values.length}
            RETURNING
                id,
                name,
                company,
                email,
                phone,
                created_at as "createdAt"
        `, values);
        return rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const { rowCount } = await db.query('DELETE FROM suppliers WHERE id = $1', [id]);
        return (rowCount ?? 0) > 0;
    }
}
