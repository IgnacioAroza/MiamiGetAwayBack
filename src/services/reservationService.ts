import { ReservationModel } from '../models/reservation.js';
import EmailService from './emailService.js';
import PdfService from './pdfService.js';
import { Reservation, CreateReservationDTO } from '../types/reservations.js';
import ReservationPaymentsService from './reservationPaymentsService.js';

export default class ReservationService {
    // Crear reserva con notificacion
    static async createReservation(data: CreateReservationDTO): Promise<Reservation> {
        const reservation = await ReservationModel.createReservation(data as any);
        await EmailService.sendConfirmationEmail(reservation.clientEmail, reservation);
        return reservation;
    }

    // Actualizar reserva con notificacion
    static async updateReservation(id: number, status: string): Promise<Reservation> {
        const currentReservation = await ReservationModel.getReservationById(id);
        if (!currentReservation) {
            throw new Error('Reservation not found');
        }
        const previousStatus = currentReservation.status;
        const updatedReservation = await ReservationModel.updateReservation(id, { status: status as 'pending' | 'confirmed' | 'checked_in' | 'checked_out' });
        if (!updatedReservation) {
            await EmailService.sendStatusChangeNotification(updatedReservation, previousStatus);
        }
        return updatedReservation;
    }

    // Registrar pago con notificacion
    static async registerPayment(id: number, amount: number, paymentMethod: string, paymentReference?: string, notes?: string): Promise<Reservation> {
        const currentReservation = await ReservationModel.getReservationById(id);
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
        const updatedReservation = await ReservationModel.getReservationById(id);
        if (!updatedReservation) {
            throw new Error('Reservation not found');
        }
        return updatedReservation;
    }
    
    // Generar y enviar PDF
    static async generateAndSendPDF(id: number): Promise<string> {
        const reservation = await ReservationModel.getReservationById(id);
        if (!reservation) {
            throw new Error('Reservation not found');
        }
        // Generar PDF
        const pdfPath = await PdfService.generateInvoicePdf(reservation);
        // Enviar PDF
        await EmailService.sendReservationPdf(reservation, pdfPath);

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