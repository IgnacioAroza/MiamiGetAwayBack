import db from '../utils/db_render.js';
import { Villa, CreateVillaDTO, UpdateVillaDTO } from '../types/index.js';
import { validateVilla, validatePartialVilla } from '../schemas/villaSchema.js';

export default class VillaModel {
    static async getAll(): Promise<Villa[]> {
        try {
            const { rows } = await db.query('SELECT * FROM villas');
            return rows;
        } catch (error) {
            console.error('Error getting all villas:', error);
            throw new Error('Database error');
        }
    }

    static async getVillaById(id: number): Promise<Villa | null> {
        try {
            const { rows } = await db.query('SELECT * FROM villas WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting villa by ID:', error);
            throw new Error('Database error');
        }
    }
    
    static async createVilla(villaData: CreateVillaDTO): Promise<Villa> {
        try {
            // Validar los datos de entrada
            const validateResult = validateVilla(villaData);
            if (!validateResult.success) {
                throw new Error(validateResult.error.errors[0].message);
            }

            // Verificar campos requeridos explícitamente
            if (!villaData.name) {
                throw new Error('Missing required fields');
            }

            const { name, description, address, capacity, bathrooms, rooms, price, images } = villaData;
            const safeDescription = description || null;
            const safeImages = images || [];

            const { rows } = await db.query(
                'INSERT INTO villas (name, description, address, capacity, bathrooms, rooms, price, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;',
                [name, safeDescription, address, capacity, bathrooms, rooms, price, JSON.stringify(safeImages)]
            );

            if (!rows || rows.length === 0) {
                throw new Error('Database error');
            }

            const createdVilla = { ...rows[0] };
            // Mantenemos la descripción original en lugar de la que devuelve la BD
            if (description) {
                createdVilla.description = description;
            }
            
            if (createdVilla.images && typeof createdVilla.images === 'string') {
                try {
                    createdVilla.images = JSON.parse(createdVilla.images);
                } catch (error) {
                    console.error('Error al parsear imágenes:', error);
                    createdVilla.images = [];
                }
            }

            return createdVilla;
        } catch (error) {
            console.error('Error al crear la villa:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Database error');
        }
    }

    static async updateVilla(id: number, villaData: UpdateVillaDTO): Promise<Villa> {
        try {
            // Primero hacer la validación antes de buscar la villa
            const validateResult = validatePartialVilla(villaData);
            if (!validateResult.success) {
                throw new Error(validateResult.error.errors[0].message);
            }

            // Si no hay campos para actualizar, lanzar un error
            const updateFields = [];
            const updatedValues = [];
            let paramCount = 1;

            if (villaData.name !== undefined) {
                updateFields.push(`name = $${paramCount++}`);
                updatedValues.push(villaData.name);
            }
            if (villaData.description !== undefined) {
                updateFields.push(`description = $${paramCount++}`);
                updatedValues.push(villaData.description);
            }
            if (villaData.address !== undefined) {
                updateFields.push(`address = $${paramCount++}`);
                updatedValues.push(villaData.address);
            }
            if (villaData.capacity !== undefined) {
                updateFields.push(`capacity = $${paramCount++}`);
                updatedValues.push(villaData.capacity);
            }
            if (villaData.bathrooms !== undefined) {
                updateFields.push(`bathrooms = $${paramCount++}`);
                updatedValues.push(villaData.bathrooms);
            }
            if (villaData.rooms !== undefined) {
                updateFields.push(`rooms = $${paramCount++}`);
                updatedValues.push(villaData.rooms);
            }
            if (villaData.price !== undefined) {
                updateFields.push(`price = $${paramCount++}`);
                updatedValues.push(villaData.price);
            }
            if (villaData.images !== undefined) {
                updateFields.push(`images = $${paramCount++}`);
                updatedValues.push(JSON.stringify(villaData.images));
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            // Verificar si la villa existe
            const existingVilla = await this.getVillaById(id);
            if (!existingVilla) {
                throw new Error('Villa not found');
            }

            updatedValues.push(id);
            const query = `
                UPDATE villas 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *;
            `;

            const { rows } = await db.query(query, updatedValues);

            if (!rows || rows.length === 0) {
                throw new Error('Database error');
            }

            const updatedVilla = { ...rows[0] };
            
            // Aplicar los cambios exactos que se solicitaron
            if (villaData.price !== undefined) {
                updatedVilla.price = villaData.price;
            }
            
            if (updatedVilla.images && typeof updatedVilla.images === 'string') {
                try {
                    updatedVilla.images = JSON.parse(updatedVilla.images);
                } catch (error) {
                    console.error('Error parsing images:', error);
                    updatedVilla.images = [];
                }
            }

            return updatedVilla;
        } catch (error) {
            if ((error as Error).message === 'Villa not found' || 
                (error as Error).message === 'No valid fields to update') {
                throw error; // Reenviar errores específicos
            }
            console.error('Error updating villa:', error);
            throw new Error('Error updating villa');
        }
    }

    static async deleteVilla(id: number): Promise<{ message: string }> {
        try {
            // Primero verificar si la villa existe
            const villa = await this.getVillaById(id);
            if (!villa) {
                throw new Error('Villa not found');
            }

            const { rows } = await db.query('DELETE FROM villas WHERE id = $1 RETURNING id', [id]);
            
            if (rows.length > 0) {
                return { message: 'Villa deleted successfully' }
            } else {
                throw new Error('Villa not found')
            }
        } catch (error) {
            console.error('Error deleting villa:', error);
            if ((error as Error).message === 'Villa not found') {
                throw error; // Reenviar errores específicos
            }
            throw new Error('Error deleting villa')
        }
    }
}
