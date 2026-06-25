import { Request, Response } from 'express'
import VillaModel from '../models/villa.js'
import { validateVilla, validatePartialVilla } from '../schemas/villaSchema.js'
import ImageService from '../services/imageService.js'
import { CreateVillaDTO } from '../types/index.js'
import { parsePagination, paginatedResponse } from '../utils/pagination.js'
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js'

class VillaController {
    static async getAllVillas(req: Request, res: Response): Promise<void> {
        try {
            const pagination = parsePagination(req.query);
            const { rows, total } = await VillaModel.getAll(pagination ?? undefined);
            const optimized = rows.map(villa => {
                if (villa.images && Array.isArray(villa.images)) {
                    return { ...villa, images: ImageService.optimizeForContext(villa.images, 'list').images };
                }
                return villa;
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

    static async getVillaById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(Number(id))
            if (villa) {
                if (villa.images && Array.isArray(villa.images)) {
                    const optimizedImages = ImageService.optimizeForContext(villa.images, 'detail');
                    ok(res, {
                        ...villa,
                        images: optimizedImages.images,
                        responsiveImages: optimizedImages.responsiveImages
                    });
                } else {
                    ok(res, villa);
                }
            } else {
                notFound(res, 'Villa not found')
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async createVilla(req: Request, res: Response): Promise<void> {
        try {
            const result = validateVilla(req.body);
            if (!result.success) {
                badRequest(res, 'Missing required fields');
                return;
            }

            const villaData = req.body as CreateVillaDTO;

            if (isNaN(Number(villaData.capacity)) ||
                isNaN(Number(villaData.bathrooms)) ||
                isNaN(Number(villaData.rooms)) ||
                isNaN(Number(villaData.price))) {
                badRequest(res, 'Invalid numerical values');
                return;
            }

            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadResult = await ImageService.uploadImages(files, {
                        entityType: 'villas'
                    });

                    if (!uploadResult.success) {
                        badRequest(res, 'Error uploading images', uploadResult.errors);
                        return;
                    }

                    villaData.images = uploadResult.urls;
                }
            }

            const createdVilla = await VillaModel.createVilla(villaData);
            created(res, createdVilla);
        } catch (error) {
            console.error('Error en createVilla:', error);

            if (error instanceof Error) {
                if (error.message.includes('validation')) {
                    badRequest(res, 'Validation error in villa data');
                    return;
                }
            }

            serverError(res, 'Database error');
        }
    }

    static async updateVilla(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                badRequest(res, 'Invalid villa ID');
                return;
            }

            const existingVilla = await VillaModel.getVillaById(id);
            if (!existingVilla) {
                notFound(res, 'Villa not found');
                return;
            }

            const validationResult = validatePartialVilla(req.body);
            if (!validationResult.success) {
                badRequest(res, 'Validation failed', validationResult.error.format());
                return;
            }
            const villaData: any = { ...validationResult.data };

            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadResult = await ImageService.uploadImages(files, {
                        entityType: 'villas'
                    });

                    if (!uploadResult.success) {
                        badRequest(res, 'Error uploading images', uploadResult.errors);
                        return;
                    }

                    if (existingVilla && existingVilla.images) {
                        villaData.images = [...existingVilla.images, ...uploadResult.urls];
                    } else {
                        villaData.images = uploadResult.urls;
                    }
                }
            }

            const updatedVilla = await VillaModel.updateVilla(id, villaData);
            ok(res, updatedVilla);
        } catch (error) {
            console.error('Error updating villa:', error);

            if (error instanceof Error) {
                if (error.message === 'Villa not found') {
                    notFound(res, 'Villa not found');
                } else if (error.message === 'No valid fields to update') {
                    badRequest(res, 'No valid fields to update');
                } else if (error.message.includes('validation')) {
                    badRequest(res, 'Validation error in villa data');
                } else {
                    serverError(res, error.message);
                }
                return;
            }

            serverError(res, 'Database error');
        }
    }

    static async deleteVilla(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                badRequest(res, 'Invalid villa ID');
                return;
            }

            const villa = await VillaModel.getVillaById(id);
            if (!villa) {
                notFound(res, 'Villa not found');
                return;
            }

            if (Array.isArray(villa.images) && villa.images.length > 0) {
                const deleteResult = await ImageService.deleteImages(villa.images, 'villas');

                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                }
            }

            await VillaModel.deleteVilla(id);
            ok(res, { message: 'Villa deleted successfully' });
        } catch (error) {
            console.error('Error deleting villa:', error);
            if (error instanceof Error && error.message === 'Villa not found') {
                notFound(res, 'Villa not found');
                return;
            }
            serverError(res, 'Error deleting villa');
        }
    }
}

export default VillaController 