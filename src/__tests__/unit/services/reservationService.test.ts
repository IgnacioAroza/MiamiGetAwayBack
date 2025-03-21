// src/__tests__/services/reservationService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReservationService from '../../../services/reservationService.js';
import { ReservationModel } from '../../../models/reservation.js';
import EmailService from '../../../services/emailService.js';
import PdfService from '../../../services/pdfService.js';
import ReservationPaymentsService from '../../../services/reservationPaymentsService.js';
import { Reservation } from '../../../types/reservations.js';

// Mock de dependencias
vi.mock('../../../models/reservation.js');
vi.mock('../../../services/emailService.js');
vi.mock('../../../services/pdfService.js');
vi.mock('../../../services/reservationPaymentsService.js');

describe('ReservationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReservation', () => {
    it('should create a reservation and send confirmation email', async () => {
      const mockReservationData = {
        apartmentId: 1,
        clientId: 1,
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        clientPhone: '123456789',
        checkInDate: new Date('2023-12-01'),
        checkOutDate: new Date('2023-12-10'),
        nights: 9,
        pricePerNight: 100,
        cleaningFee: 50,
        totalAmount: 950,
        amountPaid: 0,
        amountDue: 950,
        status: 'pending' as const,
        paymentStatus: 'pending' as const
      };
      
      const mockCreatedReservation: Partial<Reservation> = { 
        id: 1, 
        ...mockReservationData,
        otherExpenses: 0,
        taxes: 0,
        parkingFee: 0,
        createdAt: new Date()
      };
      
      vi.mocked(ReservationModel.createReservation).mockResolvedValue(mockCreatedReservation as Reservation);
      
      const result = await ReservationService.createReservation(mockReservationData as any);
      
      expect(ReservationModel.createReservation).toHaveBeenCalledWith(expect.any(Object));
      expect(EmailService.sendConfirmationEmail).toHaveBeenCalledWith(
        mockCreatedReservation.clientEmail,
        mockCreatedReservation as Reservation
      );
      expect(result).toEqual(mockCreatedReservation);
    });
  });

  describe('registerPayment', () => {
    it('should register payment and update reservation', async () => {
      const reservationId = 1;
      const amount = 500;
      const paymentMethod = 'card';
      
      const mockReservation: Partial<Reservation> = {
        id: reservationId,
        totalAmount: 1000,
        amountPaid: 200,
        amountDue: 800,
        status: 'confirmed' as const,
        paymentStatus: 'partial' as const
      };
      
      const mockUpdatedReservation: Partial<Reservation> = {
        ...mockReservation,
        amountPaid: 700,
        amountDue: 300,
        paymentStatus: 'partial' as const
      };
      
      vi.mocked(ReservationPaymentsService.createPayment).mockResolvedValue({ 
        id: 1, 
        reservationId, 
        amount, 
        paymentMethod 
      } as any);
      
      vi.mocked(ReservationModel.getReservationById)
        .mockResolvedValueOnce(mockReservation as Reservation)
        .mockResolvedValueOnce(mockUpdatedReservation as Reservation);
      
      const result = await ReservationService.registerPayment(
        reservationId, 
        amount, 
        paymentMethod
      );
      
      expect(ReservationPaymentsService.createPayment).toHaveBeenCalledWith({
        reservationId,
        amount,
        paymentMethod,
        paymentReference: undefined,
        notes: undefined
      });
      
      expect(result).toEqual(mockUpdatedReservation);
    });
  });

  describe('generateAndSendPDF', () => {
    it('should generate PDF and send email', async () => {
      const reservationId = 1;
      const mockReservation: Partial<Reservation> = { 
        id: reservationId, 
        clientEmail: 'client@example.com'
      };
      const mockPdfPath = '/tmp/reservation-1.pdf';
      
      vi.mocked(ReservationModel.getReservationById).mockResolvedValue(mockReservation as Reservation);
      vi.mocked(PdfService.generateInvoicePdf).mockResolvedValue(mockPdfPath);
      
      const result = await ReservationService.generateAndSendPDF(reservationId);
      
      expect(PdfService.generateInvoicePdf).toHaveBeenCalledWith(mockReservation);
      expect(EmailService.sendReservationPdf).toHaveBeenCalledWith(
        mockReservation,
        mockPdfPath
      );
      expect(result).toBe(mockPdfPath);
    });
  });
});