import { Request, Response } from 'express';
import InvestmentModel from '../models/investment.js';
import { validateInvestment, validatePartialInvestment } from '../schemas/investmentSchema.js';
import ImageService from '../services/imageService.js';

export default class InvestmentController {
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const investments = await InvestmentModel.getAll();
            const result = investments.map(inv => {
                if (inv.images && Array.isArray(inv.images)) {
                    return { ...inv, images: ImageService.optimizeForContext(inv.images, 'list').images };
                }
                return inv;
            });
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: 'Error fetching investments' });
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const investment = await InvestmentModel.getById(Number(req.params.id));
            if (!investment) {
                res.status(404).json({ message: 'Investment not found' });
                return;
            }
            if (investment.images && Array.isArray(investment.images)) {
                const optimized = ImageService.optimizeForContext(investment.images, 'detail');
                res.status(200).json({ ...investment, images: optimized.images, responsiveImages: optimized.responsiveImages });
            } else {
                res.status(200).json(investment);
            }
        } catch (error: any) {
            res.status(500).json({ error: 'Error fetching investment' });
        }
    }

    static async create(req: Request, res: Response): Promise<void> {
        try {
            const data = {
                name: req.body.name,
                unit_number: req.body.unit_number || null,
                address: req.body.address,
                description: req.body.description || null,
                bathrooms: req.body.bathrooms,
                rooms: req.body.rooms,
                price: req.body.price !== undefined ? req.body.price : null,
                images: [],
            };

            const result = validateInvestment(data);
            if (!result.success) {
                res.status(400).json({ message: 'Invalid investment data', errors: result.error.flatten() });
                return;
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, { entityType: 'investments' });
                if (!uploadResult.success) {
                    res.status(400).json({ error: 'Error uploading images', details: uploadResult.errors });
                    return;
                }
                data.images = uploadResult.urls as never[];
            }

            const investment = await InvestmentModel.create(data);
            res.status(201).json(investment);
        } catch (error: any) {
            console.error('Error in createInvestment:', error);
            res.status(500).json({ error: 'Error creating investment' });
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const data: any = {};

            if (req.body.name !== undefined)                              data.name = req.body.name;
            if (req.body.unit_number !== undefined)                       data.unit_number = req.body.unit_number || null;
            if (req.body.address !== undefined)                           data.address = req.body.address;
            if (req.body.description !== undefined)                       data.description = req.body.description || null;
            if (req.body.bathrooms !== undefined && req.body.bathrooms !== '') data.bathrooms = req.body.bathrooms;
            if (req.body.rooms !== undefined && req.body.rooms !== '')        data.rooms = req.body.rooms;
            if (req.body.price !== undefined)                             data.price = req.body.price !== '' ? req.body.price : null;

            const result = validatePartialInvestment(data);
            if (!result.success) {
                res.status(400).json({ message: 'Invalid investment data', errors: result.error.flatten() });
                return;
            }

            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, { entityType: 'investments' });
                if (!uploadResult.success) {
                    res.status(400).json({ error: 'Error uploading images', details: uploadResult.errors });
                    return;
                }
                data.images = uploadResult.urls;
            }

            const investment = await InvestmentModel.update(id, data);
            res.status(200).json(investment);
        } catch (error: any) {
            if (error.message === 'Investment not found') {
                res.status(404).json({ message: 'Investment not found' });
            } else {
                console.error('Error in updateInvestment:', error);
                res.status(500).json({ error: 'Error updating investment' });
            }
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const investment = await InvestmentModel.getById(id);
            if (!investment) {
                res.status(404).json({ message: 'Investment not found' });
                return;
            }

            if (investment.images && Array.isArray(investment.images) && investment.images.length > 0) {
                const deleteResult = await ImageService.deleteImages(investment.images, 'investments');
                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Some investment images could not be deleted:', deleteResult.errors);
                }
            }

            await InvestmentModel.delete(id);
            res.status(200).json({ message: 'Investment and associated images deleted successfully' });
        } catch (error: any) {
            console.error('Error in deleteInvestment:', error);
            res.status(500).json({ error: 'Error deleting investment' });
        }
    }
}
