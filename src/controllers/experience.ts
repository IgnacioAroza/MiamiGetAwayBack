import { Request, Response } from 'express';
import ExperienceModel from '../models/experience.js';
import { validateExperience, validatePartialExperience, validateInquiry, validateInquiryStatus } from '../schemas/experienceSchema.js';
import ImageService from '../services/imageService.js';
import EmailService from '../services/emailService.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

export default class ExperienceController {
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const pagination = parsePagination(req.query);
            const { rows, total } = await ExperienceModel.getAll(pagination ?? undefined);
            const result = rows.map(exp => {
                if (exp.images && Array.isArray(exp.images)) {
                    return { ...exp, images: ImageService.optimizeForContext(exp.images, 'list').images };
                }
                return exp;
            });
            if (pagination) {
                ok(res, paginatedResponse(result, total, pagination));
            } else {
                ok(res, result);
            }
        } catch (error: any) {
            serverError(res, 'Error fetching experiences');
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const experience = await ExperienceModel.getById(Number(req.params.id));
            if (!experience) {
                notFound(res, 'Experience not found');
                return;
            }
            if (experience.images && Array.isArray(experience.images)) {
                const optimized = ImageService.optimizeForContext(experience.images, 'detail');
                ok(res, { ...experience, images: optimized.images, responsiveImages: optimized.responsiveImages });
            } else {
                ok(res, experience);
            }
        } catch (error: any) {
            serverError(res, 'Error fetching experience');
        }
    }

    static async create(req: Request, res: Response): Promise<void> {
        try {
            const data = {
                title: req.body.title,
                description: req.body.description || null,
                capacity: req.body.capacity !== undefined ? req.body.capacity : null,
                price: req.body.price !== undefined ? req.body.price : null,
                images: [],
            };

            const result = validateExperience(data);
            if (!result.success) {
                badRequest(res, 'Invalid experience data', result.error.flatten());
                return;
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, { entityType: 'experiences' });
                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }
                data.images = uploadResult.urls as never[];
            }

            const experience = await ExperienceModel.create(data);
            created(res, experience);
        } catch (error: any) {
            console.error('Error in createExperience:', error);
            serverError(res, 'Error creating experience');
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const data: any = {};

            if (req.body.title !== undefined)       data.title = req.body.title;
            if (req.body.description !== undefined) data.description = req.body.description || null;
            if (req.body.capacity !== undefined && req.body.capacity !== '') data.capacity = req.body.capacity;
            if (req.body.price !== undefined)       data.price = req.body.price !== '' ? req.body.price : null;

            const result = validatePartialExperience(data);
            if (!result.success) {
                badRequest(res, 'Invalid experience data', result.error.flatten());
                return;
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, { entityType: 'experiences' });
                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }
                data.images = uploadResult.urls;
            }

            const experience = await ExperienceModel.update(id, data);
            ok(res, experience);
        } catch (error: any) {
            if (error.message === 'Experience not found') {
                notFound(res, 'Experience not found');
            } else {
                console.error('Error in updateExperience:', error);
                serverError(res, 'Error updating experience');
            }
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const experience = await ExperienceModel.getById(id);
            if (!experience) {
                notFound(res, 'Experience not found');
                return;
            }

            if (experience.images && Array.isArray(experience.images) && experience.images.length > 0) {
                const deleteResult = await ImageService.deleteImages(experience.images, 'experiences');
                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Some experience images could not be deleted:', deleteResult.errors);
                }
            }

            await ExperienceModel.delete(id);
            ok(res, { message: 'Experience and associated images deleted successfully' });
        } catch (error: any) {
            console.error('Error in deleteExperience:', error);
            serverError(res, 'Error deleting experience');
        }
    }

    // Inquiries
    static async createInquiry(req: Request, res: Response): Promise<void> {
        try {
            const data = {
                experience_id: req.body.experience_id !== undefined ? req.body.experience_id : null,
                name: req.body.name,
                lastname: req.body.lastname,
                email: req.body.email,
                phone: req.body.phone || null,
            };

            const result = validateInquiry(data);
            if (!result.success) {
                badRequest(res, 'Invalid inquiry data', result.error.flatten());
                return;
            }

            const inquiry = await ExperienceModel.createInquiry(result.data);
            created(res, inquiry);

            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                EmailService.sendExperienceInquiryNotification(adminEmail, inquiry).catch(err =>
                    console.error('Error sending inquiry notification email:', err)
                );
            }
        } catch (error: any) {
            console.error('Error in createInquiry:', error);
            serverError(res, 'Error creating inquiry');
        }
    }

    static async getAllInquiries(req: Request, res: Response): Promise<void> {
        try {
            const pagination = parsePagination(req.query);
            const { rows, total } = await ExperienceModel.getAllInquiries(pagination ?? undefined);
            if (pagination) {
                ok(res, paginatedResponse(rows, total, pagination));
            } else {
                ok(res, rows);
            }
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

            const inquiry = await ExperienceModel.updateInquiryStatus(id, result.data.status);
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
