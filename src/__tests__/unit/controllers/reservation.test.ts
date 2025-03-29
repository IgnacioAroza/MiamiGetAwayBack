import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { ReservationController } from '../../../controllers/reservation.js';
import ReservationService from '../../../services/reservationService.js';
import { Reservation } from '../../../types/reservations.js';
import { validateReservation } from '../../../schemas/reservationSchema.js';

// Mock de dependencias
vi.mock('../../../services/reservationService.js');
vi.mock('../../../schemas/reservationSchema.js', () => ({
    validateReservation: vi.fn(),
    validatePartialReservation: vi.fn()
}));

describe('ReservationController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    responseObject = {
      statusCode: 0,
      body: {}
    };
    
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: vi.fn().mockImplementation((code) => {
        responseObject.statusCode = code;
        return mockResponse;
      }),
      json: vi.fn().mockImplementation((data) => {
        responseObject.body = data;
        return mockResponse;
      })
    };
  });

  describe('getAllReservations', () => {
    it('should apply filters from query params', async () => {
      const mockFilters = {
        startDate: '2023-12-01',
        endDate: '2023-12-31',
        status: 'pending'
      };

      const mockReservations: Reservation[] = [
        {
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
        }
      ];

      mockRequest.query = mockFilters;
      vi.mocked(ReservationService.getAllReservations).mockResolvedValueOnce(mockReservations);

      await ReservationController.getAllReservations(mockRequest as Request, mockResponse as Response);

      expect(ReservationService.getAllReservations).toHaveBeenCalledWith({
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-31'),
        status: 'pending'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockReservations);
    });
  });

  describe('createReservation', () => {
    it('should create a reservation with valid data', async () => {
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

      mockRequest.body = mockReservationData;
      vi.mocked(validateReservation).mockReturnValue({ success: true, data: mockReservationData });
      vi.mocked(ReservationService.createReservation).mockResolvedValueOnce(mockReservationData);

      await ReservationController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(validateReservation).toHaveBeenCalledWith(mockReservationData);
      expect(ReservationService.createReservation).toHaveBeenCalledWith(mockReservationData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockReservationData);
    });
  });

  describe('registerPayment', () => {
    it('should register payment with valid data', async () => {
      const mockPaymentData = {
        amount: 300,
        paymentMethod: 'tarjeta',
        paymentReference: 'xyz123',
        notes: 'Test payment'
      };

      const mockUpdatedReservation: Reservation = {
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
        amountPaid: 300,
        amountDue: 650,
        parkingFee: 0,
        status: 'pending',
        paymentStatus: 'partial',
        createdAt: new Date()
      };

      mockRequest.params = { id: '1' };
      mockRequest.body = mockPaymentData;
      vi.mocked(ReservationService.registerPayment).mockResolvedValueOnce(mockUpdatedReservation);

      await ReservationController.registerPayment(mockRequest as Request, mockResponse as Response);

      expect(ReservationService.registerPayment).toHaveBeenCalledWith(
        1,
        300,
        'tarjeta',
        'xyz123',
        'Test payment'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedReservation);
    });
  });

  describe('generatePdf', () => {
    it('should generate and send PDF', async () => {
      const reservationId = 1;
      const mockPdfPath = '/path/to/pdf';

      mockRequest.params = { id: reservationId.toString() };
      vi.mocked(ReservationService.generateAndSendPDF).mockResolvedValueOnce(mockPdfPath);

      await ReservationController.generatePdf(mockRequest as Request, mockResponse as Response);

      expect(ReservationService.generateAndSendPDF).toHaveBeenCalledWith(reservationId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: 'PDF generated and sent successfully',
        pdfPath: mockPdfPath
      });
    });
  });
});