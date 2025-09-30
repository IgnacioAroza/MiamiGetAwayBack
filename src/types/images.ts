/**
 * Tipos específicos para el servicio de imágenes
 */

// Tipos base para imágenes
export interface ImageUploadResult {
    success: boolean;
    urls: string[];
    errors: string[];
    metadata?: {
        uploadedCount: number;
        totalFiles: number;
        totalSize: number;
    };
}

export interface ImageDeleteResult {
    success: boolean;
    deletedCount: number;
    errors: string[];
    skippedUrls?: string[];
}

export interface ImageValidationError {
    fileIndex: number;
    fileName: string;
    errors: string[];
}

export interface ImageTransformation {
    width?: number;
    height?: number;
    crop?: 'scale' | 'fit' | 'limit' | 'mfit' | 'fill' | 'lfill' | 'pad' | 'lpad' | 'mpad' | 'crop' | 'thumb' | 'imagga_crop' | 'imagga_scale';
    quality?: number | 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low';
    format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif' | 'gif';
    fetch_format?: 'auto';
    gravity?: 'auto' | 'center' | 'north' | 'south' | 'east' | 'west' | 'north_east' | 'north_west' | 'south_east' | 'south_west' | 'face' | 'faces';
    background?: string;
    radius?: number | 'max';
    border?: string;
    effect?: string;
    color?: string;
    angle?: number;
    opacity?: number;
    overlay?: string;
    underlay?: string;
}

export interface CloudinaryUploadOptions {
    folder: string;
    public_id?: string;
    use_filename?: boolean;
    unique_filename?: boolean;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    type?: 'upload' | 'private' | 'authenticated';
    access_mode?: 'public' | 'authenticated';
    tags?: string[];
    context?: Record<string, string>;
    metadata?: Record<string, string>;
    transformation?: ImageTransformation;
}

// Tipos para entidades específicas
export type EntityType = 'apartments' | 'cars' | 'villas' | 'yachts';

export interface EntityImageConfig {
    folder: string;
    maxFiles: number;
    maxFileSize: number;
    allowedFormats: string[];
    transformations?: ImageTransformation;
    presets?: {
        thumbnail?: ImageTransformation;
        medium?: ImageTransformation;
        large?: ImageTransformation;
    };
}

// Extensión de los tipos de Express para Multer
declare global {
    namespace Express {
        interface MulterFile {
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            destination?: string;
            filename?: string;
            path?: string;
            buffer: Buffer;
        }
    }
}

// Respuestas específicas para endpoints
export interface ImageUploadResponse {
    success: boolean;
    message: string;
    data?: {
        urls: string[];
        count: number;
    };
    errors?: string[];
}

export interface ImageDeleteResponse {
    success: boolean;
    message: string;
    data?: {
        deletedCount: number;
        totalRequested: number;
    };
    errors?: string[];
}

// Eventos para logging y monitoreo
export interface ImageEvent {
    type: 'upload' | 'delete' | 'validation_error' | 'upload_error' | 'delete_error';
    entityType: EntityType;
    entityId?: number;
    timestamp: Date;
    metadata: {
        fileCount?: number;
        totalSize?: number;
        urls?: string[];
        errors?: string[];
        userId?: string;
        userAgent?: string;
        ip?: string;
    };
}

// Configuración avanzada del servicio
export interface ImageServiceConfig {
    enableLogging: boolean;
    enableMetrics: boolean;
    retryAttempts: number;
    retryDelay: number;
    parallelUploads: boolean;
    maxParallelUploads: number;
    enableImageOptimization: boolean;
    enableWebpGeneration: boolean;
    enableThumbnailGeneration: boolean;
}

// Métricas del servicio
export interface ImageServiceMetrics {
    totalUploads: number;
    totalDeletes: number;
    successfulUploads: number;
    failedUploads: number;
    successfulDeletes: number;
    failedDeletes: number;
    totalBandwidthUsed: number;
    averageUploadTime: number;
    averageFileSize: number;
    lastReset: Date;
}

export { ImageTransformation as CloudinaryTransformation };