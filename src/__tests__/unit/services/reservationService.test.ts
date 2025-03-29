// src/__tests__/services/reservationService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReservationService from '../../../services/reservationService.js';
import { ReservationModel } from '../../../models/reservation.js';
import { ReservationPaymentModel } from '../../../models/reservationPayment.js';
import EmailService from '../../../services/emailService.js';
import PdfService from '../../../services/pdfService.js';
import { Reservation, ReservationWithClient } from '../../../types/reservations.js';
import ReservationPaymentsService from '../../../services/reservationPaymentsService.js';

vi.mock('../../../models/reservation.js');
vi.mock('../../../models/reservationPayment.js');
vi.mock('../../../services/emailService.js');
vi.mock('../../../services/pdfService.js');
vi.mock('../../../services/reservationPaymentsService.js');

describe('ReservationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReservation', () => {
    it('should create a reservation and send confirmation email', async () => {
      const mockReservationData: Reservation = {
        id: 1,
        apartmentId: 1,
        clientId: 1,
        checkInDate: new Date('2023-12-01'),
        checkOutDate: new Date('2023-12-10'),
        nights: 9,
        pricePerNight: 100,
        cleaningFee: 50,
        otherExpenses: 0,
        taxes: 0,
        totalAmount: 950,
        amountPaid: 0,
        amountDue: 950,
        parkingFee: 0,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date()
      };

      const mockReservationWithClient: ReservationWithClient = {
        ...mockReservationData,
        clientEmail: 'test@example.com',
        clientName: 'Test User',
        clientPhone: '1234567890'
      };

      vi.mocked(ReservationModel.createReservation).mockResolvedValueOnce(mockReservationData);
      vi.mocked(ReservationModel.getReservationById).mockResolvedValueOnce(mockReservationWithClient);
      vi.mocked(EmailService.sendConfirmationEmail).mockResolvedValueOnce();

      const result = await ReservationService.createReservation(mockReservationData);

      expect(ReservationModel.createReservation).toHaveBeenCalledWith(mockReservationData);
      expect(ReservationModel.getReservationById).toHaveBeenCalledWith(mockReservationData.id);
      expect(EmailService.sendConfirmationEmail).toHaveBeenCalledWith(mockReservationWithClient.clientEmail, mockReservationWithClient);
      expect(result).toEqual(mockReservationData);
    });
  });

  describe('registerPayment', () => {
    it('should register payment and update reservation', async () => {
      const mockReservation: ReservationWithClient = {
        id: 1,
        apartmentId: 1,
        clientId: 1,
        checkInDate: new Date('2023-12-01'),
        checkOutDate: new Date('2023-12-10'),
        nights: 9,
        pricePerNight: 100,
        cleaningFee: 50,
        otherExpenses: 0,
        taxes: 0,
        totalAmount: 950,
        amountPaid: 0,
        amountDue: 950,
        parkingFee: 0,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date(),
        clientEmail: 'test@example.com',
        clientName: 'Test User',
        clientPhone: '1234567890'
      };

      const mockUpdatedReservation: ReservationWithClient = {
        ...mockReservation,
        amountPaid: 300,
        amountDue: 650,
        paymentStatus: 'partial'
      };

      vi.mocked(ReservationModel.getReservationById).mockResolvedValueOnce(mockReservation);
      vi.mocked(ReservationPaymentsService.createPayment).mockResolvedValueOnce({
        id: 1,
        reservationId: 1,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: 'tarjeta',
        paymentReference: 'xyz123'
      });
      vi.mocked(ReservationModel.getReservationById).mockResolvedValueOnce(mockUpdatedReservation);

      const result = await ReservationService.registerPayment(1, 300, 'tarjeta', 'xyz123');

      expect(ReservationModel.getReservationById).toHaveBeenCalledWith(1);
      expect(ReservationPaymentsService.createPayment).toHaveBeenCalledWith({
        reservationId: 1,
        amount: 300,
        paymentMethod: 'tarjeta',
        paymentReference: 'xyz123'
      });
      expect(result).toEqual(mockUpdatedReservation);
    });

    it('should throw error when reservation not found', async () => {
      vi.mocked(ReservationModel.getReservationById).mockResolvedValueOnce(null);

      await expect(ReservationService.registerPayment(1, 300, 'tarjeta', 'xyz123')).rejects.toThrow('Reservation not found');
    });
  });

  describe('generateAndSendPDF', () => {
    it('should generate PDF and send email', async () => {
      const mockReservation: ReservationWithClient = {
        id: 1,
        apartmentId: 1,
        clientId: 1,
        checkInDate: new Date('2023-12-01'),
        checkOutDate: new Date('2023-12-10'),
        nights: 9,
        pricePerNight: 100,
        cleaningFee: 50,
        otherExpenses: 0,
        taxes: 0,
        totalAmount: 950,
        amountPaid: 0,
        amountDue: 950,
        parkingFee: 0,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date(),
        clientEmail: 'test@example.com',
        clientName: 'Test User',
        clientPhone: '1234567890'
      };

      const mockPdfPath = '/path/to/pdf';

      vi.mocked(ReservationModel.getReservationById).mockResolvedValueOnce(mockReservation);
      vi.mocked(PdfService.generateInvoicePdf).mockResolvedValueOnce(mockPdfPath);
      vi.mocked(EmailService.sendReservationPdf).mockResolvedValueOnce();

      const result = await ReservationService.generateAndSendPDF(1);

      expect(ReservationModel.getReservationById).toHaveBeenCalledWith(1);
      expect(PdfService.generateInvoicePdf).toHaveBeenCalledWith(mockReservation);
      expect(EmailService.sendReservationPdf).toHaveBeenCalledWith(mockReservation, mockPdfPath);
      expect(result).toBe(mockPdfPath);
    });
  });
});