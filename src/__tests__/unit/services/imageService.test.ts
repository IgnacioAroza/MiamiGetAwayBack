import { describe, it, expect, vi } from 'vitest';
import ImageService from '../../../services/imageService.js';
import cloudinary from '../../../utils/cloudinaryConfig.js';

vi.mock('../../../utils/cloudinaryConfig.js', () => ({
    default: { uploader: { upload: vi.fn(), destroy: vi.fn().mockResolvedValue({ result: 'ok' }) } }
}));

const file = (index: number) => ({ path: `/tmp/image-${index}`, originalname: `image-${index}.jpg`, size: 100, mimetype: 'application/octet-stream' }) as Express.Multer.File;
const url = (index: number) => `https://res.cloudinary.com/test/image/upload/v1/villas/image-${index}.jpg`;

describe('ImageService upload', () => {
    it('usa rutas, conserva orden y no supera 3 uploads globales', async () => {
        let active = 0;
        let peak = 0;
        vi.mocked(cloudinary.uploader.upload).mockImplementation(async (path: string) => {
            active++;
            peak = Math.max(peak, active);
            const index = Number(path.split('-').at(-1));
            await new Promise(resolve => setTimeout(resolve, 2 + (index % 3)));
            active--;
            return { secure_url: url(index) } as any;
        });
        const [first, second] = await Promise.all([
            ImageService.uploadImages(Array.from({ length: 30 }, (_, index) => file(index)), { entityType: 'villas' }),
            ImageService.uploadImages(Array.from({ length: 30 }, (_, index) => file(index + 30)), { entityType: 'villas' })
        ]);
        expect(peak).toBeLessThanOrEqual(3);
        expect(first.success && second.success).toBe(true);
        expect(first.urls).toEqual(Array.from({ length: 30 }, (_, index) => url(index)));
        expect(second.urls).toEqual(Array.from({ length: 30 }, (_, index) => url(index + 30)));
        expect(cloudinary.uploader.upload).toHaveBeenCalledWith('/tmp/image-0', expect.objectContaining({ folder: 'villas' }));
    });

    it('borra los éxitos y detalla cada imagen fallida', async () => {
        vi.mocked(cloudinary.uploader.upload).mockImplementation(async (path: string) => {
            const index = Number(path.split('-').at(-1));
            if (index === 1 || index === 3) throw new Error('timeout');
            return { secure_url: url(index) } as any;
        });
        const result = await ImageService.uploadImages(Array.from({ length: 4 }, (_, index) => file(index)), { entityType: 'villas' });
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('image-1.jpg'), expect.stringContaining('image-3.jpg')]));
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('villas/image-0');
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('villas/image-2');
    });
});
