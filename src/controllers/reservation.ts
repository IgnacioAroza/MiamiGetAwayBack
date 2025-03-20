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
                filters.startDate = new Date(req.query.startDate as string);
            }
            
            if (req.query.endDate) {
                filters.endDate = new Date(req.query.endDate as string);
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
        const { error } = validateReservation(req.body);
        if (error) {
            res.status(400).json({ error: JSON.parse(error.message) });
            return;
        }

        try {
            const newReservation = await ReservationService.createReservation(req.body);
            res.status(201).json(newReservation);
        } catch (error) {
            res.status(500).json({ error: 'Error creating reservation' });
        }
    }

    static async updateReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const { error } = validatePartialReservation(req.body);
        if (error) {
            res.status(400).json({ error: JSON.parse(error.message) });
            return;
        }

        try {
            const updatedReservation = await ReservationService.updateReservation(parseInt(id), req.body.status);
            res.status(200).json(updatedReservation);
        } catch (error) {
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
