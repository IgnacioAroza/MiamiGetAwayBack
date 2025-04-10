import { ReservationModel } from '../models/reservation.js';
import EmailService from './emailService.js';
import PdfService from './pdfService.js';
import { Reservation, CreateReservationDTO, ReservationWithClient } from '../types/reservations.js';
import ReservationPaymentsService from './reservationPaymentsService.js';

export default class ReservationService {
    // Crear reserva con notificacion
    static async createReservation(data: CreateReservationDTO): Promise<Reservation> {
        const reservation = await ReservationModel.createReservation(data as any);
        // // Obtener los datos del cliente para el email
        // const reservationWithClient = await ReservationModel.getReservationById(reservation.id) as ReservationWithClient;
        // if (reservationWithClient?.clientEmail) {
        //     await EmailService.sendConfirmationEmail(reservationWithClient.clientEmail, reservationWithClient);
        // }
        return reservation;
    }

    // Actualizar reserva con notificacion
    static async updateReservation(id: number, status: string): Promise<Reservation> {
        const currentReservation = await ReservationModel.getReservationById(id) as ReservationWithClient;
        if (!currentReservation) {
            throw new Error('Reservation not found');
        }
        const previousStatus = currentReservation.status;
        const updatedReservation = await ReservationModel.updateReservation(id, { status: status as 'pending' | 'confirmed' | 'checked_in' | 'checked_out' });
        if (updatedReservation) {
            const updatedReservationWithClient = await ReservationModel.getReservationById(id) as ReservationWithClient;
            if (updatedReservationWithClient?.clientEmail) {
                await EmailService.sendStatusChangeNotification(updatedReservationWithClient, previousStatus);
            }
        }
        return updatedReservation;
    }

    // Registrar pago con notificacion
    static async registerPayment(id: number, amount: number, paymentMethod: string, paymentReference?: string, notes?: string): Promise<Reservation> {
        const currentReservation = await ReservationModel.getReservationById(id) as ReservationWithClient;
        if (!currentReservation) {
            throw new Error('Reservation not found');
        }
        
        // Crear el pago en la tabla de pagos
        await ReservationPaymentsService.createPayment({
            reservationId: id,
            amount,
            paymentMethod,
            paymentReference,
            notes
        });
        
        // Obtener reserva actualizada
        const updatedReservation = await ReservationModel.getReservationById(id) as ReservationWithClient;
        if (!updatedReservation) {
            throw new Error('Reservation not found');
        }
        return updatedReservation;
    }
    
    // Actualizar campos de pago
    static async updatePaymentFields(id: number, amountPaid: number, amountDue: number, paymentStatus: 'pending' | 'partial' | 'complete'): Promise<Reservation> {
        // Verificar que la reserva existe
        const reservation = await ReservationModel.getReservationById(id);
        if (!reservation) {
            const error: any = new Error('Reservation not found');
            error.status = 404;
            throw error;
        }

        try {
            // Actualizar solo los campos relacionados con el pago
            const updatedReservation = await ReservationModel.updateReservation(id, {
                amount_paid: amountPaid,
                amount_due: amountDue,
                payment_status: paymentStatus
            } as any);
            
            return updatedReservation;
        } catch (error) {
            console.error('Error updating payment fields:', error);
            throw error;
        }
    }
    
    // Generar PDF solo para descarga (sin enviar por email)
    static async generatePdfForDownload(id: number): Promise<Buffer> {
        try {
            const reservation = await ReservationModel.getReservationById(id) as ReservationWithClient;
            
            if (!reservation) {
                throw new Error('Reservation not found');
            }
            
            // Asegurarnos de que las fechas sean objetos Date válidos
            if (reservation.checkInDate && !(reservation.checkInDate instanceof Date)) {
                reservation.checkInDate = new Date(reservation.checkInDate);
            }
            
            if (reservation.checkOutDate && !(reservation.checkOutDate instanceof Date)) {
                reservation.checkOutDate = new Date(reservation.checkOutDate);
            }
            
            // Asegurar que los campos numéricos sean números
            if (reservation.nights !== undefined && typeof reservation.nights !== 'number') {
                reservation.nights = Number(reservation.nights);
            }
            
            if (reservation.pricePerNight !== undefined && typeof reservation.pricePerNight !== 'number') {
                reservation.pricePerNight = Number(reservation.pricePerNight);
            }
            
            if (reservation.totalAmount !== undefined && typeof reservation.totalAmount !== 'number') {
                reservation.totalAmount = Number(reservation.totalAmount);
            }
            
            if (reservation.amountPaid !== undefined && typeof reservation.amountPaid !== 'number') {
                reservation.amountPaid = Number(reservation.amountPaid);
            }
            
            if (reservation.amountDue !== undefined && typeof reservation.amountDue !== 'number') {
                reservation.amountDue = Number(reservation.amountDue);
            }
            
            // Generar PDF para descarga directa
            return await PdfService.generatePdfForDownload(reservation);
        } catch (error) {
            throw error;
        }
    }
    
    // Generar y enviar PDF
    static async generateAndSendPDF(id: number): Promise<string> {
        const reservation = await ReservationModel.getReservationById(id) as ReservationWithClient;
        if (!reservation) {
            throw new Error('Reservation not found');
        }
        // Generar PDF
        const pdfPath = await PdfService.generateInvoicePdf(reservation);
        // Enviar PDF
        if (reservation.clientEmail) {
            await EmailService.sendReservationPdf(reservation, pdfPath);
        }

        return pdfPath;
    }

    // Otros métodos CRUD simplificados (sin lógica de email)
    static async getAllReservations(filters: {
        startDate?: Date,
        endDate?: Date,
        status?: string,
        clientName?: string,
        clientEmail?: string
    } = {}): Promise<Reservation[]> {
        return ReservationModel.getAllReservations(filters);
    }
    
    static async getReservationById(id: number): Promise<Reservation | null> {
        return ReservationModel.getReservationById(id);
    }
    
    static async deleteReservation(id: number): Promise<{ message: string }> {
        return ReservationModel.deleteReservation(id);
    }
}