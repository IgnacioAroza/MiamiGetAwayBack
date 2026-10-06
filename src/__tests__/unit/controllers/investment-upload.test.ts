import { describe, it, expect, vi } from 'vitest';
import InvestmentController from '../../../controllers/investment.js';
import InvestmentModel from '../../../models/investment.js';
import ImageService from '../../../services/imageService.js';
import type { Request, Response } from 'express';

vi.mock('../../../models/investment.js', () => ({ default: {
    getById: vi.fn().mockResolvedValue({ id: 1, images: ['old.jpg'] }),
    update: vi.fn().mockResolvedValue({ id: 1, images: ['new.jpg'] })
} }));
vi.mock('../../../services/imageService.js', () => ({ default: {
    uploadImages: vi.fn().mockResolvedValue({ success: true, urls: ['new.jpg'], errors: [] }),
    deleteImages: vi.fn().mockResolvedValue({ success: true, errors: [] })
} }));
vi.mock('../../../schemas/investmentSchema.js', () => ({ validatePartialInvestment: vi.fn().mockReturnValue({ success: true }) }));

const req = { params: { id: '1' }, body: {}, files: [{}] } as unknown as Request;
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('InvestmentController reemplazo de imágenes', () => {
    it('borra imágenes anteriores después de guardar', async () => {
        await InvestmentController.update(req, response());
        expect(ImageService.deleteImages).toHaveBeenCalledWith(['old.jpg'], 'investments');
        expect(vi.mocked(InvestmentModel.update).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ImageService.deleteImages).mock.invocationCallOrder[0]);
    });
});
