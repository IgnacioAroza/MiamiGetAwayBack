import cron from 'node-cron';
import { ReservationModel } from '../models/reservation.js';
import db from '../utils/db_render.js';
import { QueryResult } from 'pg';
import EmailService from './emailService.js';
import { parseReservationDate } from '../schemas/reservationSchema.js';

/**
 * Servicio para manejar tareas programadas (cron jobs)
 */
export class CronService {
  private static instance: CronService;
  private reservationUpdateJob: cron.ScheduledTask | null = null;

  private constructor() {}

  /**
   * Obtiene la instancia única del servicio (patrón Singleton)
   */
  public static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

  /**
   * Inicia todos los cron jobs
   */
  public startAllJobs(): void {
    this.startReservationStatusUpdateJob();
    console.log('All cron jobs have been started');
  }

  /**
   * Detiene todos los cron jobs
   */
  public stopAllJobs(): void {
    if (this.reservationUpdateJob) {
      this.reservationUpdateJob.stop();
      this.reservationUpdateJob = null;
    }
    console.log('All cron jobs have been stopped');
  }

  /**
   * Inicia el cron job para actualizar el estado de las reservas
   * Se ejecuta todos los días a las 00:00 (medianoche)
   */
  private startReservationStatusUpdateJob(): void {
    // Programar para ejecutar todos los días a medianoche
    this.reservationUpdateJob = cron.schedule('0 0 * * *', async () => {
      await this.updateReservationStatuses();
    });
    console.log('Cron job of status update scheduled');
  }

  /**
   * Actualiza el estado de las reservas según las fechas
   * Este método es público para permitir su ejecución manual
   */
  public async updateReservationStatuses(): Promise<{ updated: number, message: string }> {
    try {
      // Obtener fecha actual en formato MM-DD-YYYY
      const now = new Date();
      const todayFormatted = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()} 00:00`;

      // Buscar reservas que necesitan actualización de estado
      const reservations = await ReservationModel.getReservationsForStatusUpdate();

      let updatedCount = 0;

      for (const reservation of reservations) {
        // Extraer solo la parte de la fecha (sin hora) para comparar
        const checkInDateParts = reservation.check_in_date.split(' ')[0]; // MM-DD-YYYY
        const checkOutDateParts = reservation.check_out_date.split(' ')[0]; // MM-DD-YYYY
        
        // Normalizar la fecha actual para comparar solo MM-DD-YYYY
        const todayParts = todayFormatted.split(' ')[0]; // MM-DD-YYYY

        // Verificar si hoy es la fecha de check-in
        if (todayParts === checkInDateParts && reservation.status === 'confirmed') {
          const previousStatus = reservation.status;
          await ReservationModel.updateReservationStatus(reservation.id, 'checked_in');
          await this.sendStatusChangeNotification(reservation.id, previousStatus);
          updatedCount++;
        }
        
        // Verificar si hoy es la fecha de check-out
        else if (todayParts === checkOutDateParts && reservation.status === 'checked_in') {
          const previousStatus = reservation.status;
          await ReservationModel.updateReservationStatus(reservation.id, 'checked_out');
          await this.sendStatusChangeNotification(reservation.id, previousStatus);
          updatedCount++;
        }
      }

      console.log('Status update completed');
      return {
        updated: updatedCount,
        message: `Updated ${updatedCount} reservations`
      };
    } catch (error) {
      console.error('Error updating reservation statuses:', error);
      throw error;
    }
  }

  /**
   * Envía una notificación por email cuando cambia el estado de una reserva
   */
  private async sendStatusChangeNotification(reservationId: number, previousStatus: string): Promise<void> {
    try {
      // Obtener los datos completos de la reserva con la información del cliente
      const reservation = await ReservationModel.getReservationById(reservationId);
      
      if (reservation) {
        // Enviar la notificación por email
        await EmailService.sendStatusChangeNotification(reservation, previousStatus);
      } else {
        console.error(`Could not find reservation ${reservationId} to send notification`);
      }
    } catch (error) {
      console.error(`Error sending notification for reservation ${reservationId}:`, error);
      // No lanzamos el error para evitar que interrumpa el proceso principal
    }
  }
}