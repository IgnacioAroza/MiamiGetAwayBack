import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { NextFunction, Request, Response } from 'express';

vi.mock('../../models/transfer.js', () => ({
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

vi.mock('../../middleware/authMiddleware.js', () => ({
  authMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
  default: (_req: Request, _res: Response, next: NextFunction) => next()
}));

vi.mock('../../utils/cloudinaryConfig.js', () => ({
  default: {
    uploader: {
      upload: vi.fn().mockResolvedValue({ public_id: 'test_id', secure_url: 'https://test-url.com/image.jpg' }),
      upload_stream: vi.fn().mockImplementation((_opts: any, cb: any) => ({
        end: (buf: Buffer) => cb(null, { public_id: 'test_id', secure_url: 'https://test-url.com/image.jpg' })
      })),
      destroy: vi.fn().mockResolvedValue({ result: 'ok' })
    }
  },
  __esModule: true
}));

vi.mock('../../schemas/transferSchema.js', () => ({
  validateVehicle: vi.fn(),
  validatePartialVehicle: vi.fn(),
  validateInquiry: vi.fn(),
  validateInquiryStatus: vi.fn(),
}));

vi.mock('../../services/emailService.js', () => ({
  default: {
    sendTransferInquiryNotification: vi.fn().mockResolvedValue(undefined),
  }
}));

import * as schemaMock from '../../schemas/transferSchema.js';
import app from '../../app.js';
import TransferModel from '../../models/transfer.js';

const originalConsoleError = console.error;

const mockVehicle = { id: 1, name: 'Mercedes Benz S Class', category: 'sedan', capacity: 2, luggage_capacity: 3, description: null, images: [], created_at: '2026-06-03T00:00:00.000Z' };
const mockInquiry = { id: 1, vehicle_id: null, pick_up: 'MIA Airport', drop_off: 'Brickell', date: '06-10-2026', time: '14:00', passengers: 2, service_type: 'airport_transfer', client_name: 'John Doe', client_email: 'john@example.com', client_phone: '305-555-0001', notes: null, status: 'pending', created_at: '2026-06-03T00:00:00.000Z' };

describe('Rutas de Transfers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(schemaMock.validateVehicle).mockReturnValue({ success: true, data: {} } as any);
    vi.mocked(schemaMock.validatePartialVehicle).mockReturnValue({ success: true, data: {} } as any);
    vi.mocked(schemaMock.validateInquiry).mockReturnValue({ success: true, data: {} } as any);
    vi.mocked(schemaMock.validateInquiryStatus).mockReturnValue({ success: true, data: { status: 'confirmed' } } as any);
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  // ── Vehicles ──────────────────────────────────────────────────────────────

  describe('GET /api/transfers/vehicles', () => {
    it('devuelve lista vacía cuando no hay vehículos', async () => {
      vi.mocked(TransferModel.getAllVehicles).mockResolvedValueOnce([]);
      const res = await request(app).get('/api/transfers/vehicles').expect(200);
      expect(res.body).toEqual([]);
    });

    it('devuelve la lista de vehículos', async () => {
      vi.mocked(TransferModel.getAllVehicles).mockResolvedValueOnce([mockVehicle] as any);
      const res = await request(app).get('/api/transfers/vehicles').expect(200);
      expect(res.body).toEqual([mockVehicle]);
      expect(TransferModel.getAllVehicles).toHaveBeenCalledOnce();
    });
  });

  describe('GET /api/transfers/vehicles/:id', () => {
    it('devuelve un vehículo por id', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(mockVehicle as any);
      const res = await request(app).get('/api/transfers/vehicles/1').expect(200);
      expect(res.body).toMatchObject(mockVehicle);
      expect(TransferModel.getVehicleById).toHaveBeenCalledWith(1);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/transfers/vehicles/999').expect(404);
      expect(res.body).toHaveProperty('message', 'Vehicle not found');
    });
  });

  describe('POST /api/transfers/vehicles', () => {
    it('crea un vehículo y devuelve 201', async () => {
      vi.mocked(TransferModel.createVehicle).mockResolvedValueOnce(mockVehicle as any);
      const res = await request(app)
        .post('/api/transfers/vehicles')
        .send({ name: 'Mercedes Benz S Class', category: 'sedan', capacity: 2, luggage_capacity: 3 })
        .expect(201);
      expect(res.body).toEqual(mockVehicle);
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schemaMock.validateVehicle).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { name: ['Name is required'] } }) }
      } as any);
      const res = await request(app).post('/api/transfers/vehicles').send({}).expect(400);
      expect(res.body).toHaveProperty('message', 'Invalid vehicle data');
    });
  });

  describe('PUT /api/transfers/vehicles/:id', () => {
    it('actualiza un vehículo y devuelve 200', async () => {
      const updated = { ...mockVehicle, name: 'Cadillac Escalade' };
      vi.mocked(TransferModel.updateVehicle).mockResolvedValueOnce(updated as any);
      const res = await request(app).put('/api/transfers/vehicles/1').send({ name: 'Cadillac Escalade' }).expect(200);
      expect(res.body).toEqual(updated);
      expect(TransferModel.updateVehicle).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(TransferModel.updateVehicle).mockRejectedValueOnce(new Error('Vehicle not found'));
      const res = await request(app).put('/api/transfers/vehicles/999').send({ name: 'X' }).expect(404);
      expect(res.body).toHaveProperty('message', 'Vehicle not found');
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schemaMock.validatePartialVehicle).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { category: ['Invalid enum value'] } }) }
      } as any);
      const res = await request(app).put('/api/transfers/vehicles/1').send({ category: 'helicopter' }).expect(400);
      expect(res.body).toHaveProperty('message', 'Invalid vehicle data');
    });
  });

  describe('DELETE /api/transfers/vehicles/:id', () => {
    it('elimina un vehículo y devuelve 200', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(mockVehicle as any);
      vi.mocked(TransferModel.deleteVehicle).mockResolvedValueOnce(undefined);
      const res = await request(app).delete('/api/transfers/vehicles/1').expect(200);
      expect(res.body).toHaveProperty('message', 'Vehicle and associated images deleted successfully');
      expect(TransferModel.deleteVehicle).toHaveBeenCalledWith(1);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(TransferModel.getVehicleById).mockResolvedValueOnce(null);
      const res = await request(app).delete('/api/transfers/vehicles/999').expect(404);
      expect(res.body).toHaveProperty('message', 'Vehicle not found');
      expect(TransferModel.deleteVehicle).not.toHaveBeenCalled();
    });
  });

  // ── Inquiries ─────────────────────────────────────────────────────────────

  describe('POST /api/transfers/inquiries', () => {
    it('crea un inquiry y devuelve 201', async () => {
      vi.mocked(TransferModel.createInquiry).mockResolvedValueOnce(mockInquiry as any);
      const res = await request(app)
        .post('/api/transfers/inquiries')
        .send({ pick_up: 'MIA Airport', drop_off: 'Brickell', date: '06-10-2026', time: '14:00', passengers: 2, service_type: 'airport_transfer', client_name: 'John Doe', client_email: 'john@example.com', client_phone: '305-555-0001' })
        .expect(201);
      expect(res.body).toEqual(mockInquiry);
      expect(TransferModel.createInquiry).toHaveBeenCalledOnce();
    });

    it('crea un inquiry con vehicle_id', async () => {
      const withVehicle = { ...mockInquiry, vehicle_id: 1, vehicle_name: 'Mercedes Benz S Class' };
      vi.mocked(TransferModel.createInquiry).mockResolvedValueOnce(withVehicle as any);
      const res = await request(app)
        .post('/api/transfers/inquiries')
        .send({ vehicle_id: 1, pick_up: 'MIA Airport', drop_off: 'Brickell', date: '06-10-2026', time: '14:00', passengers: 2, service_type: 'airport_transfer', client_name: 'John Doe', client_email: 'john@example.com', client_phone: '305-555-0001' })
        .expect(201);
      expect(res.body.vehicle_id).toBe(1);
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schemaMock.validateInquiry).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { client_email: ['Invalid email address'] } }) }
      } as any);
      const res = await request(app)
        .post('/api/transfers/inquiries')
        .send({ client_email: 'not-an-email' })
        .expect(400);
      expect(res.body).toHaveProperty('message', 'Invalid inquiry data');
    });
  });

  describe('GET /api/transfers/inquiries', () => {
    it('devuelve la lista de inquiries', async () => {
      const mock = [
        { ...mockInquiry, vehicle_name: null },
        { ...mockInquiry, id: 2, vehicle_id: 1, vehicle_name: 'Mercedes Benz S Class' },
      ];
      vi.mocked(TransferModel.getAllInquiries).mockResolvedValueOnce(mock as any);
      const res = await request(app).get('/api/transfers/inquiries').expect(200);
      expect(res.body).toEqual(mock);
      expect(TransferModel.getAllInquiries).toHaveBeenCalledOnce();
    });
  });

  describe('PATCH /api/transfers/inquiries/:id', () => {
    it('actualiza el status de un inquiry', async () => {
      const updated = { ...mockInquiry, status: 'confirmed' };
      vi.mocked(TransferModel.updateInquiryStatus).mockResolvedValueOnce(updated as any);
      const res = await request(app)
        .patch('/api/transfers/inquiries/1')
        .send({ status: 'confirmed' })
        .expect(200);
      expect(res.body.status).toBe('confirmed');
      expect(TransferModel.updateInquiryStatus).toHaveBeenCalledWith(1, 'confirmed');
    });

    it('devuelve 400 si el status es inválido', async () => {
      vi.mocked(schemaMock.validateInquiryStatus).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { status: ['Invalid enum value'] } }) }
      } as any);
      const res = await request(app)
        .patch('/api/transfers/inquiries/1')
        .send({ status: 'invalid_status' })
        .expect(400);
      expect(res.body).toHaveProperty('message', 'Invalid status');
    });

    it('devuelve 404 si el inquiry no existe', async () => {
      vi.mocked(TransferModel.updateInquiryStatus).mockRejectedValueOnce(new Error('Inquiry not found'));
      const res = await request(app)
        .patch('/api/transfers/inquiries/999')
        .send({ status: 'confirmed' })
        .expect(404);
      expect(res.body).toHaveProperty('message', 'Inquiry not found');
    });
  });
});
