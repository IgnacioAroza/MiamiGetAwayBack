import db from '../utils/db_render.js';
import { Yacht, CreateYachtDTO, UpdateYachtDTO } from '../types/index.js';
import { validateYacht, validatePartialYacht } from '../schemas/yachtSchema.js';

export default class YachtModel {
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

    static async getAll(): Promise<Yacht[]> {
        try {
            const { rows } = await db.query('SELECT * FROM yachts');
            return rows.map(yacht => {
                if (typeof yacht.images === 'string') {
                    try {
                        yacht.images = this.normalizeImageArray(JSON.parse(yacht.images));
                    } catch (error) {
                        console.error('Error parsing yacht images:', error);
                        yacht.images = [];
                    }
                } else if (Array.isArray(yacht.images)) {
                    yacht.images = this.normalizeImageArray(yacht.images);
                } else {
                    yacht.images = [];
                }
                return yacht;
            });
        } catch (error) {
            console.error('Error getting all yachts:', error);
            throw new Error('Database error');
        }
    }   

    static async getYachtById(id: number): Promise<Yacht | null> {
        try {
            const { rows } = await db.query('SELECT * FROM yachts WHERE id = $1', [id]);
            if (rows.length === 0) return null;
            
            const yacht = rows[0];
            if (typeof yacht.images === 'string') {
                try {
                    yacht.images = this.normalizeImageArray(JSON.parse(yacht.images));
                } catch (error) {
                    console.error('Error parsing yacht images:', error);
                    yacht.images = [];
                }
            } else if (Array.isArray(yacht.images)) {
                yacht.images = this.normalizeImageArray(yacht.images);
            } else {
                yacht.images = [];
            }
            
            return yacht;
        } catch (error) {
            console.error('Error getting yacht by ID:', error);
            throw new Error('Database error');
        }
    }

    static async createYacht(yachtData: CreateYachtDTO): Promise<Yacht> {
        try {
            // Validar los datos de entrada
            const validateResult = validateYacht(yachtData);
            if (!validateResult.success) {
                throw new Error(validateResult.error.errors[0].message);
            }
            
            // Verificar campos requeridos explícitamente
            if (!yachtData.name) {
                throw new Error('Missing required fields');
            }

            const { name, description, capacity, price, images } = yachtData;
            const safeDescription = description || null;
            const safeImages = images || [];

            const { rows } = await db.query(
                'INSERT INTO yachts (name, description, capacity, price, images) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
                [name, safeDescription, capacity, price, JSON.stringify(safeImages)]
            );

            if (!rows || rows.length === 0) {
                throw new Error('Database error');
            }

            const createdYacht = { ...rows[0] };
            // Mantenemos la descripción original en lugar de la que devuelve la BD
            if (description) {
                createdYacht.description = description;
            }
            
            if (createdYacht.images && typeof createdYacht.images === 'string') {
                try {
                    createdYacht.images = JSON.parse(createdYacht.images);
                } catch (error) {
                    console.error('Error al parsear las imágenes:', error);
                    createdYacht.images = [];
                }
            }

            return createdYacht;
        } catch (error) {
            console.error('Error al crear el yate:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Database error');
        }
    }

    static async updateYacht(id: number, yachtData: UpdateYachtDTO): Promise<Yacht> {
        try {
            // Primero hacer la validación antes de buscar el yate
            const validateResult = validatePartialYacht(yachtData);
            if (!validateResult.success) {
                throw new Error(validateResult.error.errors[0].message);
            }

            const updateFields = [];
            const updatedValues = [];
            let paramCount = 1;

            if (yachtData.name !== undefined) {
                updateFields.push(`name = $${paramCount++}`);
                updatedValues.push(yachtData.name);
            }
            if (yachtData.description !== undefined) {
                updateFields.push(`description = $${paramCount++}`);
                updatedValues.push(yachtData.description);
            }
            if (yachtData.capacity !== undefined) {
                updateFields.push(`capacity = $${paramCount++}`);
                updatedValues.push(yachtData.capacity);
            }
            if (yachtData.price !== undefined) {
                updateFields.push(`price = $${paramCount++}`);
                updatedValues.push(yachtData.price);
            }
            if (yachtData.images !== undefined) {
                updateFields.push(`images = $${paramCount++}`);
                updatedValues.push(JSON.stringify(yachtData.images));
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            // Verificar si el yate existe
            const existingYacht = await this.getYachtById(id);
            if (!existingYacht) {
                throw new Error('Yacht not found');
            }

            updatedValues.push(id);
            const query = `
                UPDATE yachts 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *;
            `;

            const { rows } = await db.query(query, updatedValues);

            if (!rows || rows.length === 0) {
                throw new Error('Database error');
            }

            const updatedYacht = { ...rows[0] };
            
            // Aplicar los cambios exactos que se solicitaron
            if (yachtData.price !== undefined) {
                updatedYacht.price = yachtData.price;
            }
            
            // Normalizar imágenes
            if (typeof updatedYacht.images === 'string') {
                try {
                    updatedYacht.images = this.normalizeImageArray(JSON.parse(updatedYacht.images));
                } catch (error) {
                    console.error('Error parsing yacht images:', error);
                    updatedYacht.images = [];
                }
            } else if (Array.isArray(updatedYacht.images)) {
                updatedYacht.images = this.normalizeImageArray(updatedYacht.images);
            } else {
                updatedYacht.images = [];
            }

            return updatedYacht;
        } catch (error) {
            if ((error as Error).message === 'Yacht not found' || 
                (error as Error).message === 'No valid fields to update') {
                throw error; // Reenviar errores específicos
            }
            console.error('Error updating yacht:', error);
            throw new Error('Error updating yacht');
        }
    }

    static async deleteYacht(id: number): Promise<{ message: string }> {
        try {
            // Primero verificar si el yate existe
            const yacht = await this.getYachtById(id);
            if (!yacht) {
                throw new Error('Yacht not found');
            }

            const { rows } = await db.query('DELETE FROM yachts WHERE id = $1 RETURNING id', [id]);
            
            if (rows.length > 0) {
                return { message: 'Yacht deleted successfully' }
            } else {
                throw new Error('Yacht not found')
            }
        } catch (error) {
            console.error('Error deleting yacht:', error);
            if ((error as Error).message === 'Yacht not found') {
                throw error; // Reenviar errores específicos
            }
            throw new Error('Error deleting yacht')
        }
    }
}

