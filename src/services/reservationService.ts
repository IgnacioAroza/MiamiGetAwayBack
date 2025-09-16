import { ReservationModel } from '../models/reservation.js';
import EmailService from './emailService.js';
import PdfService from './pdfService.js';
import { Reservation, CreateReservationDTO, ReservationWithClient } from '../types/reservations.js';
import ReservationPaymentsService from './reservationPaymentsService.js';
import db from '../utils/db_render.js';
import { parseReservationDate } from '../schemas/reservationSchema.js';

export default class ReservationService {
    // Crear reserva con notificacion
    static async createReservation(data: CreateReservationDTO): Promise<Reservation> {
        const reservation = await ReservationModel.createReservation(data as any);
        // Obtener los datos del cliente para el email
        // const reservationWithClient = await ReservationModel.getReservationById(reservation.id) as ReservationWithClient;
        // Comentamos el envío automático de email
        /*if (reservationWithClient?.clientEmail) {
            await EmailService.sendConfirmationEmail(reservationWithClient.clientEmail, reservationWithClient);
        }*/
        return reservation;
    }

    // Actualizar reserva con notificacion
    static async updateReservation(id: number, status: string): Promise<Reservation> {
        console.log('Updating reservation with ID:', id, 'and status:', status); // Log antes de actualizar
        const currentReservation = await ReservationModel.getReservationById(id) as ReservationWithClient;
        if (!currentReservation) {
            throw new Error('Reservation not found');
        }
        const previousStatus = currentReservation.status;
        const updatedReservation = await ReservationModel.updateReservation(id, { status: status as 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' });
        // Comentamos el envío automático de email de actualización
        /*if (updatedReservation) {
            const updatedReservationWithClient = await ReservationModel.getReservationById(id) as ReservationWithClient;
            if (updatedReservationWithClient?.clientEmail) {
                await EmailService.sendStatusChangeNotification(updatedReservationWithClient, previousStatus);
            }
        }*/
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
            
            // Ya no es necesario convertir las fechas a objeto Date,
            // pero podríamos necesitar proporcionar una función helper para el PDF
            // en caso de que el servicio de PDF espere objetos Date
            
            // Asegurar que los campos numéricos sean números
            if (reservation.nights !== undefined && typeof reservation.nights !== 'number') {
                reservation.nights = Number(reservation.nights);
            }
            
            if (reservation.pricePerNight !== undefined && typeof reservation.pricePerNight !== 'number') {
                reservation.pricePerNight = Number(reservation.pricePerNight);
            }
            
            if (reservation.cleaningFee !== undefined && typeof reservation.cleaningFee !== 'number') {
                reservation.cleaningFee = Number(reservation.cleaningFee);
            }

            if (reservation.parkingFee !== undefined && typeof reservation.parkingFee !== 'number') {
                reservation.parkingFee = Number(reservation.parkingFee);
            }
            if ((reservation as any).cancellationFee !== undefined && typeof (reservation as any).cancellationFee !== 'number') {
                (reservation as any).cancellationFee = Number((reservation as any).cancellationFee);
            }

            if (reservation.taxes !== undefined && typeof reservation.taxes !== 'number') {
                reservation.taxes = Number(reservation.taxes);
            }

            if (reservation.otherExpenses !== undefined && typeof reservation.otherExpenses !== 'number') {
                reservation.otherExpenses = Number(reservation.otherExpenses);
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
        // Generar PDF y enviar correo
        if (reservation.clientEmail) {
            await EmailService.sendConfirmationEmail(reservation.clientEmail, reservation);
        }
        return `reservation-${reservation.id}-${reservation.clientName}-${reservation.clientLastname}.pdf`;
    }

    // Otros métodos CRUD simplificados (sin lógica de email)
    static async getAllReservations(filters: {
        startDate?: string, // Cambiado de Date a string
        endDate?: string,   // Cambiado de Date a string
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

    static async getReservationWithClientDetails(reservationId: number): Promise<any> {
        return await ReservationModel.getReservationWithClientDetails(reservationId);
    }
}
