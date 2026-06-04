import db from '../utils/db_render.js';
import { Investment } from '../types/investments.js';

export default class InvestmentModel {
    private static normalizeImages(imageData: any): string[] {
        if (!Array.isArray(imageData)) return [];
        return imageData
            .map((item: any) => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item !== null && typeof item.url === 'string') return item.url;
                return null;
            })
            .filter((url): url is string => url !== null && url.trim() !== '');
    }

    private static parseImages(row: any): any {
        if (typeof row.images === 'string') {
            try { row.images = this.normalizeImages(JSON.parse(row.images)); }
            catch { row.images = []; }
        } else if (Array.isArray(row.images)) {
            row.images = this.normalizeImages(row.images);
        } else {
            row.images = [];
        }
        return row;
    }

    static async getAll(): Promise<Investment[]> {
        const { rows } = await db.query('SELECT * FROM investments ORDER BY id ASC');
        return rows.map(row => this.parseImages(row));
    }

    static async getById(id: number): Promise<Investment | null> {
        const { rows } = await db.query('SELECT * FROM investments WHERE id = $1', [id]);
        if (!rows[0]) return null;
        return this.parseImages(rows[0]);
    }

    static async create(data: Omit<Investment, 'id' | 'created_at'>): Promise<Investment> {
        const { name, unit_number, address, description, bathrooms, rooms, price, images } = data;
        const { rows } = await db.query(
            `INSERT INTO investments (name, unit_number, address, description, bathrooms, rooms, price, images)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, unit_number ?? null, address, description ?? null, bathrooms, rooms, price ?? null, images || []]
        );
        return this.parseImages(rows[0]);
    }

    static async update(id: number, data: Partial<Omit<Investment, 'id' | 'created_at'>>): Promise<Investment> {
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;

        if (data.name !== undefined)        { fields.push(`name = $${i++}`);        values.push(data.name); }
        if (data.unit_number !== undefined)  { fields.push(`unit_number = $${i++}`); values.push(data.unit_number ?? null); }
        if (data.address !== undefined)      { fields.push(`address = $${i++}`);     values.push(data.address); }
        if (data.description !== undefined)  { fields.push(`description = $${i++}`); values.push(data.description ?? null); }
        if (data.bathrooms !== undefined)    { fields.push(`bathrooms = $${i++}`);   values.push(data.bathrooms); }
        if (data.rooms !== undefined)        { fields.push(`rooms = $${i++}`);       values.push(data.rooms); }
        if (data.price !== undefined)        { fields.push(`price = $${i++}`);       values.push(data.price ?? null); }
        if (data.images !== undefined)       { fields.push(`images = $${i++}`);      values.push(data.images); }

        if (fields.length === 0) throw new Error('No valid fields to update');

        values.push(id);
        const { rows } = await db.query(
            `UPDATE investments SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            values
        );
        if (!rows[0]) throw new Error('Investment not found');
        return this.parseImages(rows[0]);
    }

    static async delete(id: number): Promise<{ message: string }> {
        const { rows } = await db.query('DELETE FROM investments WHERE id = $1 RETURNING *', [id]);
        if (!rows[0]) throw new Error('Investment not found');
        return { message: 'Investment deleted successfully' };
    }
}
