import cron from 'node-cron';
import { ReservationModel } from '../models/reservation.js';
import db from '../utils/db_render.js';
import { QueryResult } from 'pg';
import EmailService from './emailService.js';

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
      console.log('Executing automatic status update...');
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
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparación de fechas
      
      console.log('Ejecutando actualización de estados:', today.toISOString());

      // Buscar reservas que necesitan actualización de estado
      const result = await db.query(`
        SELECT id, check_in_date, check_out_date, status
        FROM reservations
        WHERE status IN ('confirmed', 'checked_in')
      `);

      const reservations = result.rows;
      console.log(`Found ${reservations.length} reservations for possible update`);

      let updatedCount = 0;

      for (const reservation of reservations) {
        const checkInDate = new Date(reservation.check_in_date);
        checkInDate.setHours(0, 0, 0, 0);
        
        const checkOutDate = new Date(reservation.check_out_date);
        checkOutDate.setHours(0, 0, 0, 0);

        // Verificar si hoy es la fecha de check-in
        if (this.areDatesEqual(today, checkInDate) && reservation.status === 'confirmed') {
          const previousStatus = reservation.status;
          await this.updateReservationStatus(reservation.id, 'checked_in');
          // Comentado temporalmente el envío de emails
          // await this.sendStatusChangeNotification(reservation.id, previousStatus);
          console.log(`Reservation ${reservation.id} updated to CHECKED_IN`);
          updatedCount++;
        }
        
        // Verificar si hoy es la fecha de check-out
        else if (this.areDatesEqual(today, checkOutDate) && reservation.status === 'checked_in') {
          const previousStatus = reservation.status;
          await this.updateReservationStatus(reservation.id, 'checked_out');
          // Comentado temporalmente el envío de emails
          // await this.sendStatusChangeNotification(reservation.id, previousStatus);
          console.log(`Reservation ${reservation.id} updated to CHECKED_OUT`);
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
   * Actualiza el estado de una reserva
   */
  private async updateReservationStatus(reservationId: number, newStatus: string): Promise<void> {
    try {
      await db.query(
        'UPDATE reservations SET status = $1 WHERE id = $2',
        [newStatus, reservationId]
      );
    } catch (error) {
      console.error(`Error updating reservation status ${reservationId}:`, error);
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
        console.log(`Notificación enviada para la reserva ${reservationId}`);
      } else {
        console.error(`Could not find reservation ${reservationId} to send notification`);
      }
    } catch (error) {
      console.error(`Error sending notification for reservation ${reservationId}:`, error);
      // No lanzamos el error para evitar que interrumpa el proceso principal
    }
  }

  /**
   * Compara si dos fechas son iguales (ignorando la hora)
   */
  private areDatesEqual(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
} 