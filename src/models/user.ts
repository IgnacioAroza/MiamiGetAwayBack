import db from '../utils/db_render.js';
import { Client } from '../types/index.js';
import { validateUser } from '../schemas/userSchema.js';
import type { UserFilters } from '../schemas/userSchema.js';

export default class UserModel {
    static async getAll(filters?: UserFilters): Promise<Client[]> {
        try {
            const conditions: string[] = [];
            const values: any[] = [];

            if (filters?.name) {
                values.push(`%${filters.name}%`);
                conditions.push(`name ILIKE $${values.length}`);
            }
            if (filters?.lastname) {
                values.push(`%${filters.lastname}%`);
                conditions.push(`lastname ILIKE $${values.length}`);
            }
            if (filters?.email) {
                values.push(`%${filters.email}%`);
                conditions.push(`email ILIKE $${values.length}`);
            }
            if (filters?.phone) {
                values.push(`%${filters.phone}%`);
                conditions.push(`phone ILIKE $${values.length}`);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const baseQuery = 'SELECT * FROM clients';
            const query = whereClause ? `${baseQuery} ${whereClause}` : baseQuery;

            const { rows } = await db.query(query, values);
            return rows;
        } catch (error) {
            console.error('Error en getAll:', error);
            // En lugar de propagar el error, devolvemos un array vacío
            return [];
        }
    }

    static async getUserById(id: number): Promise<Client | null> {
        try {
            const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en getUserById:', error);
            throw error;
        }
    }
    
    static async createUser(userData: Client): Promise<Client | null> {
        const { name, lastname, email, phone, address, city, country, notes } = userData;
        const validateResult = validateUser(userData);

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            if (!name || !lastname || !email) {
                throw new Error('Missing required fields');
            }

            const { rows } = await db.query(
                'INSERT INTO clients (name, lastname, email, phone, address, city, country, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;',
                [name, lastname, email, phone, address, city, country, notes]
            );

            // Si no hay filas devueltas, retornamos null en lugar de undefined
            if (!rows || rows.length === 0) {
                console.error('No se devolvieron filas al crear el usuario');
                return null;
            }

            return rows[0];
        } catch (error: any) {
            console.error('Error creating user:', error.message || error);
            // Si es un error de duplicado (código 23505), dar un mensaje más claro
            if (error.code === '23505') {
                throw new Error('El correo electrónico ya está registrado');
            }
            throw error;
        }
    }

    static async updateUser(id: number, userData: Partial<Client>): Promise<Client> {
        const { name, lastname, email, phone, address, city, country, notes } = userData;
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
        if (phone !== undefined) {
            updateFields.push(`phone = $${paramCount++}`);
            updatedValues.push(phone);
        }
        if (address !== undefined) {
            updateFields.push(`address = $${paramCount++}`);
            updatedValues.push(address);
        }
        if (city !== undefined) {
            updateFields.push(`city = $${paramCount++}`);
            updatedValues.push(city);
        }
        if (country !== undefined) {
            updateFields.push(`country = $${paramCount++}`);
            updatedValues.push(country);
        }
        if (notes !== undefined) {
            updateFields.push(`notes = $${paramCount++}`);
            updatedValues.push(notes);
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
            throw error;
        }
    }    
}
