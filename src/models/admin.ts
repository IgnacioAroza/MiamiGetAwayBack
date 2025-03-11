import db from '../utils/db_render.js';
import { Admin } from '../types/index.js';
import { validateAdmin } from '../schemas/adminSchema.js';

export default class AdminModel {
    static async getAll(): Promise<Admin[]> {
        try {
            const { rows } = await db.query('SELECT * FROM admins');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getAdminById(id: number): Promise<Admin | null> {
        try {
            const { rows } = await db.query('SELECT * FROM admins WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
    
    static async createAdmin(adminData: Admin): Promise<Admin> {
        const { username, email, password } = adminData;
        const validateResult = validateAdmin(adminData);

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            if (!username || !email || !password) {
                throw new Error('Missing required fields');
            }

            const { rows } = await db.query(
                'INSERT INTO admins (username, email, password) VALUES ($1, $2, $3) RETURNING *;',
                [username, email, password]
            );

            const { id, ...dataWithoutId } = adminData;
            return { id: rows[0].id, ...dataWithoutId };
        } catch (error) {
            console.log('Error creating admin:', error);
            throw error;
        }
    }

    static async updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin> {
        const { username, email, password } = adminData;
        const updateFields = [];
        const updatedValues = [];
        let paramCount = 1;

        if (username !== undefined) {
            updateFields.push(`username = $${paramCount++}`);
            updatedValues.push(username);
        }
        if (email !== undefined) {
            updateFields.push(`email = $${paramCount++}`);
            updatedValues.push(email);
        }
        if (password !== undefined) {
            updateFields.push(`password = $${paramCount++}`);
            updatedValues.push(password);
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        try {
            updatedValues.push(id);
            const query = `UPDATE admins SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues);

            const { rows } = await db.query('SELECT * FROM admins WHERE id = $1', [id]);

            if (rows.length > 0) {
                const updatedAdmin = rows[0];
                return updatedAdmin;
            } else {
                throw new Error('Admin not found');
            }
        } catch (error) {
            console.log('Error updating admin:', error);
            throw error;
        }
    }

    static async deleteAdmin(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM admins WHERE id = $1 RETURNING *;', [id]);

            if (rows.length > 0) {
                return { message: 'Admin deleted successfully' };
            } else {
                throw new Error('Admin not found');
            }
        } catch (error) {
            console.log('Error deleting admin:', error);
            throw error;
        }
    }
}
