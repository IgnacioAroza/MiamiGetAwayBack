import cloudinary from '../utils/cloudinaryConfig.js';
import { 
    IMAGE_CONFIGS, 
    TRANSFORMATION_PRESETS, 
    validateImageFiles, 
    extractPublicIdFromUrl,
    ImageConfig,
    ImageValidationResult 
} from '../utils/imageUtils.js';

export interface UploadResult {
    success: boolean;
    urls: string[];
    errors: string[];
}

export interface DeleteResult {
    success: boolean;
    deletedCount: number;
    errors: string[];
}

export interface UploadOptions {
    entityType: keyof typeof IMAGE_CONFIGS;
    transformationPreset?: keyof typeof TRANSFORMATION_PRESETS;
    customTransformations?: any;
    publicIdPrefix?: string;
}

/**
 * Servicio centralizado para el manejo de imágenes con Cloudinary
 */
class ImageService {
    
    /**
     * Sube múltiples imágenes a Cloudinary
     */
    static async uploadImages(
        files: Express.Multer.File[], 
        options: UploadOptions
    ): Promise<UploadResult> {
        const { entityType, transformationPreset, customTransformations, publicIdPrefix } = options;
        
        try {
            // Validar archivos
            const validation = this.validateFiles(files, entityType);
            if (!validation.isValid) {
                return {
                    success: false,
                    urls: [],
                    errors: validation.errors
                };
            }

            const config = IMAGE_CONFIGS[entityType];
            const errors: string[] = [];
            const uploadedUrls: string[] = [];

            // Configurar transformaciones
            let transformations = config.transformations || {};
            if (transformationPreset) {
                transformations = { ...transformations, ...TRANSFORMATION_PRESETS[transformationPreset] };
            }
            if (customTransformations) {
                transformations = { ...transformations, ...customTransformations };
            }

            // Subir archivos en paralelo
            const uploadPromises = files.map((file, index) => 
                this.uploadSingleImage(file, config.folder, transformations, publicIdPrefix, index)
            );

            const results = await Promise.allSettled(uploadPromises);

            // Procesar resultados
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    uploadedUrls.push(result.value);
                } else {
                    errors.push(`Error subiendo imagen ${index + 1}: ${result.reason}`);
                    console.error(`Error uploading image ${index + 1}:`, result.reason);
                }
            });

            return {
                success: errors.length === 0,
                urls: uploadedUrls,
                errors
            };

        } catch (error) {
            console.error('Error en uploadImages:', error);
            return {
                success: false,
                urls: [],
                errors: [`Error interno del servidor: ${error instanceof Error ? error.message : 'Error desconocido'}`]
            };
        }
    }

    /**
     * Elimina múltiples imágenes de Cloudinary
     */
    static async deleteImages(urls: string[], entityType: keyof typeof IMAGE_CONFIGS): Promise<DeleteResult> {
        const config = IMAGE_CONFIGS[entityType];
        const errors: string[] = [];
        let deletedCount = 0;

        if (!Array.isArray(urls) || urls.length === 0) {
            return {
                success: true,
                deletedCount: 0,
                errors: []
            };
        }

        try {
            // Eliminar imágenes en paralelo
            const deletePromises = urls.map(url => 
                this.deleteSingleImage(url, config.folder)
            );

            const results = await Promise.allSettled(deletePromises);

            // Procesar resultados
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        deletedCount++;
                    } else {
                        errors.push(`Error eliminando imagen ${index + 1}: ${result.value.error}`);
                    }
                } else {
                    errors.push(`Error eliminando imagen ${index + 1}: ${result.reason}`);
                    console.error(`Error deleting image ${index + 1}:`, result.reason);
                }
            });

            return {
                success: errors.length === 0,
                deletedCount,
                errors
            };

        } catch (error) {
            console.error('Error en deleteImages:', error);
            return {
                success: false,
                deletedCount,
                errors: [`Error interno del servidor: ${error instanceof Error ? error.message : 'Error desconocido'}`]
            };
        }
    }

    /**
     * Valida archivos antes de la subida
     */
    private static validateFiles(
        files: Express.Multer.File[], 
        entityType: keyof typeof IMAGE_CONFIGS
    ): ImageValidationResult {
        if (!files || files.length === 0) {
            return {
                isValid: false,
                errors: ['No se proporcionaron archivos para subir']
            };
        }

        return validateImageFiles(files, entityType);
    }

    /**
     * Sube una sola imagen a Cloudinary
     */
    private static uploadSingleImage(
        file: Express.Multer.File, 
        folder: string, 
        transformations: any,
        publicIdPrefix?: string,
        index?: number
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const uploadOptions: any = {
                folder,
                resource_type: 'image',
                ...transformations
            };

            // Agregar public_id personalizado si se proporciona
            if (publicIdPrefix) {
                const timestamp = Date.now();
                const randomSuffix = Math.random().toString(36).substring(2, 8);
                uploadOptions.public_id = `${publicIdPrefix}_${timestamp}_${randomSuffix}`;
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        reject(new Error(`Error de Cloudinary: ${error.message}`));
                    } else if (result) {
                        resolve(result.secure_url);
                    } else {
                        reject(new Error('No se recibió resultado de Cloudinary'));
                    }
                }
            );

            uploadStream.end(file.buffer);
        });
    }

    /**
     * Elimina una sola imagen de Cloudinary
     */
    private static async deleteSingleImage(url: string, folder: string): Promise<{ success: boolean; error?: string }> {
        try {
            const publicId = extractPublicIdFromUrl(url, folder);
            
            if (!publicId) {
                return {
                    success: false,
                    error: 'No se pudo extraer el public ID de la URL'
                };
            }

            const result = await cloudinary.uploader.destroy(publicId);
            
            if (result.result === 'ok' || result.result === 'not found') {
                console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
                return { success: true };
            } else {
                return {
                    success: false,
                    error: `Cloudinary respondió: ${result.result}`
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    }

    /**
     * Obtiene las configuraciones disponibles para un tipo de entidad
     */
    static getEntityConfig(entityType: keyof typeof IMAGE_CONFIGS): ImageConfig | null {
        return IMAGE_CONFIGS[entityType] || null;
    }

    /**
     * Obtiene todas las configuraciones disponibles
     */
    static getAllConfigs(): typeof IMAGE_CONFIGS {
        return IMAGE_CONFIGS;
    }

    /**
     * Verifica si una URL es válida para Cloudinary
     */
    static isValidCloudinaryUrl(url: string): boolean {
        if (!url || typeof url !== 'string') {
            return false;
        }

        // Verificar si es una URL de Cloudinary o una ruta válida
        const cloudinaryPattern = /^https?:\/\/res\.cloudinary\.com/;
        const simpleImagePattern = /\.(jpg|jpeg|png|gif|webp)$/i;
        
        return cloudinaryPattern.test(url) || simpleImagePattern.test(url);
    }

    /**
     * Genera URLs con transformaciones específicas
     */
    static generateTransformedUrl(
        originalUrl: string, 
        transformations: any
    ): string {
        try {
            // Si ya es una URL de Cloudinary, aplicar transformaciones
            if (originalUrl.includes('res.cloudinary.com')) {
                const parts = originalUrl.split('/upload/');
                if (parts.length === 2) {
                    const transformString = Object.entries(transformations)
                        .map(([key, value]) => `${key}_${value}`)
                        .join(',');
                    return `${parts[0]}/upload/${transformString}/${parts[1]}`;
                }
            }
            
            // Si no es una URL de Cloudinary, devolver la original
            return originalUrl;
        } catch (error) {
            console.error('Error generando URL transformada:', error);
            return originalUrl;
        }
    }
}

export default ImageService;