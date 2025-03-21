import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReservationController } from '../../../controllers/reservation.js';
import ReservationService from '../../../services/reservationService.js';

// Mock de dependencias
vi.mock('../../../services/reservationService.js');

describe('ReservationController', () => {
  let req: any;
  let res: any;
  
  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {}
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    vi.clearAllMocks();
  });

  describe('getAllReservations', () => {
    it('should apply filters from query params', async () => {
      req.query = {
        startDate: '2023-01-01',
        endDate: '2023-01-10',
        status: 'confirmed',
        clientName: 'John'
      };
      
      const mockReservations = [{ id: 1 }, { id: 2 }];
      vi.mocked(ReservationService.getAllReservations).mockResolvedValue(mockReservations as any);
      
      await ReservationController.getAllReservations(req, res);
      
      expect(ReservationService.getAllReservations).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        status: 'confirmed',
        clientName: 'John'
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReservations);
    });
  });

  describe('registerPayment', () => {
    it('should register payment with valid data', async () => {
      req.params = { id: '1' };
      req.body = { 
        amount: 300,
        paymentMethod: 'card',
        paymentReference: 'xyz123'
      };
      
      const mockUpdatedReservation = { 
        id: 1, 
        amountPaid: 300,
        paymentStatus: 'partial'
      };
      
      vi.mocked(ReservationService.registerPayment).mockResolvedValue(mockUpdatedReservation as any);
      
      await ReservationController.registerPayment(req, res);
      
      expect(ReservationService.registerPayment).toHaveBeenCalledWith(
        1,
        300,
        'card',
        'xyz123',
        undefined
      );
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdatedReservation);
    });
  });

  describe('generatePdf', () => {
    it('should generate and send PDF', async () => {
      req.params = { id: '1' };
      const mockPdfPath = '/tmp/reservation-1.pdf';
      
      vi.mocked(ReservationService.generateAndSendPDF).mockResolvedValue(mockPdfPath);
      
      await ReservationController.generatePdf(req, res);
      
      expect(ReservationService.generateAndSendPDF).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.any(String),
        pdfPath: mockPdfPath
      });
    });
  });
});