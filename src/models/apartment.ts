import db from '../utils/db_render.js';
import { Apartment } from '../types/index.js';
import { validateApartment } from '../schemas/apartmentSchema.js';

export interface ApartmentFilters {
    minPrice?: number
    maxPrice?: number
    q?: string // free-text search over address
}

export default class ApartmentModel {
    static async getAll(filters?: ApartmentFilters): Promise<Apartment[]> {
        try {
            // Build dynamic filtering when filters are provided
            const conditions: string[] = []
            const values: any[] = []

            if (filters?.minPrice !== undefined) {
                values.push(filters.minPrice)
                conditions.push(`price >= $${values.length}`)
            }
            if (filters?.maxPrice !== undefined) {
                values.push(filters.maxPrice)
                conditions.push(`price <= $${values.length}`)
            }
            if (filters?.q) {
                values.push(`%${filters.q}%`)
                conditions.push(`address ILIKE $${values.length}`)
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
            const query = `SELECT * FROM apartments ${whereClause}`

            const { rows } = await db.query(query, values)
            return rows.map(row => this.mapDatabaseToApartment(row));
        } catch (error) {
            throw error;
        }
    }
    
    static async getApartmentById(id: number): Promise<Apartment | null> {
        try {
            const { rows } = await db.query('SELECT * FROM apartments WHERE id = $1', [id]);
            return rows.length > 0 ? this.mapDatabaseToApartment(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async createApartment(apartmentData: Apartment): Promise<Apartment> {
        const { name, description, address, capacity, bathrooms, rooms, price, unitNumber, images } = apartmentData;
        const imagesJson = JSON.stringify(images || []);

        const validateResult = validateApartment(apartmentData)

        if (!validateResult.success) {
            throw new Error(JSON.stringify(validateResult.error))
        }

        try {
            if (!name || !address || !unitNumber || capacity === undefined || bathrooms === undefined || rooms === undefined || price === undefined) {
                throw new Error('Missing required fields');
            }

            const safeDescription = description || null;
            
            const { rows } = await db.query(
                'INSERT INTO apartments (name, description, address, capacity, bathrooms, rooms, price, unit_number, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;',
                [name, safeDescription, address, capacity, bathrooms, rooms, price, unitNumber, imagesJson]
            );

            const { id, ...dataWithoutId } = apartmentData;
            return { id: rows[0].id, ...dataWithoutId, images: images || [] };
        } catch (error) {
            throw error;
        }
    }

    static async updateApartment(id: number, apartmentData: Partial<Apartment>): Promise<Apartment> {
        const { name, description, address, capacity, bathrooms, rooms, price, unitNumber, images } = apartmentData;
        const updateFields = [];
        const updatedValues = [];
        let paramCount = 1;
        
        if (name !== undefined) {
            updateFields.push(`name = $${paramCount++}`)
            updatedValues.push(name)
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramCount++}`)
            updatedValues.push(description)
        }
        if (address !== undefined) {
            updateFields.push(`address = $${paramCount++}`)
            updatedValues.push(address)
        }
        if (capacity !== undefined) {
            updateFields.push(`capacity = $${paramCount++}`)
            updatedValues.push(capacity)
        }
        if (bathrooms !== undefined) {
            updateFields.push(`bathrooms = $${paramCount++}`)
            updatedValues.push(bathrooms)
        }
        if (rooms !== undefined) {
            updateFields.push(`rooms = $${paramCount++}`)
            updatedValues.push(rooms)
        }
        if (price !== undefined) {
            updateFields.push(`price = $${paramCount++}`)
            updatedValues.push(price)
        }
        if (unitNumber !== undefined) {
            updateFields.push(`unit_number = $${paramCount++}`)
            updatedValues.push(unitNumber)
        }
        if (images !== undefined) {
            updateFields.push(`images = $${paramCount++}`)
            updatedValues.push(JSON.stringify(images))
        }
        if (updateFields.length === 0) {
            throw new Error('No valid fields to update')
        }

        try {
            updatedValues.push(id)
            const query = `UPDATE apartments SET ${updateFields.join(', ')} WHERE id = $${paramCount};`
            await db.query(query, updatedValues)
            
            const { rows } = await db.query('SELECT * FROM apartments WHERE id = $1', [id])

            if (rows.length > 0) {
                const updatedApartment = rows[0]
                if (updatedApartment.images) {
                    if (typeof updatedApartment.images === 'string') {
                        try {
                            updatedApartment.images = JSON.parse(updatedApartment.images)
                        } catch (error) {
                            console.error('Error parsing images:', error)
                            updatedApartment.images = []
                        }
                    } else if (!Array.isArray(updatedApartment.images)) {
                        updatedApartment.images = []
                    }
                }
                return this.mapDatabaseToApartment(updatedApartment);
            } else {
                throw new Error('Apartment not found')
            }
        } catch (error) {
            throw new Error('Error updating apartment')
        }
    }
    
    static async deleteApartment(id: number): Promise<{ message: string }> {
        try {
            const { rows } = await db.query('DELETE FROM apartments WHERE id = $1 RETURNING *;', [id])

            if (rows.length > 0) {
                return { message: 'Apartment deleted successfully' }
            } else {
                throw new Error('Apartment not found')
            }
        } catch (error) {
            throw new Error('Error deleting apartment');
        }
    }

    static mapDatabaseToApartment(dbApartment: any): Apartment {
        // Manejar el mapeo de snake_case a camelCase
        return {
            id: dbApartment.id,
            name: dbApartment.name,
            description: dbApartment.description,
            address: dbApartment.address,
            capacity: dbApartment.capacity,
            bathrooms: dbApartment.bathrooms,
            rooms: dbApartment.rooms,
            price: dbApartment.price,
            unitNumber: dbApartment.unit_number,
            images: Array.isArray(dbApartment.images) ? dbApartment.images : []
        };
    }
}
