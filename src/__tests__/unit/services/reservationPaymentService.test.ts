import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReservationPaymentsService from '../../../services/reservationPaymentsService.js';
import { ReservationPaymentModel } from '../../../models/reservationPayment.js';
import { ReservationModel } from '../../../models/reservation.js';
import EmailService from '../../../services/emailService.js';
import db from '../../../utils/db_render.js';
import { Reservation } from '../../../types/reservations.js';
import { ReservationPayment } from '../../../types/reservationPayments.js';

// Mock de dependencias
vi.mock('../../../models/reservationPayment.js');
vi.mock('../../../models/reservation.js');
vi.mock('../../../services/emailService.js');
vi.mock('../../../utils/db_render.js');

describe('ReservationPaymentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create payment, update reservation and send notification', async () => {
      const paymentData = {
        reservationId: 1,
        amount: 300,
        paymentMethod: 'card',
        paymentReference: 'xyz123'
      };
      
      const mockReservation: Partial<Reservation> = {
        id: 1,
        amountPaid: 200,
        amountDue: 800,
        totalAmount: 1000,
        clientEmail: 'client@example.com',
        paymentStatus: 'partial' as const
      };
      
      const mockUpdatedReservation: Partial<Reservation> = {
        ...mockReservation,
        amountPaid: 500,
        amountDue: 500,
        paymentStatus: 'partial' as const
      };
      
      const mockPayment: Partial<ReservationPayment> = {
        id: 1,
        reservationId: paymentData.reservationId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod as 'card',
        paymentReference: paymentData.paymentReference,
        paymentDate: new Date()
      };
      
      vi.mocked(ReservationModel.getReservationById).mockResolvedValue(mockReservation as Reservation);
      vi.mocked(ReservationPaymentModel.createReservationPayment).mockResolvedValue(mockPayment as ReservationPayment);
      vi.mocked(ReservationModel.updateReservation).mockResolvedValue(mockUpdatedReservation as Reservation);
      
      const result = await ReservationPaymentsService.createPayment(paymentData);
      
      expect(ReservationPaymentModel.createReservationPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId: 1,
          amount: 300,
          paymentMethod: 'card',
          paymentDate: expect.any(Date)
        })
      );
      
      expect(ReservationModel.updateReservation).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          amountPaid: 500,
          amountDue: 500,
          paymentStatus: 'partial'
        })
      );
      
      expect(EmailService.sendPaymentNotification).toHaveBeenCalledWith(
        mockUpdatedReservation,
        300,
        false
      );
      
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentsByReservation', () => {
    it('should return payments for a specific reservation', async () => {
      const reservationId = 1;
      const mockPayments = [
        { id: 1, reservationId, amount: 300 },
        { id: 2, reservationId, amount: 200 }
      ];
      
      vi.mocked(db.query).mockResolvedValue({ rows: mockPayments } as any);
      
      const result = await ReservationPaymentsService.getPaymentsByReservation(reservationId);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('reservation_id = $1'),
        [reservationId]
      );
      
      expect(result).toEqual(mockPayments);
    });
  });
});