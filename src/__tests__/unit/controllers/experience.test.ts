import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../../services/imageService.js', () => ({
  default: {
    uploadImages: vi.fn().mockResolvedValue({ success: true, urls: ['https://test-url.com/img.jpg'], errors: [] }),
    deleteImages: vi.fn().mockResolvedValue({ success: true, errors: [] }),
    optimizeForContext: vi.fn().mockImplementation((images: string[]) => ({ images, responsiveImages: [] }))
  }
}));

vi.mock('../../../models/experience.js', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    createInquiry: vi.fn().mockResolvedValue({}),
    getAllInquiries: vi.fn().mockResolvedValue([]),
    updateInquiryStatus: vi.fn().mockResolvedValue({}),
  }
}));

vi.mock('../../../schemas/experienceSchema.js', () => ({
  validateExperience: vi.fn().mockReturnValue({ success: true, data: {} }),
  validatePartialExperience: vi.fn().mockReturnValue({ success: true, data: {} }),
  validateInquiry: vi.fn().mockReturnValue({ success: true, data: {} }),
  validateInquiryStatus: vi.fn().mockReturnValue({ success: true, data: { status: 'contacted' } }),
}));

vi.mock('../../../services/emailService.js', () => ({
  default: {
    sendExperienceInquiryNotification: vi.fn().mockResolvedValue(undefined),
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

import ExperienceController from '../../../controllers/experience.js';
import ExperienceModel from '../../../models/experience.js';
import EmailService from '../../../services/emailService.js';
import * as schema from '../../../schemas/experienceSchema.js';

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

const mockExperience = { id: 1, title: 'Deep Sea Fishing', description: null, capacity: 8, price: 350, images: [], created_at: new Date() };
const mockInquiry = { id: 1, experience_id: null, name: 'John', lastname: 'Doe', email: 'john@example.com', phone: null, status: 'pending', created_at: new Date() };

describe('ExperienceController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('devuelve 200 con la lista', async () => {
      vi.mocked(ExperienceModel.getAll).mockResolvedValueOnce({ rows: [mockExperience], total: 1 } as any);
      const req = mockReq();
      const res = mockRes();
      await ExperienceController.getAll(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
    });

    it('devuelve 500 si falla el modelo', async () => {
      vi.mocked(ExperienceModel.getAll).mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq();
      const res = mockRes();
      await ExperienceController.getAll(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getById', () => {
    it('devuelve 200 con la experience', async () => {
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(mockExperience as any);
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await ExperienceController.getById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(null);
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await ExperienceController.getById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Experience not found' });
    });
  });

  describe('create', () => {
    it('devuelve 201 al crear', async () => {
      vi.mocked(ExperienceModel.create).mockResolvedValueOnce(mockExperience as any);
      const req = mockReq({ body: { title: 'Deep Sea Fishing' } });
      const res = mockRes();
      await ExperienceController.create(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(ExperienceModel.create).toHaveBeenCalledOnce();
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schema.validateExperience).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({}) }
      } as any);
      const req = mockReq({ body: {} });
      const res = mockRes();
      await ExperienceController.create(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(ExperienceModel.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('devuelve 200 al actualizar', async () => {
      vi.mocked(ExperienceModel.update).mockResolvedValueOnce({ ...mockExperience, title: 'New Title' } as any);
      const req = mockReq({ params: { id: '1' }, body: { title: 'New Title' } });
      const res = mockRes();
      await ExperienceController.update(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(ExperienceModel.update).mockRejectedValueOnce(new Error('Experience not found'));
      const req = mockReq({ params: { id: '999' }, body: { title: 'X' } });
      const res = mockRes();
      await ExperienceController.update(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('delete', () => {
    it('devuelve 200 al eliminar', async () => {
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(mockExperience as any);
      vi.mocked(ExperienceModel.delete).mockResolvedValueOnce(undefined);
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await ExperienceController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Experience and associated images deleted successfully' });
    });

    it('devuelve 404 si no existe', async () => {
      vi.mocked(ExperienceModel.getById).mockResolvedValueOnce(null);
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await ExperienceController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(ExperienceModel.delete).not.toHaveBeenCalled();
    });
  });

  describe('createInquiry', () => {
    it('devuelve 201 y llama al email service', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      vi.mocked(ExperienceModel.createInquiry).mockResolvedValueOnce(mockInquiry as any);
      const req = mockReq({ body: { name: 'John', lastname: 'Doe', email: 'john@example.com' } });
      const res = mockRes();
      await ExperienceController.createInquiry(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      // El email es fire-and-forget; le damos tiempo a que se dispare
      await new Promise(r => setTimeout(r, 10));
      expect(EmailService.sendExperienceInquiryNotification).toHaveBeenCalledWith('admin@test.com', mockInquiry);
      delete process.env.ADMIN_EMAIL;
    });

    it('devuelve 400 si la validación falla', async () => {
      vi.mocked(schema.validateInquiry).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({}) }
      } as any);
      const req = mockReq({ body: { name: 'John' } });
      const res = mockRes();
      await ExperienceController.createInquiry(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(ExperienceModel.createInquiry).not.toHaveBeenCalled();
    });
  });

  describe('getAllInquiries', () => {
    it('devuelve 200 con la lista', async () => {
      vi.mocked(ExperienceModel.getAllInquiries).mockResolvedValueOnce({ rows: [mockInquiry], total: 1 } as any);
      const req = mockReq();
      const res = mockRes();
      await ExperienceController.getAllInquiries(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([mockInquiry]);
    });
  });

  describe('updateInquiryStatus', () => {
    it('devuelve 200 al actualizar el status', async () => {
      const updated = { ...mockInquiry, status: 'contacted' };
      vi.mocked(ExperienceModel.updateInquiryStatus).mockResolvedValueOnce(updated as any);
      const req = mockReq({ params: { id: '1' }, body: { status: 'contacted' } });
      const res = mockRes();
      await ExperienceController.updateInquiryStatus(req, res);
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
      await ExperienceController.updateInquiryStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 404 si el inquiry no existe', async () => {
      vi.mocked(ExperienceModel.updateInquiryStatus).mockRejectedValueOnce(new Error('Inquiry not found'));
      const req = mockReq({ params: { id: '999' }, body: { status: 'contacted' } });
      const res = mockRes();
      await ExperienceController.updateInquiryStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
