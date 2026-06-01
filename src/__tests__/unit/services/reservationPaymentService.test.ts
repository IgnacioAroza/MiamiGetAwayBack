import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReservationPaymentsService from '../../../services/reservationPaymentsService.js';
import { ReservationPaymentModel } from '../../../models/reservationPayment.js';
import { ReservationModel } from '../../../models/reservation.js';
import { Reservation } from '../../../types/reservations.js';
import { ReservationPayment } from '../../../types/reservationPayments.js';

vi.mock('../../../models/reservationPayment.js');
vi.mock('../../../models/reservation.js');
vi.mock('../../../services/imageService.js');

describe('ReservationPaymentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPayment', () => {
    it('creates a payment row with the provided data', async () => {
      const paymentData = {
        reservationId: 1,
        amount: 300,
        paymentMethod: 'card',
        paymentReference: 'xyz123'
      };

      const mockPayment: Partial<ReservationPayment> = {
        id: 1,
        reservationId: 1,
        amount: 300,
        paymentMethod: 'card',
        paymentReference: 'xyz123',
        paymentDate: new Date(),
        receiptImage: null
      };

      vi.mocked(ReservationPaymentModel.createReservationPayment).mockResolvedValue(mockPayment as ReservationPayment);
      vi.mocked(ReservationPaymentModel.getPaymentsByReservation).mockResolvedValue([mockPayment as ReservationPayment]);
      vi.mocked(ReservationModel.getReservationById).mockResolvedValue({ totalAmount: 500 } as any);
      vi.mocked(ReservationModel.updateReservation).mockResolvedValue({} as any);

      const result = await ReservationPaymentsService.createPayment(paymentData);

      expect(ReservationPaymentModel.createReservationPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId: 1,
          amount: 300,
          paymentMethod: 'card',
          paymentDate: expect.any(Date),
          receiptImage: null
        })
      );
      expect(result).toEqual(mockPayment);
    });

    it('throws when reservationId is missing', async () => {
      await expect(
        ReservationPaymentsService.createPayment({ reservationId: 0, amount: 100, paymentMethod: 'cash' })
      ).rejects.toThrow('Valid reservation ID is required');
    });

    it('throws when amount is zero', async () => {
      await expect(
        ReservationPaymentsService.createPayment({ reservationId: 1, amount: 0, paymentMethod: 'cash' })
      ).rejects.toThrow('Valid payment amount is required');
    });
  });

  describe('getPaymentsByReservation', () => {
    it('delegates to the model and returns its result', async () => {
      const reservationId = 1;
      const mockPayments = [
        { id: 1, reservationId, amount: 300 },
        { id: 2, reservationId, amount: 200 }
      ] as ReservationPayment[];

      vi.mocked(ReservationPaymentModel.getPaymentsByReservation).mockResolvedValue(mockPayments);

      const result = await ReservationPaymentsService.getPaymentsByReservation(reservationId);

      expect(ReservationPaymentModel.getPaymentsByReservation).toHaveBeenCalledWith(reservationId);
      expect(result).toEqual(mockPayments);
    });
  });
});
