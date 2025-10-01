import { Request, Response } from 'express'
import VillaModel from '../models/villa.js'
import { validateVilla } from '../schemas/villaSchema.js'
import ImageService from '../services/imageService.js'
import { CreateVillaDTO } from '../types/index.js'

class VillaController {
    static async getAllVillas(req: Request, res: Response): Promise<void> {
        try {
            const villas = await VillaModel.getAll()
            
            // Optimizar imágenes para listado (contexto 'list')
            const optimizedVillas = villas.map(villa => {
                if (villa.images && Array.isArray(villa.images)) {
                    const optimizedImages = ImageService.optimizeForContext(villa.images, 'list');
                    return {
                        ...villa,
                        images: optimizedImages.images, // URLs optimizadas para listado
                        originalImages: villa.images // URLs originales como backup
                    };
                }
                return villa;
            });

            res.status(200).json(optimizedVillas)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getVillaById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(Number(id))
            if (villa) {
                // Optimizar imágenes para vista detalle (contexto 'detail')
                if (villa.images && Array.isArray(villa.images)) {
                    const optimizedImages = ImageService.optimizeForContext(villa.images, 'detail');
                    const villaWithOptimizedImages = {
                        ...villa,
                        images: optimizedImages.images, // URLs principales optimizadas
                        responsiveImages: optimizedImages.responsiveImages, // Todas las variantes de tamaño
                        originalImages: villa.images // URLs originales como backup
                    };
                    res.status(200).json(villaWithOptimizedImages);
                } else {
                    res.status(200).json(villa);
                }
            } else {
                res.status(404).json({ message: 'Villa not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createVilla(req: Request, res: Response): Promise<void> {
        try {
            // Validar datos de entrada
            const result = validateVilla(req.body);
            if (!result.success) {
                res.status(400).json({ 
                    error: {
                        fieldErrors: {},
                        formErrors: ['Missing required fields']
                    }
                });
                return;
            }

            const villaData = req.body as CreateVillaDTO;

            // Validar que los datos numéricos sean válidos
            if (isNaN(Number(villaData.capacity)) || 
                isNaN(Number(villaData.bathrooms)) || 
                isNaN(Number(villaData.rooms)) || 
                isNaN(Number(villaData.price))) {
                res.status(400).json({ error: 'Invalid numerical values' });
                return;
            }

            // Procesar imágenes usando el servicio centralizado
            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadResult = await ImageService.uploadImages(files, {
                        entityType: 'villas'
                    });

                    if (!uploadResult.success) {
                        res.status(400).json({ 
                            error: 'Error uploading images', 
                            details: uploadResult.errors 
                        });
                        return;
                    }

                    villaData.images = uploadResult.urls;
                }
            }

            const createdVilla = await VillaModel.createVilla(villaData);
            res.status(201).json(createdVilla);
        } catch (error) {
            console.error('Error en createVilla:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('validation')) {
                    res.status(400).json({ error: 'Validation error in villa data' });
                    return;
                }
            }
            
            res.status(500).json({ error: 'Database error' });
        }
    }

    static async updateVilla(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ message: 'Invalid villa ID' });
                return;
            }

            // Verificar si la villa existe
            const existingVilla = await VillaModel.getVillaById(id);
            if (!existingVilla) {
                res.status(404).json({ message: 'Villa not found' });
                return;
            }

            const villaData = req.body;

            // Validación de numeros
            if (
                (villaData.capacity !== undefined && isNaN(Number(villaData.capacity))) ||
                (villaData.bathrooms !== undefined && isNaN(Number(villaData.bathrooms))) ||
                (villaData.rooms !== undefined && isNaN(Number(villaData.rooms)))
            ) {
                res.status(400).json({ message: 'Invalid capacity value' });
                return;
            }

            if (villaData.price !== undefined && isNaN(Number(villaData.price))) {
                res.status(400).json({ message: 'Invalid price value' });
                return;
            }

            // Procesar imágenes usando el servicio centralizado
            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadResult = await ImageService.uploadImages(files, {
                        entityType: 'villas'
                    });

                    if (!uploadResult.success) {
                        res.status(400).json({ 
                            error: 'Error uploading images', 
                            details: uploadResult.errors 
                        });
                        return;
                    }

                    // Añadir las nuevas URLs a las existentes si ya hay imágenes
                    if (existingVilla && existingVilla.images) {
                        villaData.images = [...existingVilla.images, ...uploadResult.urls];
                    } else {
                        villaData.images = uploadResult.urls;
                    }
                }
            }

            const updatedVilla = await VillaModel.updateVilla(id, villaData);
            res.status(200).json(updatedVilla);
        } catch (error) {
            console.error('Error updating villa:', error);
            
            if (error instanceof Error) {
                if (error.message === 'Villa not found') {
                    res.status(404).json({ message: 'Villa not found' });
                } else if (error.message === 'No valid fields to update') {
                    res.status(400).json({ message: 'No valid fields to update' });
                } else if (error.message.includes('validation')) {
                    res.status(400).json({ message: 'Validation error in villa data' });
                }
                return;
            }
            
            res.status(500).json({ error: 'Database error' });
        }
    }

    static async deleteVilla(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid villa ID' });
                return;
            }

            const villa = await VillaModel.getVillaById(id);
            if (!villa) {
                res.status(404).json({ message: 'Villa not found' });
                return;
            }

            // Eliminar imágenes usando el servicio centralizado
            if (Array.isArray(villa.images) && villa.images.length > 0) {
                const deleteResult = await ImageService.deleteImages(villa.images, 'villas');
                
                if (!deleteResult.success && deleteResult.errors.length > 0) {
                    console.warn('Algunas imágenes no pudieron ser eliminadas:', deleteResult.errors);
                    // Continuamos con la eliminación aunque algunas imágenes fallen
                }
            }

            await VillaModel.deleteVilla(id);
            res.status(200).json({ message: 'Villa deleted successfully' });
        } catch (error) {
            console.error('Error deleting villa:', error);
            if (error instanceof Error && error.message === 'Villa not found') {
                res.status(404).json({ error: 'Villa not found' });
                return;
            }
            res.status(500).json({ error: 'Error deleting villa' });
        }
    }
}

export default VillaController 