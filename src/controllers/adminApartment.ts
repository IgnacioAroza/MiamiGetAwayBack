import { Request, Response } from 'express';
import { AdminApartmentModel } from '../models/adminApartment.js';
import { validateApartment, validatePartialApartment } from '../schemas/adminApartmentSchema.js';
import { AdminApartment } from '../types/adminApartments.js';
import cloudinary from '../utils/cloudinaryConfig.js';
import path from 'path';

class AdminApartmentController {
    private static parseNumericFields(data: any): void {
        if (data.capacity) {
            data.capacity = Number(data.capacity);
        }
        if (data.pricePerNight) {
            data.pricePerNight = Number(data.pricePerNight);
        }
        if (data.cleaningFee) {
            data.cleaningFee = Number(data.cleaningFee);
        }
    }

    static async getAllApartments(req: Request, res: Response): Promise<void> {
        try {
            const apartments = await AdminApartmentModel.getAllApartments();
            res.status(200).json(apartments);
        } catch (error) {
             res.status(500).json({ error: 'Error fetching apartments' });
        }
    }

    static async getApartmentById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const apartment = await AdminApartmentModel.getApartmentById(parseInt(id));
            if (!apartment) {
                res.status(404).json({ error: 'Apartment not found' });
                return;
            }
            res.status(200).json(apartment);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching apartment' });
        }
    }

    static async createApartment(req: Request, res: Response): Promise<void> {
        // Parsear campos numéricos antes de la validación
        AdminApartmentController.parseNumericFields(req.body);
        
        const { error } = validateApartment(req.body);  
        if (error) {
            res.status(400).json({ error: JSON.parse(error.message) });
            return;
        }
        
        const apartmentData: AdminApartment = req.body;

        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const files = req.files as any[];
            const uploadPromises = files.map(file =>
                new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'adminApartments' },
                        (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    )
                    uploadStream.end(file.buffer);
                })
            );
            const images = await Promise.all(uploadPromises);
            apartmentData.images = images;
        }

        try {
            const newApartment = await AdminApartmentModel.createApartment(apartmentData);
            res.status(201).json(newApartment);
        } catch (error) {
            res.status(500).json({ error: 'Error creating apartment' });
        }
    }

    static async updateApartment(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        
        // Parsear campos numéricos antes de la validación
        AdminApartmentController.parseNumericFields(req.body);
        
        const { error } = validatePartialApartment(req.body);
        if (error) {
            res.status(400).json({ error: JSON.parse(error.message) });
            return;
        }
        
        const apartmentData: Partial<AdminApartment> = req.body;

        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const files = req.files as any[];
            const uploadPromises = files.map(file =>
                new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'adminApartments' },
                        (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    )
                    uploadStream.end(file.buffer);
                })
            );
            const images = await Promise.all(uploadPromises);
            apartmentData.images = images;
        }

        try {
            const updatedApartment = await AdminApartmentModel.updateApartment(parseInt(id), apartmentData);
            res.status(200).json(updatedApartment);
        } catch (error) {
            res.status(500).json({ error: 'Error updating apartment' });
        }
    }

    static async deleteApartment(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const apartment = await AdminApartmentModel.getApartmentById(parseInt(id));

        if (!apartment) {
            res.status(404).json({ message: 'Apartment not found' });
            return;
        }

        if (apartment.images && Array.isArray(apartment.images)) {
            const deletePromises = apartment.images.map(async (imageUrl: string) => {
                const publicId = AdminApartmentController.getPublicIdFromUrl(imageUrl);
                try {
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`Image deleted from Cloudinary: ${publicId}`);
                    }
                } catch (error: any) {
                    console.error(`Error deleting image from Cloudinary: ${error.message}`);
                }
            })  
            await Promise.all(deletePromises);
        }

        try {
            await AdminApartmentModel.deleteApartment(parseInt(id));
            res.status(200).json({ message: 'Apartment deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error deleting apartment' });
        }
    }

    static getPublicIdFromUrl(url: string): string | null {
        try {
            const parsedUrl = new URL(url)
            const pathnameParts = parsedUrl.pathname.split('/')
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1]
            const filename = path.parse(filenameWithExtension).name
            return `adminApartments/${filename}`
        } catch (error) {
            console.log('Erro parsing URL:', error)
            return null
        }
    }
}

export default AdminApartmentController;
