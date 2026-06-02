import db from '../utils/db_render.js';
import { Experience, ExperienceInquiry, CreateInquiryDTO } from '../types/experiences.js';

export default class ExperienceModel {
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

    static async getAll(): Promise<Experience[]> {
        const { rows } = await db.query('SELECT * FROM experiences ORDER BY id ASC');
        return rows.map(row => this.parseImages(row));
    }

    static async getById(id: number): Promise<Experience | null> {
        const { rows } = await db.query('SELECT * FROM experiences WHERE id = $1', [id]);
        if (!rows[0]) return null;
        return this.parseImages(rows[0]);
    }

    static async create(data: Omit<Experience, 'id' | 'created_at'>): Promise<Experience> {
        const { title, description, capacity, price, images } = data;
        const { rows } = await db.query(
            `INSERT INTO experiences (title, description, capacity, price, images)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, description ?? null, capacity ?? null, price ?? null, images || []]
        );
        return this.parseImages(rows[0]);
    }

    static async update(id: number, data: Partial<Omit<Experience, 'id' | 'created_at'>>): Promise<Experience> {
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;

        if (data.title !== undefined)       { fields.push(`title = $${i++}`);       values.push(data.title); }
        if (data.description !== undefined) { fields.push(`description = $${i++}`); values.push(data.description ?? null); }
        if (data.capacity !== undefined)    { fields.push(`capacity = $${i++}`);    values.push(data.capacity ?? null); }
        if (data.price !== undefined)       { fields.push(`price = $${i++}`);       values.push(data.price ?? null); }
        if (data.images !== undefined)      { fields.push(`images = $${i++}`);      values.push(data.images); }

        if (fields.length === 0) throw new Error('No valid fields to update');

        values.push(id);
        const { rows } = await db.query(
            `UPDATE experiences SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            values
        );
        if (!rows[0]) throw new Error('Experience not found');
        return this.parseImages(rows[0]);
    }

    static async delete(id: number): Promise<void> {
        const { rows } = await db.query('DELETE FROM experiences WHERE id = $1 RETURNING *', [id]);
        if (!rows[0]) throw new Error('Experience not found');
    }

    // Inquiries
    static async createInquiry(data: CreateInquiryDTO): Promise<ExperienceInquiry> {
        const { experience_id, name, lastname, email, phone } = data;
        const { rows } = await db.query(
            `INSERT INTO experience_inquiries (experience_id, name, lastname, email, phone)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [experience_id ?? null, name, lastname, email, phone ?? null]
        );
        return rows[0];
    }

    static async getAllInquiries(): Promise<ExperienceInquiry[]> {
        const { rows } = await db.query(
            `SELECT ei.*, e.title AS experience_title
             FROM experience_inquiries ei
             LEFT JOIN experiences e ON ei.experience_id = e.id
             ORDER BY ei.created_at DESC`
        );
        return rows;
    }

    static async updateInquiryStatus(id: number, status: string): Promise<ExperienceInquiry> {
        const { rows } = await db.query(
            `UPDATE experience_inquiries SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );
        if (!rows[0]) throw new Error('Inquiry not found');
        return rows[0];
    }
}
