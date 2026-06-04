import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../../services/imageService.js', () => ({
  default: {
    uploadImages: vi.fn().mockResolvedValue({ success: true, urls: ['https://test-url.com/img.jpg'], errors: [] }),
    deleteImages: vi.fn().mockResolvedValue({ success: true, errors: [] }),
    optimizeForContext: vi.fn().mockImplementation((images: string[]) => ({ images, responsiveImages: [] }))
  }
}));

vi.mock('../../../models/transfer.js', () => ({
  default: {
    getAllVehicles: vi.fn().mockResolvedValue([]),
    getVehicleById: vi.fn().mockResolvedValue(null),
    createVehicle: vi.fn().mockResolvedValue({}),
    updateVehicle: vi.fn().mockResolvedValue({}),
    deleteVehicle: vi.fn().mockResolvedValue(undefined),
    createInquiry: vi.fn().mockResolvedValue({}),
    getAllInquiries: vi.fn().mockResolvedValue([]),
    updateInquiryStatus: vi.fn().mockResolvedValue({}),
  }
}));

vi.mock('../../../schemas/transferSchema.js', () => ({
  validateVehicle: vi.fn().mockReturnValue({ success: true, data: {} }),
  validatePartialVehicle: vi.fn().mockReturnValue({ success: true, data: {} }),
  validateInquiry: vi.fn().mockReturnValue({ success: true, data: {} }),
  validateInquiryStatus: vi.fn().mockReturnValue({ success: true, data: { status: 'confirmed' } }),
}));

vi.mock('../../../services/emailService.js', () => ({
  default: {
    sendTransferInquiryNotification: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../../../utils/cloudinaryConfig.js', () => ({
  default: {
    uploader: {
      upload: vi.fn().mockResolvedValue({ public_id: 'test_id', secure_url: 'https://test-url.com/img.jpg' }),
      destroy: vi.fn().mockResolvedValue({ result: 'ok' })
    }
  },
  __esModule: true
}));

import TransferController from '../../../controllers/transfer.js';
import TransferModel from '../../../models/transfer.js';
import EmailService from '../../../services/emailService.js';
import * as schema from '../../../schemas/transferSchema.js';

const mockReq = (overrides: Partial<Request> = {}): Request => ({
  params: {},
  body: {},
  files: [],
  query: {},
  ...overrides,
} as unknown as Request);

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
};

const mockVehicle = { id: 1, name: 'Mercedes Benz S Class', category: 'sedan', capacity: 2, luggage_capacity: 3, description: null, images: [], created_at: new Date() };
const mockInquiry = { id: 1, vehicle_id: null, vehicle_name: null, pick_up: 'MIA Airport', drop_off: 'Brickell', date: '06-10-2026', time: '14:00', passengers: 2, service_type: 'airport_transfer', client_name: 'John Doe', client_email: 'john@example.com', client_phone: '305-555-0001', notes: null, status: 'pending', created_at: new Date() };

describe('TransferController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Vehicles ──────────────────────────────────────────────────────────────

  describe('getAllVehicles', () => {
    it('devuelve 200 con la lista', async () => {
      vi.mocked(TransferModel.getAllVehicles).mockResolvedValueOnce({ rows: [mockVehicle], total: 1 } as any);
      const req = mockReq();
      const res = mockRes();
      await TransferController.getAllVehicles(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
    });

    it('devuelve 500 si falla el modelo', async () => {
      vi.mocked(TransferModel.getAllVehicles).mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq();
      const res = mockRes();
      await TransferController.getAllVehicles(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getVehicleById', () => {
    it('devuelve 200 con el vehículo', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(mockVehicle as any);
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await TransferController.getVehicleById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(null);
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await TransferController.getVehicleById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Vehicle not found' });
    });
  });

  describe('createVehicle', () => {
    it('devuelve 201 al crear', async () => {
      vi.mocked(TransferModel.createVehicle).mockResolvedValueOnce(mockVehicle as any);
      const req = mockReq({ body: { name: 'Mercedes Benz S Class', category: 'sedan', capacity: 2, luggage_capacity: 3 } });
      const res = mockRes();
      await TransferController.createVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(TransferModel.createVehicle).toHaveBeenCalledOnce();
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schema.validateVehicle).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({}) }
      } as any);
      const req = mockReq({ body: {} });
      const res = mockRes();
      await TransferController.createVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(TransferModel.createVehicle).not.toHaveBeenCalled();
    });
  });

  describe('updateVehicle', () => {
    it('devuelve 200 al actualizar', async () => {
      vi.mocked(TransferModel.updateVehicle).mockResolvedValueOnce({ ...mockVehicle, name: 'Cadillac Escalade' } as any);
      const req = mockReq({ params: { id: '1' }, body: { name: 'Cadillac Escalade' } });
      const res = mockRes();
      await TransferController.updateVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(TransferModel.updateVehicle).mockRejectedValueOnce(new Error('Vehicle not found'));
      const req = mockReq({ params: { id: '999' }, body: { name: 'X' } });
      const res = mockRes();
      await TransferController.updateVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteVehicle', () => {
    it('devuelve 200 al eliminar', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(mockVehicle as any);
      vi.mocked(TransferModel.deleteVehicle).mockResolvedValueOnce(undefined);
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await TransferController.deleteVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vehicle and associated images deleted successfully' });
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(null);
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await TransferController.deleteVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(TransferModel.deleteVehicle).not.toHaveBeenCalled();
    });
  });

  // ── Inquiries ─────────────────────────────────────────────────────────────

  describe('createInquiry', () => {
    it('devuelve 201 y llama al email service', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      vi.mocked(TransferModel.createInquiry).mockResolvedValueOnce(mockInquiry as any);
      const req = mockReq({ body: { pick_up: 'MIA Airport', drop_off: 'Brickell', date: '06-10-2026', time: '14:00', passengers: 2, service_type: 'airport_transfer', client_name: 'John Doe', client_email: 'john@example.com', client_phone: '305-555-0001' } });
      const res = mockRes();
      await TransferController.createInquiry(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      await new Promise(r => setTimeout(r, 10));
      expect(EmailService.sendTransferInquiryNotification).toHaveBeenCalledWith('admin@test.com', mockInquiry);
      delete process.env.ADMIN_EMAIL;
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schema.validateInquiry).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({}) }
      } as any);
      const req = mockReq({ body: {} });
      const res = mockRes();
      await TransferController.createInquiry(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(TransferModel.createInquiry).not.toHaveBeenCalled();
    });
  });

  describe('getAllInquiries', () => {
    it('devuelve 200 con la lista', async () => {
      vi.mocked(TransferModel.getAllInquiries).mockResolvedValueOnce({ rows: [mockInquiry], total: 1 } as any);
      const req = mockReq();
      const res = mockRes();
      await TransferController.getAllInquiries(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([mockInquiry]);
    });
  });

  describe('updateInquiryStatus', () => {
    it('devuelve 200 al actualizar el status', async () => {
      const updated = { ...mockInquiry, status: 'confirmed' };
      vi.mocked(TransferModel.updateInquiryStatus).mockResolvedValueOnce(updated as any);
      const req = mockReq({ params: { id: '1' }, body: { status: 'confirmed' } });
      const res = mockRes();
      await TransferController.updateInquiryStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('devuelve 400 si el status es inválido', async () => {
      vi.mocked(schema.validateInquiryStatus).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({}) }
      } as any);
      const req = mockReq({ params: { id: '1' }, body: { status: 'bad' } });
      const res = mockRes();
      await TransferController.updateInquiryStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 404 si el inquiry no existe', async () => {
      vi.mocked(TransferModel.updateInquiryStatus).mockRejectedValueOnce(new Error('Inquiry not found'));
      const req = mockReq({ params: { id: '999' }, body: { status: 'confirmed' } });
      const res = mockRes();
      await TransferController.updateInquiryStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
