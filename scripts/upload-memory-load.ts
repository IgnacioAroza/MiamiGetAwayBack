import express from 'express';
import multer from 'multer';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import db from '../src/utils/db_render.js';
import cloudinary from '../src/utils/cloudinaryConfig.js';
import ImageService from '../src/services/imageService.js';
import upload, { cleanupAbandonedUploads } from '../src/middleware/uploadMiddleware.js';

if (process.env.NODE_ENV !== 'test' || process.env.HOST !== 'mga-postgres' || process.env.CLOUDINARY_CLOUD_NAME !== 'test') {
    throw new Error('Load harness requires isolated local PostgreSQL and simulated Cloudinary');
}

cloudinary.uploader.upload = (async (path: string) => {
    let bytes = 0;
    for await (const chunk of createReadStream(path)) bytes += chunk.length;
    if (bytes !== 10 * 1024 * 1024) throw new Error(`Unexpected file size: ${bytes}`);
    return { secure_url: `https://res.cloudinary.com/test/image/upload/v1/villas/${randomUUID()}.jpg` };
}) as typeof cloudinary.uploader.upload;
cloudinary.uploader.destroy = (async () => ({ result: 'ok' })) as typeof cloudinary.uploader.destroy;

cleanupAbandonedUploads();
await db.query('CREATE TABLE IF NOT EXISTS upload_load (id serial PRIMARY KEY, image_count integer NOT NULL)');
let peakRss = process.memoryUsage().rss;
setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 20).unref();

const app = express();
app.post('/load', upload.array('images', 30), async (req, res, next) => {
    try {
        const files = req.files as Express.Multer.File[];
        const result = await ImageService.uploadImages(files, { entityType: 'villas' });
        if (!result.success) return res.status(500).json(result);
        await db.query('INSERT INTO upload_load (image_count) VALUES ($1)', [result.urls.length]);
        res.json({ images: result.urls.length });
    } catch (error) {
        next(error);
    }
});
app.get('/metrics', async (_req, res) => {
    const { rows } = await db.query('SELECT COUNT(*)::int AS requests, SUM(image_count)::int AS images FROM upload_load');
    res.json({ peakRss, rss: process.memoryUsage().rss, ...rows[0] });
});
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof multer.MulterError ? 400 : 500).json({ error: error.message });
});
app.listen(3002, '0.0.0.0', () => console.log('load harness ready'));
