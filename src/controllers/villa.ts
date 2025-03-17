import { Request, Response } from 'express'
import VillaModel from '../models/villa.js'
import { validateVilla } from '../schemas/villaSchema.js'
import cloudinary from '../utils/cloudinaryConfig.js'
import path from 'path'
import { CreateVillaDTO } from '../types/index.js'

interface MulterFile {
  buffer: Buffer
  [key: string]: any
}

class VillaController {
    static async getAllVillas(req: Request, res: Response): Promise<void> {
        try {
            const villas = await VillaModel.getAll()
            res.status(200).json(villas)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getVillaById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(Number(id))
            if (villa) {
                res.status(200).json(villa)
            } else {
                res.status(404).json({ message: 'Villa not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createVilla(req: Request, res: Response): Promise<Response> {
        try {
            // Validar datos de entrada
            const result = validateVilla(req.body);
            if (!result.success) {
                return res.status(400).json({ 
                    error: {
                        fieldErrors: {},
                        formErrors: ['Missing required fields']
                    }
                });
            }

            const villaData = req.body as CreateVillaDTO;

            // Validar que los datos numéricos sean válidos
            if (isNaN(Number(villaData.capacity)) || 
                isNaN(Number(villaData.bathrooms)) || 
                isNaN(Number(villaData.rooms)) || 
                isNaN(Number(villaData.price))) {
                return res.status(400).json({ error: 'Invalid numerical values' });
            }

            // Procesar imágenes si se proporcionan
            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadPromises = files.map((file: any) => {
                        return new Promise<string>((resolve, reject) => {
                            const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: 'villas' },
                                (error, result) => {
                                    if (error) reject(error);
                                    else resolve(result!.secure_url);
                                }
                            );
                            uploadStream.end(file.buffer);
                        });
                    });

                    villaData.images = await Promise.all(uploadPromises);
                }
            }

            const createdVilla = await VillaModel.createVilla(villaData);
            return res.status(201).json(createdVilla);
        } catch (error) {
            console.error('Error en createVilla:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('validation')) {
                    return res.status(400).json({ error: 'Validation error in villa data' });
                }
            }
            
            return res.status(500).json({ error: 'Database error' });
        }
    }

    static async updateVilla(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid villa ID' });
            }

            // Verificar si la villa existe
            const existingVilla = await VillaModel.getVillaById(id);
            if (!existingVilla) {
                return res.status(404).json({ message: 'Villa not found' });
            }

            const villaData = req.body;

            // Validación de numeros
            if (
                (villaData.capacity !== undefined && isNaN(Number(villaData.capacity))) ||
                (villaData.bathrooms !== undefined && isNaN(Number(villaData.bathrooms))) ||
                (villaData.rooms !== undefined && isNaN(Number(villaData.rooms)))
            ) {
                return res.status(400).json({ message: 'Invalid capacity value' });
            }

            if (villaData.price !== undefined && isNaN(Number(villaData.price))) {
                return res.status(400).json({ message: 'Invalid price value' });
            }

            // Procesar imágenes si se proporcionan
            if (req.files) {
                const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                if (files.length > 0) {
                    const uploadPromises = files.map((file: any) => {
                        return new Promise<string>((resolve, reject) => {
                            const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: 'villas' },
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
                    if (existingVilla && existingVilla.images) {
                        villaData.images = [...existingVilla.images, ...uploadedUrls];
                    } else {
                        villaData.images = uploadedUrls;
                    }
                }
            }

            const updatedVilla = await VillaModel.updateVilla(id, villaData);
            return res.status(200).json(updatedVilla);
        } catch (error) {
            console.error('Error updating villa:', error);
            
            if (error instanceof Error) {
                if (error.message === 'Villa not found') {
                    return res.status(404).json({ message: 'Villa not found' });
                } else if (error.message === 'No valid fields to update') {
                    return res.status(400).json({ message: 'No valid fields to update' });
                } else if (error.message.includes('validation')) {
                    return res.status(400).json({ message: 'Validation error in villa data' });
                }
            }
            
            return res.status(500).json({ error: 'Database error' });
        }
    }

    static async deleteVilla(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid villa ID' });
            }

            const villa = await VillaModel.getVillaById(id);
            if (!villa) {
                return res.status(404).json({ message: 'Villa not found' });
            }

            // Eliminar imágenes de Cloudinary
            if (Array.isArray(villa.images) && villa.images.length > 0) {
                for (const imageUrl of villa.images) {
                    const publicId = VillaController.getPublicIdFromUrl(imageUrl);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`Image deleted from Cloudinary: ${publicId}`);
                    }
                }
            }

            await VillaModel.deleteVilla(id);
            return res.status(200).json({ message: 'Villa deleted successfully' });
        } catch (error) {
            console.error('Error deleting villa:', error);
            if (error instanceof Error && error.message === 'Villa not found') {
                return res.status(404).json({ error: 'Villa not found' });
            }
            return res.status(500).json({ error: 'Error deleting villa' });
        }
    }

    static getPublicIdFromUrl(url: string): string | null {
        try {
            // Si la URL es una ruta simple como "image1.jpg", construir un public ID directamente
            if (!url.includes('://')) {
                const filename = path.parse(url).name;
                return `villas/${filename}`;
            }
            
            // Manejar URLs completas
            const parsedUrl = new URL(url);
            const pathnameParts = parsedUrl.pathname.split('/');
            const filenameWithExtension = pathnameParts[pathnameParts.length - 1];
            const filename = path.parse(filenameWithExtension).name;
            return `villas/${filename}`;
        } catch (error) {
            console.log('Error parsing URL:', error);
            // Si algo falla, intentar extraer el nombre de archivo directamente
            try {
                const filename = path.parse(url).name;
                return `villas/${filename}`;
            } catch (e) {
                return null;
            }
        }
    }
}

export default VillaController 