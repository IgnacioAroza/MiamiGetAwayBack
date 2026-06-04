import { Request, Response } from 'express';
import TransferModel from '../models/transfer.js';
import { validateVehicle, validatePartialVehicle, validateInquiry, validateInquiryStatus } from '../schemas/transferSchema.js';
import ImageService from '../services/imageService.js';
import EmailService from '../services/emailService.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';

export default class TransferController {
    // Vehicles
    static async getAllVehicles(req: Request, res: Response): Promise<void> {
        try {
            const vehicles = await TransferModel.getAllVehicles();
            const result = vehicles.map(v => {
                if (v.images && Array.isArray(v.images)) {
                    return { ...v, images: ImageService.optimizeForContext(v.images, 'list').images };
                }
                return v;
            });
            ok(res, result);
        } catch (error: any) {
            serverError(res, 'Error fetching vehicles');
        }
    }

    static async getVehicleById(req: Request, res: Response): Promise<void> {
        try {
            const vehicle = await TransferModel.getVehicleById(Number(req.params.id));
            if (!vehicle) {
                notFound(res, 'Vehicle not found');
                return;
            }
            if (vehicle.images && Array.isArray(vehicle.images)) {
                const optimized = ImageService.optimizeForContext(vehicle.images, 'detail');
                ok(res, { ...vehicle, images: optimized.images, responsiveImages: optimized.responsiveImages });
            } else {
                ok(res, vehicle);
            }
        } catch (error: any) {
            serverError(res, 'Error fetching vehicle');
        }
    }

    static async createVehicle(req: Request, res: Response): Promise<void> {
        try {
            const data = {
                name: req.body.name,
                category: req.body.category,
                capacity: req.body.capacity,
                luggage_capacity: req.body.luggage_capacity,
                description: req.body.description || null,
                images: [],
            };

            const result = validateVehicle(data);
            if (!result.success) {
                badRequest(res, 'Invalid vehicle data', result.error.flatten());
                return;
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, { entityType: 'transfers' });
                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }
                data.images = uploadResult.urls as never[];
            }

            const vehicle = await TransferModel.createVehicle(data);
            created(res, vehicle);
        } catch (error: any) {
            console.error('Error in createVehicle:', error);
            serverError(res, 'Error creating vehicle');
        }
    }

    static async updateVehicle(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const data: any = {};

            if (req.body.name !== undefined)             data.name = req.body.name;
            if (req.body.category !== undefined)         data.category = req.body.category;
            if (req.body.capacity !== undefined && req.body.capacity !== '') data.capacity = req.body.capacity;
            if (req.body.luggage_capacity !== undefined && req.body.luggage_capacity !== '') data.luggage_capacity = req.body.luggage_capacity;
            if (req.body.description !== undefined)      data.description = req.body.description || null;

            const result = validatePartialVehicle(data);
            if (!result.success) {
                badRequest(res, 'Invalid vehicle data', result.error.flatten());
                return;
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, { entityType: 'transfers' });
                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }
                data.images = uploadResult.urls;
            }

            const vehicle = await TransferModel.updateVehicle(id, data);
            ok(res, vehicle);
        } catch (error: any) {
            if (error.message === 'Vehicle not found') {
                notFound(res, 'Vehicle not found');
            } else {
                console.error('Error in updateVehicle:', error);
                serverError(res, 'Error updating vehicle');
            }
        }
    }

    static async deleteVehicle(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const vehicle = await TransferModel.getVehicleById(id);
            if (!vehicle) {
                notFound(res, 'Vehicle not found');
                return;
            }

            if (vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0) {
                const deleteResult = await ImageService.deleteImages(vehicle.images, 'transfers');
                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Some vehicle images could not be deleted:', deleteResult.errors);
                }
            }

            await TransferModel.deleteVehicle(id);
            ok(res, { message: 'Vehicle and associated images deleted successfully' });
        } catch (error: any) {
            console.error('Error in deleteVehicle:', error);
            serverError(res, 'Error deleting vehicle');
        }
    }

    // Inquiries
    static async createInquiry(req: Request, res: Response): Promise<void> {
        try {
            const data = {
                vehicle_id: req.body.vehicle_id !== undefined ? req.body.vehicle_id : null,
                pick_up: req.body.pick_up,
                drop_off: req.body.drop_off,
                date: req.body.date,
                time: req.body.time,
                passengers: req.body.passengers,
                luggage_large: req.body.luggage_large,
                luggage_medium: req.body.luggage_medium,
                luggage_carry_on: req.body.luggage_carry_on,
                service_type: req.body.service_type,
                client_name: req.body.client_name,
                client_email: req.body.client_email,
                client_phone: req.body.client_phone,
                notes: req.body.notes || null,
            };

            const result = validateInquiry(data);
            if (!result.success) {
                badRequest(res, 'Invalid inquiry data', result.error.flatten());
                return;
            }

            const inquiry = await TransferModel.createInquiry(result.data);
            created(res, inquiry);

            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                EmailService.sendTransferInquiryNotification(adminEmail, inquiry).catch(err =>
                    console.error('Error sending transfer inquiry notification email:', err)
                );
            }
        } catch (error: any) {
            console.error('Error in createTransferInquiry:', error);
            serverError(res, 'Error creating inquiry');
        }
    }

    static async getAllInquiries(req: Request, res: Response): Promise<void> {
        try {
            const inquiries = await TransferModel.getAllInquiries();
            ok(res, inquiries);
        } catch (error: any) {
            serverError(res, 'Error fetching inquiries');
        }
    }

    static async updateInquiryStatus(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const result = validateInquiryStatus(req.body);
            if (!result.success) {
                badRequest(res, 'Invalid status', result.error.flatten());
                return;
            }

            const inquiry = await TransferModel.updateInquiryStatus(id, result.data.status);
            ok(res, inquiry);
        } catch (error: any) {
            if (error.message === 'Inquiry not found') {
                notFound(res, 'Inquiry not found');
            } else {
                console.error('Error in updateInquiryStatus:', error);
                serverError(res, 'Error updating inquiry status');
            }
        }
    }
}
