import { Request, Response } from 'express'
import YachtModel from '../models/yacht.js'
import { validateYacht, validatePartialYacht } from '../schemas/yachtSchema.js'
import ImageService from '../services/imageService.js'
import { Yacht, CreateYachtDTO, UpdateYachtDTO } from '../types/index.js'
import { parsePagination, paginatedResponse } from '../utils/pagination.js'
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js'

class YachtController {
    static async getAllYachts(req: Request, res: Response): Promise<void> {
        try {
            const pagination = parsePagination(req.query);
            const { rows, total } = await YachtModel.getAll(pagination ?? undefined);
            const optimized = rows.map(yacht => {
                if (yacht.images && Array.isArray(yacht.images)) {
                    return { ...yacht, images: ImageService.optimizeForContext(yacht.images, 'list').images };
                }
                return yacht;
            });
            if (pagination) {
                ok(res, paginatedResponse(optimized, total, pagination));
            } else {
                ok(res, optimized);
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async getYachtById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const yacht = await YachtModel.getYachtById(Number(id))
            if (yacht) {
                if (yacht.images && Array.isArray(yacht.images)) {
                    const optimizedImages = ImageService.optimizeForContext(yacht.images, 'detail');
                    ok(res, {
                        ...yacht,
                        images: optimizedImages.images,
                        responsiveImages: optimizedImages.responsiveImages
                    });
                } else {
                    ok(res, yacht);
                }
            } else {
                notFound(res, 'Yacht not found')
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async createYacht(req: Request, res: Response): Promise<void> {
        try {
            const result = validateYacht(req.body);
            if (!result.success) {
                badRequest(res, JSON.parse(result.error.errors[0].message));
                return;
            }

            const yachtData = req.body as CreateYachtDTO;

            if (isNaN(Number(yachtData.capacity)) || isNaN(Number(yachtData.price))) {
                badRequest(res, 'Invalid numerical values');
                return;
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'yachts'
                });

                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }

                yachtData.images = uploadResult.urls;
            }

            const createdYacht = await YachtModel.createYacht(yachtData);
            created(res, createdYacht);
        } catch (error) {
            console.error('Error en createYacht:', error);

            if (error instanceof Error) {
                if (error.message.includes('validation')) {
                    badRequest(res, 'Validation error in yacht data');
                    return;
                }
            }

            serverError(res, 'Database error');
        }
    }

    static async updateYacht(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                badRequest(res, 'Invalid yacht ID');
                return;
            }

            const existingYacht = await YachtModel.getYachtById(id);
            if (!existingYacht) {
                notFound(res, 'Yacht not found');
                return;
            }

            const validationResult = validatePartialYacht(req.body);
            if (!validationResult.success) {
                badRequest(res, 'Validation failed', validationResult.error.format());
                return;
            }
            const yachtData: any = { ...validationResult.data };

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'yachts'
                });

                if (!uploadResult.success) {
                    badRequest(res, 'Error uploading images', uploadResult.errors);
                    return;
                }

                if (existingYacht && existingYacht.images) {
                    yachtData.images = [...existingYacht.images, ...uploadResult.urls];
                } else {
                    yachtData.images = uploadResult.urls;
                }
            }

            const updatedYacht = await YachtModel.updateYacht(id, yachtData);
            ok(res, updatedYacht);
        } catch (error) {
            console.error('Error updating yacht:', error);

            if (error instanceof Error) {
                if (error.message === 'Yacht not found') {
                    notFound(res, 'Yacht not found');
                } else if (error.message === 'No valid fields to update') {
                    badRequest(res, 'No valid fields to update');
                } else if (error.message.includes('validation')) {
                    badRequest(res, 'Validation error in yacht data');
                } else {
                    serverError(res, error.message);
                }
                return;
            }

            serverError(res, 'Database error');
        }
    }

    static async deleteYacht(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                badRequest(res, 'Invalid yacht ID');
                return;
            }

            const yacht = await YachtModel.getYachtById(id);
            if (!yacht) {
                notFound(res, 'Yacht not found');
                return;
            }

            if (Array.isArray(yacht.images) && yacht.images.length > 0) {
                const deleteResult = await ImageService.deleteImages(yacht.images, 'yachts');

                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                }
            }

            await YachtModel.deleteYacht(id);
            ok(res, { message: 'Yacht deleted successfully' });
        } catch (error) {
            console.error('Error deleting yacht:', error);
            if (error instanceof Error && error.message === 'Yacht not found') {
                notFound(res, 'Yacht not found');
                return;
            }
            serverError(res, 'Error deleting yacht');
        }
    }
}

export default YachtController 