import { describe, it, expect } from 'vitest';
import express from 'express';
import multer from 'multer';
import request from 'supertest';
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import upload, { uploadRoot } from '../../../middleware/uploadMiddleware.js';

const app = express();
app.post('/images', upload.array('images', 2), (req, res) => res.json({ paths: (req.files as Express.Multer.File[]).map(file => file.path) }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ code: error instanceof Error && 'code' in error ? error.code : 'ERROR' });
});

describe('uploadMiddleware', () => {
    it('guarda en disco y limpia al terminar', async () => {
        const image = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer();
        const response = await request(app).post('/images').attach('images', image, 'one.png');
        expect(response.status).toBe(200);
        expect(response.body.paths[0]).toContain(uploadRoot);
        expect(readdirSync(uploadRoot)).toEqual([]);
    });

    it('rechaza un archivo mayor de 10 MiB y limpia', async () => {
        const response = await request(app).post('/images').attach('images', Buffer.alloc(10 * 1024 * 1024 + 1), 'big.jpg');
        expect(response.status).toBe(400);
        expect(response.body.code).toBe('LIMIT_FILE_SIZE');
        expect(readdirSync(uploadRoot)).toEqual([]);
    });

    it('respeta el máximo de archivos por ruta y limpia', async () => {
        const call = request(app).post('/images');
        for (let i = 0; i < 3; i++) call.attach('images', Buffer.from('x'), `${i}.jpg`);
        const response = await call;
        expect(response.status).toBe(400);
        expect(response.body.code).toBe('LIMIT_UNEXPECTED_FILE');
        expect(readdirSync(uploadRoot)).toEqual([]);
    });

    it('rechaza contenido falso aunque declare image/jpeg', async () => {
        const response = await request(app).post('/images').attach('images', Buffer.from('not an image'), { filename: 'fake.jpg', contentType: 'image/jpeg' });
        expect(response.status).toBe(400);
        expect(response.body.code).toBe('INVALID_IMAGE');
        expect(readdirSync(uploadRoot)).toEqual([]);
    });

    it('rechaza imagen truncada', async () => {
        const response = await request(app).post('/images').attach('images', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'broken.jpg');
        expect(response.status).toBe(400);
        expect(response.body.code).toBe('INVALID_IMAGE');
        expect(readdirSync(uploadRoot)).toEqual([]);
    });

    it('acepta WebP válido aunque declare otro MIME', async () => {
        const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).webp().toBuffer();
        const response = await request(app).post('/images').attach('images', image, { filename: 'image.bin', contentType: 'application/octet-stream' });
        expect(response.status).toBe(200);
        expect(readdirSync(uploadRoot)).toEqual([]);
    });

    it('rechaza GIF aunque declare image/png', async () => {
        const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).gif().toBuffer();
        const response = await request(app).post('/images').attach('images', image, { filename: 'image.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(response.body.code).toBe('INVALID_IMAGE');
    });
});
