/**
 * Utilidades para el manejo de imágenes
 */

export interface ImageConfig {
    folder: string;
    maxFiles: number;
    maxFileSize: number; // en bytes
    allowedFormats: string[];
    transformations?: {
        width?: number;
        height?: number;
        quality?: number;
        format?: string;
    };
}

export interface ImageValidationResult {
    isValid: boolean;
    errors: string[];
}

// Configuraciones por tipo de entidad
export const IMAGE_CONFIGS: Record<string, ImageConfig> = {
    apartments: {
        folder: 'apartments',
        maxFiles: 30,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        transformations: {
            quality: 85
        }
    },
    cars: {
        folder: 'cars',
        maxFiles: 20,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        transformations: {
            quality: 85
        }
    },
    villas: {
        folder: 'villas',
        maxFiles: 50,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        transformations: {
            quality: 85
        }
    },
    yachts: {
        folder: 'yachts',
        maxFiles: 40,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        transformations: {
            quality: 85
        }
    }
};

// Tipos de transformaciones disponibles
export const TRANSFORMATION_PRESETS = {
    thumbnail: {
        width: 300,
        height: 200,
        crop: 'fill',
        quality: 70
    },
    medium: {
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 80
    },
    large: {
        width: 1200,
        height: 900,
        crop: 'limit',
        quality: 85
    }
};

/**
 * Valida archivos de imagen
 */
export function validateImageFiles(
    files: Express.Multer.File[], 
    entityType: keyof typeof IMAGE_CONFIGS
): ImageValidationResult {
    const config = IMAGE_CONFIGS[entityType];
    const errors: string[] = [];

    if (!config) {
        errors.push(`Configuración no encontrada para el tipo de entidad: ${entityType}`);
        return { isValid: false, errors };
    }

    // Validar número de archivos
    if (files.length > config.maxFiles) {
        errors.push(`Máximo ${config.maxFiles} imágenes permitidas para ${entityType}`);
    }

    // Validar cada archivo
    files.forEach((file, index) => {
        // Validar formato
        if (!config.allowedFormats.includes(file.mimetype)) {
            errors.push(`Archivo ${index + 1}: Formato no permitido. Formatos aceptados: ${config.allowedFormats.join(', ')}`);
        }

        // Validar tamaño
        if (file.size > config.maxFileSize) {
            const maxSizeMB = config.maxFileSize / (1024 * 1024);
            errors.push(`Archivo ${index + 1}: Tamaño excede el límite de ${maxSizeMB}MB`);
        }

        // Validar que el archivo tenga contenido
        if (file.size === 0) {
            errors.push(`Archivo ${index + 1}: El archivo está vacío`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Extrae el public ID de una URL de Cloudinary
 */
export function extractPublicIdFromUrl(url: string, folder: string): string | null {
    try {
        // Si la URL es una ruta simple como "image1.jpg", construir un public ID directamente
        if (!url.includes('://')) {
            const filename = url.split('.')[0]; // Remover extensión
            return `${folder}/${filename}`;
        }
        
        // Manejar URLs completas de Cloudinary
        const parsedUrl = new URL(url);
        const pathnameParts = parsedUrl.pathname.split('/');
        
        // Buscar la parte que contiene el folder y el filename
        const uploadIndex = pathnameParts.indexOf('upload');
        if (uploadIndex !== -1 && uploadIndex + 2 < pathnameParts.length) {
            // Formato típico: /image/upload/v1234/folder/filename.ext
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1];
            const filename = filenameWithExtension.split('.')[0]; // Remover extensión
            return `${folder}/${filename}`;
        }
        
        // Fallback: extraer el último elemento y remover extensión
        const filenameWithExtension = pathnameParts[pathnameParts.length - 1];
        const filename = filenameWithExtension.split('.')[0];
        return `${folder}/${filename}`;
    } catch (error) {
        console.error('Error al extraer public ID de URL:', error, 'URL:', url);
        return null;
    }
}

/**
 * Formatea los bytes a una representación legible
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Genera un nombre único para el archivo
 */
export function generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || '';
    const nameWithoutExtension = originalName.split('.').slice(0, -1).join('.');
    
    return `${nameWithoutExtension}_${timestamp}_${random}.${extension}`;
}