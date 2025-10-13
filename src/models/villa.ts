import db from '../utils/db_render.js';
import { Villa, CreateVillaDTO, UpdateVillaDTO } from '../types/index.js';
import { validateVilla, validatePartialVilla } from '../schemas/villaSchema.js';

export default class VillaModel {
    /**
     * Normaliza el array de imágenes, soportando múltiples formatos:
     * - Array de strings: ['url1', 'url2']
     * - Array de objetos: [{url: 'url1', alt: 'text'}, {url: 'url2', alt: 'text'}]
     * - Mix de ambos
     */
    private static normalizeImageArray(imageData: any): string[] {
        if (!Array.isArray(imageData)) {
            return [];
        }

        return imageData
            .map((item: any) => {
                // Si es un string, devolverlo directamente
                if (typeof item === 'string') {
                    return item;
                }
                // Si es un objeto con propiedad 'url', extraer la URL
                if (typeof item === 'object' && item !== null && typeof item.url === 'string') {
                    return item.url;
                }
                // Si no es ninguno de los formatos esperados, ignorar
                return null;
            })
            .filter((url: string | null): url is string => url !== null && url.trim() !== '');
    }

    static async getAll(): Promise<Villa[]> {
        try {
            const { rows } = await db.query('SELECT * FROM villas');
            return rows.map(villa => {
                if (typeof villa.images === 'string') {
                    try {
                        villa.images = this.normalizeImageArray(JSON.parse(villa.images));
                    } catch (error) {
                        console.error('Error parsing villa images:', error);
                        villa.images = [];
                    }
                } else if (Array.isArray(villa.images)) {
                    villa.images = this.normalizeImageArray(villa.images);
                } else {
                    villa.images = [];
                }
                return villa;
            });
        } catch (error) {
            console.error('Error getting all villas:', error);
            throw new Error('Database error');
        }
    }

    static async getVillaById(id: number): Promise<Villa | null> {
        try {
            const { rows } = await db.query('SELECT * FROM villas WHERE id = $1', [id]);
            if (rows.length === 0) return null;
            
            const villa = rows[0];
            if (typeof villa.images === 'string') {
                try {
                    villa.images = this.normalizeImageArray(JSON.parse(villa.images));
                } catch (error) {
                    console.error('Error parsing villa images:', error);
                    villa.images = [];
                }
            } else if (Array.isArray(villa.images)) {
                villa.images = this.normalizeImageArray(villa.images);
            } else {
                villa.images = [];
            }
            
            return villa;
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
            
            // Normalizar imágenes
            if (typeof updatedVilla.images === 'string') {
                try {
                    updatedVilla.images = this.normalizeImageArray(JSON.parse(updatedVilla.images));
                } catch (error) {
                    console.error('Error parsing villa images:', error);
                    updatedVilla.images = [];
                }
            } else if (Array.isArray(updatedVilla.images)) {
                updatedVilla.images = this.normalizeImageArray(updatedVilla.images);
            } else {
                updatedVilla.images = [];
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
