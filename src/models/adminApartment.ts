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
            const { rows } = await db.query('INSERT INTO admin_apartments (building_name, unit_number, distribution, description, address, capacity, price_per_night, cleaning_fee, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [
                apartmentData.buildingName,
                apartmentData.unitNumber,
                apartmentData.distribution,
                apartmentData.description,
                apartmentData.address,
                apartmentData.capacity,
                apartmentData.pricePerNight,
                apartmentData.cleaningFee,
                apartmentData.images
            ]);
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
            const { rows } = await db.query('UPDATE admin_apartments SET (building_name, unit_number, distribution, description, address, capacity, price_per_night, cleaning_fee, images) = ($1, $2, $3, $4, $5, $6, $7, $8, $9) WHERE id = $1 RETURNING *', [
                apartmentData.buildingName,
                apartmentData.unitNumber,
                apartmentData.distribution,
                apartmentData.description,
                apartmentData.address,
                apartmentData.capacity,
                apartmentData.pricePerNight,
                apartmentData.cleaningFee,
                apartmentData.images,
                id
            ]);
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
