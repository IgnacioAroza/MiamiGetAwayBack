import { Request, Response } from 'express'
import YachtModel from '../models/yacht.js'
import { validateYacht, validatePartialYacht } from '../schemas/yachtSchema.js'
import ImageService from '../services/imageService.js'
import { Yacht, CreateYachtDTO, UpdateYachtDTO } from '../types/index.js'

class YachtController {
    static async getAllYachts(req: Request, res: Response): Promise<void> {
        try {
            const yachts = await YachtModel.getAll()
            
            // Optimizar imágenes para listado (contexto 'list')
            const optimizedYachts = yachts.map(yacht => {
                if (yacht.images && Array.isArray(yacht.images)) {
                    const optimizedImages = ImageService.optimizeForContext(yacht.images, 'list');
                    return {
                        ...yacht,
                        images: optimizedImages.images, // URLs optimizadas para listado
                        originalImages: yacht.images // URLs originales como backup
                    };
                }
                return yacht;
            });

            res.status(200).json(optimizedYachts)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getYachtById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const yacht = await YachtModel.getYachtById(Number(id))
            if (yacht) {
                // Optimizar imágenes para vista detalle (contexto 'detail')
                if (yacht.images && Array.isArray(yacht.images)) {
                    const optimizedImages = ImageService.optimizeForContext(yacht.images, 'detail');
                    const yachtWithOptimizedImages = {
                        ...yacht,
                        images: optimizedImages.images, // URLs principales optimizadas
                        responsiveImages: optimizedImages.responsiveImages, // Todas las variantes de tamaño
                        originalImages: yacht.images // URLs originales como backup
                    };
                    res.status(200).json(yachtWithOptimizedImages);
                } else {
                    res.status(200).json(yacht);
                }
            } else {
                res.status(404).json({ message: 'Yacht not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createYacht(req: Request, res: Response): Promise<void> {
        try {
            // Validar datos de entrada
            const result = validateYacht(req.body);
            if (!result.success) {
                res.status(400).json({ 
                    error: JSON.parse(result.error.errors[0].message)
                });
                return;
            }

            const yachtData = req.body as CreateYachtDTO;

            // Validar que los datos numéricos sean válidos
            if (isNaN(Number(yachtData.capacity)) || isNaN(Number(yachtData.price))) {
                res.status(400).json({ error: 'Invalid numerical values' });
                return;
            }

            // Procesar imágenes usando el servicio centralizado
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'yachts'
                });

                if (!uploadResult.success) {
                    res.status(400).json({ 
                        error: 'Error uploading images', 
                        details: uploadResult.errors 
                    });
                    return;
                }

                yachtData.images = uploadResult.urls;
            }

            const createdYacht = await YachtModel.createYacht(yachtData);
            res.status(201).json(createdYacht);
        } catch (error) {
            console.error('Error en createYacht:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('validation')) {
                    res.status(400).json({ error: 'Validation error in yacht data' });
                    return;
                }
            }
            
            res.status(500).json({ error: 'Database error' });
        }
    }

    static async updateYacht(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid yacht ID' });
                return;
            }

            // Verificar si el yate existe
            const existingYacht = await YachtModel.getYachtById(id);
            if (!existingYacht) {
                res.status(404).json({ message: 'Yacht not found' });
                return;
            }

            const yachtData = req.body;

            // Validación de números
            if (yachtData.capacity !== undefined && isNaN(Number(yachtData.capacity))) {
                res.status(400).json({ message: 'Invalid capacity value' });
                return;
            }

            if (yachtData.price !== undefined && isNaN(Number(yachtData.price))) {
                res.status(400).json({ message: 'Invalid price value' });
                return;
            }

            // Procesar imágenes usando el servicio centralizado
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const uploadResult = await ImageService.uploadImages(req.files, {
                    entityType: 'yachts'
                });

                if (!uploadResult.success) {
                    res.status(400).json({ 
                        error: 'Error uploading images', 
                        details: uploadResult.errors 
                    });
                    return;
                }
                
                // Añadir las nuevas URLs a las existentes si ya hay imágenes
                if (existingYacht && existingYacht.images) {
                    yachtData.images = [...existingYacht.images, ...uploadResult.urls];
                } else {
                    yachtData.images = uploadResult.urls;
                }
            }

            const updatedYacht = await YachtModel.updateYacht(id, yachtData);
            res.status(200).json(updatedYacht);
        } catch (error) {
            console.error('Error updating yacht:', error);
            
            if (error instanceof Error) {
                if (error.message === 'Yacht not found') {
                    res.status(404).json({ message: 'Yacht not found' });
                } else if (error.message === 'No valid fields to update') {
                    res.status(400).json({ message: 'No valid fields to update' });
                } else if (error.message.includes('validation')) {
                    res.status(400).json({ message: 'Validation error in yacht data' });
                }
                return;
            }
            
            res.status(500).json({ error: 'Database error' });
        }
    }

    static async deleteYacht(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid yacht ID' });
                return;
            }

            // Verificamos si el yate existe
            const yacht = await YachtModel.getYachtById(id);
            if (!yacht) {
                res.status(404).json({ message: 'Yacht not found' });
                return;
            }

            // Eliminar imágenes usando el servicio centralizado
            if (Array.isArray(yacht.images) && yacht.images.length > 0) {
                const deleteResult = await ImageService.deleteImages(yacht.images, 'yachts');
                
                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                    // Continuamos con la eliminación del yate aunque algunas imágenes fallen
                }
            }

            await YachtModel.deleteYacht(id);
            res.status(200).json({ message: 'Yacht deleted successfully' });
        } catch (error) {
            console.error('Error deleting yacht:', error);
            if (error instanceof Error && error.message === 'Yacht not found') {
                res.status(404).json({ message: 'Yacht not found' });
                return;
            }
            res.status(500).json({ error: 'Error deleting yacht' });
        }
    }
}

export default YachtController 