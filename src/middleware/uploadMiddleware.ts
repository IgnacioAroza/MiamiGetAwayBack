import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { open } from 'node:fs/promises';
import sharp from 'sharp';
import type { RequestHandler } from 'express';

// Limita la memoria nativa de libvips: sin caché de operaciones y un solo hilo.
sharp.cache(false);
sharp.concurrency(1);

export const uploadRoot = join(tmpdir(), 'miamigetaway-uploads');
const requestDirs = new WeakMap<object, string>();
const lastFiles = new WeakMap<object, string>();
let validationTail: Promise<void> = Promise.resolve();

export class UploadValidationError extends Error {
    constructor(public code: string, public file: string, message: string) {
        super(message);
    }
}

async function validateFile(file: Express.Multer.File): Promise<void> {
    const handle = await open(file.path, 'r');
    const header = Buffer.alloc(12);
    try {
        await handle.read(header, 0, 12, 0);
    } finally {
        await handle.close();
    }
    const format = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff ? 'jpeg'
        : header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
        : header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP' ? 'webp'
        : null;
    if (!format) throw new UploadValidationError('INVALID_IMAGE', file.originalname, 'Unsupported image content');

    try {
        const image = sharp(file.path, { limitInputPixels: 24_000_000, failOn: 'truncated' });
        const metadata = await image.metadata();
        if (metadata.format !== format) throw new Error('Image signature does not match content');
        await image.resize(64).toBuffer(); // miniatura: JPEG usa shrink-on-load y aun así detecta archivos truncados
    } catch {
        throw new UploadValidationError('INVALID_IMAGE', file.originalname, 'Corrupt or oversized image');
    }
}

async function validateFiles(req: { file?: Express.Multer.File; files?: Express.Multer.File[] | { [field: string]: Express.Multer.File[] } }): Promise<void> {
    const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat();
    const previous = validationTail;
    let release!: () => void;
    validationTail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
        for (const file of files) await validateFile(file);
    } finally {
        release();
    }
}

export function lastUploadFile(req: object): string | undefined {
    return lastFiles.get(req);
}

function requestDir(req: object): string {
    let dir = requestDirs.get(req);
    if (!dir) {
        mkdirSync(uploadRoot, { recursive: true });
        dir = join(uploadRoot, randomUUID());
        mkdirSync(dir);
        requestDirs.set(req, dir);
    }
    return dir;
}

export function cleanupAbandonedUploads(): void {
    mkdirSync(uploadRoot, { recursive: true });
    for (const entry of readdirSync(uploadRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && /^[0-9a-f-]{36}$/.test(entry.name)) {
            rmSync(join(uploadRoot, entry.name), { recursive: true, force: true });
        }
    }
}

const storage = multer.diskStorage({
    destination: (req, _file, cb) => cb(null, requestDir(req)),
    filename: (_req, _file, cb) => cb(null, randomUUID())
});
const parser = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 30 },
    fileFilter: (req, file, cb) => {
        lastFiles.set(req, file.originalname);
        cb(null, true);
    }
});

function wrap(handler: RequestHandler): RequestHandler {
    return (req, res, next) => {
        let removed = false;
        const cleanup = () => {
            if (removed) return;
            removed = true;
            const dir = requestDirs.get(req);
            if (dir) {
                try {
                    rmSync(dir, { recursive: true, force: true });
                } catch (error) {
                    console.error('Error cleaning upload files:', error);
                }
                requestDirs.delete(req);
            }
            lastFiles.delete(req);
        };
        res.once('finish', cleanup);
        res.once('close', cleanup);
        handler(req, res, error => {
            if (error) return next(error);
            void validateFiles(req).then(() => next(), next);
        });
    };
}

const upload = {
    array: (field: string, maxCount: number) => wrap(parser.array(field, maxCount)),
    single: (field: string) => wrap(parser.single(field))
};

export default upload;
