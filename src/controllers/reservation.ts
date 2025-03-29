import { Request, Response } from 'express';
import ReservationService from '../services/reservationService.js';
import { validateReservation, validatePartialReservation } from '../schemas/reservationSchema.js';
import ReservationPaymentsService from '../services/reservationPaymentsService.js';

export class ReservationController {
    static async getAllReservations(req: Request, res: Response): Promise<void> {
        try {
            // Obtener filtros desde query params
            const filters: any = {};
            
            if (req.query.startDate) {
                try {
                    filters.startDate = new Date(req.query.startDate as string);
                    if (isNaN(filters.startDate.getTime())) {
                        throw new Error('Fecha de inicio inválida');
                    }
                } catch (error) {
                    res.status(400).json({ error: 'La fecha de inicio debe estar en formato ISO' });
                    return;
                }
            }
            
            if (req.query.endDate) {
                try {
                    filters.endDate = new Date(req.query.endDate as string);
                    if (isNaN(filters.endDate.getTime())) {
                        throw new Error('Fecha de fin inválida');
                    }
                } catch (error) {
                    res.status(400).json({ error: 'La fecha de fin debe estar en formato ISO' });
                    return;
                }
            }
            
            if (req.query.status) {
                filters.status = req.query.status as string;
            }
            
            if (req.query.clientName) {
                filters.clientName = req.query.clientName as string;
            }
            
            if (req.query.clientEmail) {
                filters.clientEmail = req.query.clientEmail as string;
            }
            
            const reservations = await ReservationService.getAllReservations(filters);
            res.status(200).json(reservations);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservations' });
        }
    }

    static async getReservationById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const reservation = await ReservationService.getReservationById(parseInt(id));
            if (!reservation) {
                res.status(404).json({ error: 'Reservation not found' });
                return;
            }
            res.status(200).json(reservation);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservation' });
        }
    }
    
    static async createReservation(req: Request, res: Response): Promise<void> {
        try {
            const validateResult = validateReservation(req.body);
            if (!validateResult.success) {
                res.status(400).json({ 
                    error: 'Validación fallida', 
                    details: validateResult.error.format() 
                });
                return;
            }

            const newReservation = await ReservationService.createReservation(validateResult.data);
            res.status(201).json(newReservation);
        } catch (error) {
            console.error('Error al crear reserva:', error);
            res.status(500).json({ error: 'Error creating reservation' });
        }
    }

    static async updateReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const validateResult = validatePartialReservation(req.body);
            if (!validateResult.success) {
                res.status(400).json({ 
                    error: 'Validación fallida', 
                    details: validateResult.error.format() 
                });
                return;
            }

            if (!validateResult.data.status) {
                res.status(400).json({ error: 'Estado de reserva requerido' });
                return;
            }

            const updatedReservation = await ReservationService.updateReservation(parseInt(id), validateResult.data.status);
            res.status(200).json(updatedReservation);
        } catch (error) {
            console.error('Error al actualizar reserva:', error);
            res.status(500).json({ error: 'Error updating reservation' });
        }
    }

    static async deleteReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            await ReservationService.deleteReservation(parseInt(id));
            res.status(200).json({ message: 'Reservation deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error deleting reservation' });
        }
    }
    
    // Método para registrar pagos
    static async registerPayment(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const { amount, paymentMethod, paymentReference, notes } = req.body;
        
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            res.status(400).json({ error: 'Valid payment amount is required' });
            return;
        }
        
        if (!paymentMethod) {
            res.status(400).json({ error: 'Payment method is required' });
            return;
        }
        
        try {
            const updatedReservation = await ReservationService.registerPayment(
                parseInt(id),
                Number(amount),
                paymentMethod,
                paymentReference,
                notes
            );
            res.status(200).json(updatedReservation);
        } catch (error) {
            res.status(500).json({ error: 'Error registering payment' });
        }
    }
    
    // Método para generar y enviar PDF
    static async generatePdf(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        
        try {
            const pdfPath = await ReservationService.generateAndSendPDF(parseInt(id));
            
            // Enviar respuesta con confirmación
            res.status(200).json({ 
                message: 'PDF generated and sent successfully',
                pdfPath
            });
        } catch (error) {
            res.status(500).json({ error: 'Error generating PDF' });
        }
    }

    // Método para obtener pagos de una reserva específica
    static async getReservationPayments(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
            res.status(200).json(payments);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservation payments' });
        }
    }
}
