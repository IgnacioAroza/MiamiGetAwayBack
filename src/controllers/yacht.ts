import { Request, Response } from 'express'
import YachtModel from '../models/yacht.js'
import { validateYacht, validatePartialYacht } from '../schemas/yachtSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'
import { Yacht, CreateYachtDTO, UpdateYachtDTO } from '../types/index.js'

class YachtController {
    static async getAllYachts(req: Request, res: Response): Promise<void> {
        try {
            const yachts = await YachtModel.getAll()
            res.status(200).json(yachts)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getYachtById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const yacht = await YachtModel.getYachtById(Number(id))
            if (yacht) {
                res.status(200).json(yacht)
            } else {
                res.status(404).json({ message: 'Yacht not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createYacht(req: Request, res: Response): Promise<Response> {
        try {
            // Validar datos de entrada
            const result = validateYacht(req.body);
            if (!result.success) {
                return res.status(400).json({ 
                    error: JSON.parse(result.error.errors[0].message)
                });
            }

            const yachtData = req.body as CreateYachtDTO;

            // Validar que los datos numéricos sean válidos
            if (isNaN(Number(yachtData.capacity)) || isNaN(Number(yachtData.price))) {
                return res.status(400).json({ error: 'Invalid numerical values' });
            }

            // Procesar imágenes si se proporcionan
            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadPromises = files.map((file: any) => {
                        return new Promise<string>((resolve, reject) => {
                            const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: 'yachts' },
                                (error, result) => {
                                    if (error) reject(error);
                                    else resolve(result!.secure_url);
                                }
                            );
                            uploadStream.end(file.buffer);
                        });
                    });

                    yachtData.images = await Promise.all(uploadPromises);
                }
            }

            const createdYacht = await YachtModel.createYacht(yachtData);
            return res.status(201).json(createdYacht);
        } catch (error) {
            console.error('Error en createYacht:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('validation')) {
                    return res.status(400).json({ error: 'Validation error in yacht data' });
                }
            }
            
            return res.status(500).json({ error: 'Database error' });
        }
    }

    static async updateYacht(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid yacht ID' });
            }

            // Verificar si el yate existe
            const existingYacht = await YachtModel.getYachtById(id);
            if (!existingYacht) {
                return res.status(404).json({ message: 'Yacht not found' });
            }

            const yachtData = req.body;

            // Validación de números
            if (yachtData.capacity !== undefined && isNaN(Number(yachtData.capacity))) {
                return res.status(400).json({ message: 'Invalid capacity value' });
            }

            if (yachtData.price !== undefined && isNaN(Number(yachtData.price))) {
                return res.status(400).json({ message: 'Invalid price value' });
            }

            // Procesar imágenes si se proporcionan
            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadPromises = files.map((file: any) => {
                        return new Promise<string>((resolve, reject) => {
                            const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: 'yachts' },
                                (error, result) => {
                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(result!.secure_url);
                                    }
                                }
                            );
                            uploadStream.end(file.buffer);
                        });
                    });

                    const uploadedUrls = await Promise.all(uploadPromises);
                    
                    // Añadir las nuevas URLs a las existentes si ya hay imágenes
                    if (existingYacht && existingYacht.images) {
                        yachtData.images = [...existingYacht.images, ...uploadedUrls];
                    } else {
                        yachtData.images = uploadedUrls;
                    }
                }
            }

            const updatedYacht = await YachtModel.updateYacht(id, yachtData);
            return res.status(200).json(updatedYacht);
        } catch (error) {
            console.error('Error updating yacht:', error);
            
            if (error instanceof Error) {
                if (error.message === 'Yacht not found') {
                    return res.status(404).json({ message: 'Yacht not found' });
                } else if (error.message === 'No valid fields to update') {
                    return res.status(400).json({ message: 'No valid fields to update' });
                } else if (error.message.includes('validation')) {
                    return res.status(400).json({ message: 'Validation error in yacht data' });
                }
            }
            
            return res.status(500).json({ error: 'Database error' });
        }
    }

    static async deleteYacht(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid yacht ID' });
            }

            // Verificamos si el yate existe
            const yacht = await YachtModel.getYachtById(id);
            if (!yacht) {
                return res.status(404).json({ message: 'Yacht not found' });
            }

            // Eliminar imágenes de Cloudinary
            if (Array.isArray(yacht.images) && yacht.images.length > 0) {
                for (const imageUrl of yacht.images) {
                    try {
                        if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
                            const publicId = YachtController.getPublicIdFromUrl(imageUrl);
                            if (publicId) {
                                await cloudinary.uploader.destroy(publicId);
                                console.log(`Image deleted from Cloudinary: ${publicId}`);
                            }
                        }
                    } catch (error) {
                        console.error(`Error removing image: ${imageUrl}`, error);
                    }
                }
            }

            await YachtModel.deleteYacht(id);
            return res.status(200).json({ message: 'Yacht deleted successfully' });
        } catch (error) {
            console.error('Error deleting yacht:', error);
            if (error instanceof Error && error.message === 'Yacht not found') {
                return res.status(404).json({ message: 'Yacht not found' });
            }
            return res.status(500).json({ error: 'Error deleting yacht' });
        }
    }

    static getPublicIdFromUrl(url: string): string | null {
        try {
            // Si la URL es una ruta simple como "image1.jpg", construir un public ID directamente
            if (!url.includes('://')) {
                const filename = path.parse(url).name;
                return `yachts/${filename}`;
            }
            
            // Manejar URLs completas
            const parsedUrl = new URL(url);
            const pathnameParts = parsedUrl.pathname.split('/');
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1];
            const filename = path.parse(filenameWithExtension).name;
            return `yachts/${filename}`;
        } catch (error) {
            console.log('Error parsing URL:', error);
            // Si algo falla, intentar extraer el nombre de archivo directamente
            try {
                const filename = path.parse(url).name;
                return `yachts/${filename}`;
            } catch (e) {
                return null;
            }
        }
    }
}

export default YachtController 