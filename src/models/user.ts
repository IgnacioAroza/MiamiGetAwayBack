import db from '../utils/db_render.js';
import { Client } from '../types/index.js';
import { validateUser } from '../schemas/userSchema.js';

export default class UserModel {
    static async getAll(): Promise<Client[]> {
        try {
            const { rows } = await db.query('SELECT * FROM clients');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getUserById(id: number): Promise<Client | null> {
        try {
            const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
    
    static async createUser(userData: Client): Promise<Client> {
        const { name, lastname, email } = userData;
        const validateResult = validateUser(userData);

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            if (!name || !lastname || !email) {
                throw new Error('Missing required fields');
            }

            const { rows } = await db.query(
                'INSERT INTO clients (name, lastname, email) VALUES ($1, $2, $3) RETURNING *;',
                [name, lastname, email]
            );

            const { id, ...dataWithoutId } = userData;
            return { id: rows[0].id, ...dataWithoutId };
        } catch (error) {
            console.log('Error creating user:', error);
            throw error;
        }
    }

    static async updateUser(id: number, userData: Partial<Client>): Promise<Client> {
        const { name, lastname, email } = userData;
        const updateFields = [];
        const updatedValues = [];
        let paramCount = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramCount++}`);
            updatedValues.push(name);
        }
        if (lastname !== undefined) {
            updateFields.push(`lastname = $${paramCount++}`);
            updatedValues.push(lastname);
        }
        if (email !== undefined) {
            updateFields.push(`email = $${paramCount++}`);
            updatedValues.push(email);
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        try {
            updatedValues.push(id);
            const query = `UPDATE clients SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues);

            const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);

            if (rows.length > 0) {
                const updatedUser = rows[0];
                return updatedUser;
            } else {
                throw new Error('User not found');
            }
        } catch (error) {
            console.log('Error updating user:', error);
            throw error;
        }
    }

    static async deleteUser(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM clients WHERE id = $1 RETURNING *;', [id]);

            if (rows.length > 0) {
                return { message: 'User deleted successfully' };
            } else {
                throw new Error('User not found');
            }
        } catch (error) {
            console.log('Error deleting user:', error);
            throw error;
        }
    }    
}
