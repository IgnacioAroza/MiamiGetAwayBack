import db from '../utils/db_render.js';
import { AdminApartment } from '../types/adminApartments.js';
import { validateApartment, validatePartialApartment } from '../schemas/adminApartmentSchema.js';

export class AdminApartmentModel {
    static async getAllApartments(): Promise<AdminApartment[]> {
        try {
            const { rows } = await db.query('SELECT * FROM admin_apartments');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getApartmentById(id: number): Promise<AdminApartment | null> {
        try {
            const { rows } = await db.query('SELECT * FROM admin_apartments WHERE id = $1', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async createApartment(apartmentData: AdminApartment): Promise<AdminApartment> {
        const validateResult = validateApartment(apartmentData);
        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            const imagesJson = JSON.stringify(apartmentData.images || []);
            
            const { rows } = await db.query('INSERT INTO admin_apartments (building_name, unit_number, distribution, description, address, capacity, price_per_night, cleaning_fee, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [
                apartmentData.buildingName,
                apartmentData.unitNumber,
                apartmentData.distribution,
                apartmentData.description,
                apartmentData.address,
                apartmentData.capacity,
                apartmentData.pricePerNight,
                apartmentData.cleaningFee,
                imagesJson
            ]);
            
            if (rows[0] && rows[0].images) {
                try {
                    if (typeof rows[0].images === 'string') {
                        rows[0].images = JSON.parse(rows[0].images);
                    }
                } catch (error) {
                    rows[0].images = [];
                }
            }
            
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateApartment(id: number, apartmentData: Partial<AdminApartment>): Promise<AdminApartment> {
        const validateResult = validatePartialApartment(apartmentData);
        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error));
        }

        try {
            // Convertir imágenes a JSON si existen
            const imagesJson = apartmentData.images ? JSON.stringify(apartmentData.images) : undefined;
            
            // Construir la consulta dinámica
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            
            // Manejar cada campo posible
            if (apartmentData.buildingName !== undefined) {
                updateFields.push(`building_name = $${paramIndex}`);
                values.push(apartmentData.buildingName);
                paramIndex++;
            }
            
            if (apartmentData.unitNumber !== undefined) {
                updateFields.push(`unit_number = $${paramIndex}`);
                values.push(apartmentData.unitNumber);
                paramIndex++;
            }
            
            if (apartmentData.distribution !== undefined) {
                updateFields.push(`distribution = $${paramIndex}`);
                values.push(apartmentData.distribution);
                paramIndex++;
            }
            
            if (apartmentData.description !== undefined) {
                updateFields.push(`description = $${paramIndex}`);
                values.push(apartmentData.description);
                paramIndex++;
            }
            
            if (apartmentData.address !== undefined) {
                updateFields.push(`address = $${paramIndex}`);
                values.push(apartmentData.address);
                paramIndex++;
            }
            
            if (apartmentData.capacity !== undefined) {
                updateFields.push(`capacity = $${paramIndex}`);
                values.push(apartmentData.capacity);
                paramIndex++;
            }
            
            if (apartmentData.pricePerNight !== undefined) {
                updateFields.push(`price_per_night = $${paramIndex}`);
                values.push(apartmentData.pricePerNight);
                paramIndex++;
            }
            
            if (apartmentData.cleaningFee !== undefined) {
                updateFields.push(`cleaning_fee = $${paramIndex}`);
                values.push(apartmentData.cleaningFee);
                paramIndex++;
            }
            
            if (imagesJson !== undefined) {
                updateFields.push(`images = $${paramIndex}`);
                values.push(imagesJson);
                paramIndex++;
            }
            
            // Si no hay campos para actualizar, devolver error
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            
            // Añadir ID como último parámetro
            values.push(id);
            
            const query = `UPDATE admin_apartments SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
            
            const { rows } = await db.query(query, values);
            
            // Procesar imágenes en la respuesta
            if (rows[0] && rows[0].images) {
                try {
                    if (typeof rows[0].images === 'string') {
                        rows[0].images = JSON.parse(rows[0].images);
                    }
                } catch (error) {
                    rows[0].images = [];
                }
            }
            
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async deleteApartment(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM admin_apartments WHERE id = $1 RETURNING *', [id]);
            if (rows.length === 0) {
                throw new Error('Apartment not found');
            }
            return { message: 'Apartment deleted successfully' };
        } catch (error) {
            throw error;
        }
    }
}
