import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { NextFunction, Request, Response } from 'express';

vi.mock('../../models/experience.js', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    createInquiry: vi.fn().mockResolvedValue({}),
    getAllInquiries: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
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

vi.mock('../../schemas/experienceSchema.js', () => ({
  validateExperience: vi.fn(),
  validatePartialExperience: vi.fn(),
  validateInquiry: vi.fn(),
  validateInquiryStatus: vi.fn(),
}));

vi.mock('../../services/emailService.js', () => ({
  default: {
    sendExperienceInquiryNotification: vi.fn().mockResolvedValue(undefined),
  }
}));

import * as schemaMock from '../../schemas/experienceSchema.js';
import app from '../../app.js';
import ExperienceModel from '../../models/experience.js';

const originalConsoleError = console.error;

describe('Rutas de Experiences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(schemaMock.validateExperience).mockReturnValue({ success: true, data: {} } as any);
    vi.mocked(schemaMock.validatePartialExperience).mockReturnValue({ success: true, data: {} } as any);
    vi.mocked(schemaMock.validateInquiry).mockReturnValue({ success: true, data: {} } as any);
    vi.mocked(schemaMock.validateInquiryStatus).mockReturnValue({ success: true, data: { status: 'contacted' } } as any);
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  // ── Experiences ──────────────────────────────────────────────────────────

  describe('GET /api/experiences', () => {
    it('devuelve lista vacía cuando no hay experiences', async () => {
      vi.mocked(ExperienceModel.getAll).mockResolvedValueOnce({ rows: [], total: 0 });
      const res = await request(app).get('/api/experiences').expect(200);
      expect(res.body).toEqual([]);
    });

    it('devuelve la lista de experiences', async () => {
      const mock = [{ id: 1, title: 'Deep Sea Fishing', description: null, capacity: 8, price: 350, images: [], created_at: '2026-06-01T00:00:00.000Z' }];
      vi.mocked(ExperienceModel.getAll).mockResolvedValueOnce({ rows: mock, total: mock.length });
      const res = await request(app).get('/api/experiences').expect(200);
      expect(res.body).toEqual(mock);
      expect(ExperienceModel.getAll).toHaveBeenCalledOnce();
    });
  });

  describe('GET /api/experiences/:id', () => {
    it('devuelve una experience por id', async () => {
      const mock = { id: 1, title: 'Deep Sea Fishing', description: 'Great trip', capacity: 8, price: 350, images: [], created_at: '2026-06-01T00:00:00.000Z' };
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(mock);
      const res = await request(app).get('/api/experiences/1').expect(200);
      expect(res.body).toMatchObject(mock);
      expect(ExperienceModel.getById).toHaveBeenCalledWith(1);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/experiences/999').expect(404);
      expect(res.body).toHaveProperty('error', 'Experience not found');
    });
  });

  describe('POST /api/experiences', () => {
    it('crea una experience y devuelve 201', async () => {
      const created = { id: 1, title: 'Sunset Tour', description: null, capacity: null, price: null, images: [], created_at: '2026-06-01T00:00:00.000Z' };
      vi.mocked(ExperienceModel.create).mockResolvedValueOnce(created);
      const res = await request(app).post('/api/experiences').send({ title: 'Sunset Tour' }).expect(201);
      expect(res.body).toEqual(created);
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schemaMock.validateExperience).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { title: ['Title is required'] } }) }
      } as any);
      const res = await request(app).post('/api/experiences').send({}).expect(400);
      expect(res.body).toHaveProperty('error', 'Invalid experience data');
    });
  });

  describe('PUT /api/experiences/:id', () => {
    it('actualiza una experience y devuelve 200', async () => {
      const updated = { id: 1, title: 'Updated Title', description: null, capacity: 10, price: 400, images: [], created_at: '2026-06-01T00:00:00.000Z' };
      vi.mocked(ExperienceModel.update).mockResolvedValueOnce(updated);
      const res = await request(app).put('/api/experiences/1').send({ title: 'Updated Title' }).expect(200);
      expect(res.body).toEqual(updated);
      expect(ExperienceModel.update).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(ExperienceModel.update).mockRejectedValueOnce(new Error('Experience not found'));
      const res = await request(app).put('/api/experiences/999').send({ title: 'X' }).expect(404);
      expect(res.body).toHaveProperty('error', 'Experience not found');
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schemaMock.validatePartialExperience).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { price: ['Price must be a positive number'] } }) }
      } as any);
      const res = await request(app).put('/api/experiences/1').send({ price: -1 }).expect(400);
      expect(res.body).toHaveProperty('error', 'Invalid experience data');
    });
  });

  describe('DELETE /api/experiences/:id', () => {
    it('elimina una experience y devuelve 200', async () => {
      const mock = { id: 1, title: 'To Delete', images: [] };
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(mock as any);
      vi.mocked(ExperienceModel.delete).mockResolvedValueOnce(undefined);
      const res = await request(app).delete('/api/experiences/1').expect(200);
      expect(res.body).toHaveProperty('message', 'Experience and associated images deleted successfully');
      expect(ExperienceModel.delete).toHaveBeenCalledWith(1);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(null);
      const res = await request(app).delete('/api/experiences/999').expect(404);
      expect(res.body).toHaveProperty('error', 'Experience not found');
      expect(ExperienceModel.delete).not.toHaveBeenCalled();
    });
  });

  // ── Inquiries ─────────────────────────────────────────────────────────────

  describe('POST /api/experiences/inquiries', () => {
    it('crea un inquiry y devuelve 201', async () => {
      const created = { id: 1, experience_id: null, name: 'John', lastname: 'Doe', email: 'john@example.com', phone: null, status: 'pending', created_at: '2026-06-01T00:00:00.000Z' };
      vi.mocked(ExperienceModel.createInquiry).mockResolvedValueOnce(created);
      const res = await request(app)
        .post('/api/experiences/inquiries')
        .send({ name: 'John', lastname: 'Doe', email: 'john@example.com' })
        .expect(201);
      expect(res.body).toEqual(created);
      expect(ExperienceModel.createInquiry).toHaveBeenCalledOnce();
    });

    it('crea un inquiry asociado a una experience', async () => {
      const created = { id: 2, experience_id: 1, name: 'Jane', lastname: 'Smith', email: 'jane@example.com', phone: '305-555-0000', status: 'pending', created_at: '2026-06-01T00:00:00.000Z' };
      vi.mocked(ExperienceModel.createInquiry).mockResolvedValueOnce(created);
      const res = await request(app)
        .post('/api/experiences/inquiries')
        .send({ experience_id: 1, name: 'Jane', lastname: 'Smith', email: 'jane@example.com', phone: '305-555-0000' })
        .expect(201);
      expect(res.body.experience_id).toBe(1);
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schemaMock.validateInquiry).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { email: ['Invalid email address'] } }) }
      } as any);
      const res = await request(app)
        .post('/api/experiences/inquiries')
        .send({ name: 'John', lastname: 'Doe', email: 'not-an-email' })
        .expect(400);
      expect(res.body).toHaveProperty('error', 'Invalid inquiry data');
    });
  });

  describe('GET /api/experiences/inquiries', () => {
    it('devuelve la lista de inquiries', async () => {
      const mock = [
        { id: 1, experience_id: 1, experience_title: 'Deep Sea Fishing', name: 'John', lastname: 'Doe', email: 'john@example.com', phone: null, status: 'pending', created_at: '2026-06-01T00:00:00.000Z' },
        { id: 2, experience_id: null, experience_title: null, name: 'Jane', lastname: 'Smith', email: 'jane@example.com', phone: null, status: 'contacted', created_at: '2026-06-01T01:00:00.000Z' },
      ];
      vi.mocked(ExperienceModel.getAllInquiries).mockResolvedValueOnce({ rows: mock, total: mock.length });
      const res = await request(app).get('/api/experiences/inquiries').expect(200);
      expect(res.body).toEqual(mock);
      expect(ExperienceModel.getAllInquiries).toHaveBeenCalledOnce();
    });
  });

  describe('PATCH /api/experiences/inquiries/:id', () => {
    it('actualiza el status de un inquiry', async () => {
      const updated = { id: 1, experience_id: null, name: 'John', lastname: 'Doe', email: 'john@example.com', phone: null, status: 'contacted', created_at: '2026-06-01T00:00:00.000Z' };
      vi.mocked(ExperienceModel.updateInquiryStatus).mockResolvedValueOnce(updated);
      const res = await request(app)
        .patch('/api/experiences/inquiries/1')
        .send({ status: 'contacted' })
        .expect(200);
      expect(res.body.status).toBe('contacted');
      expect(ExperienceModel.updateInquiryStatus).toHaveBeenCalledWith(1, 'contacted');
    });

    it('devuelve 400 si el status es inválido', async () => {
      vi.mocked(schemaMock.validateInquiryStatus).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: { status: ['Invalid enum value'] } }) }
      } as any);
      const res = await request(app)
        .patch('/api/experiences/inquiries/1')
        .send({ status: 'invalid_status' })
        .expect(400);
      expect(res.body).toHaveProperty('error', 'Invalid status');
    });

    it('devuelve 404 si el inquiry no existe', async () => {
      vi.mocked(ExperienceModel.updateInquiryStatus).mockRejectedValueOnce(new Error('Inquiry not found'));
      const res = await request(app)
        .patch('/api/experiences/inquiries/999')
        .send({ status: 'contacted' })
        .expect(404);
      expect(res.body).toHaveProperty('error', 'Inquiry not found');
    });
  });
});
