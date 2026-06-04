import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../utils/db_render.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] })
  }
}));

import ExperienceModel from '../../../models/experience.js';
import db from '../../../utils/db_render.js';

const mockExperience = {
  id: 1,
  title: 'Deep Sea Fishing',
  description: 'Full day fishing trip',
  capacity: 8,
  price: 350,
  images: ['https://example.com/img.jpg'],
  created_at: new Date('2026-06-01'),
};

const mockInquiry = {
  id: 1,
  experience_id: 1,
  name: 'John',
  lastname: 'Doe',
  email: 'john@example.com',
  phone: '305-555-1234',
  status: 'pending',
  created_at: new Date('2026-06-01'),
};

describe('ExperienceModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('devuelve todas las experiences', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockExperience], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await ExperienceModel.getAll();
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM experiences'));
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Deep Sea Fishing');
    });

    it('devuelve array vacío si no hay registros', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
      const result = await ExperienceModel.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('devuelve la experience si existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockExperience], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await ExperienceModel.getById(1);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('devuelve null si no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
      const result = await ExperienceModel.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('inserta y devuelve la experience creada', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockExperience], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await ExperienceModel.create({ title: 'Deep Sea Fishing', description: 'Full day fishing trip', capacity: 8, price: 350, images: [] });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO experiences'), expect.any(Array));
      expect(result.title).toBe('Deep Sea Fishing');
    });

    it('maneja campos opcionales como null', async () => {
      const row = { ...mockExperience, description: null, capacity: null, price: null };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [row], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await ExperienceModel.create({ title: 'Minimal Experience' });
      expect(result.description).toBeNull();
      expect(result.price).toBeNull();
    });
  });

  describe('update', () => {
    it('actualiza solo los campos enviados', async () => {
      const updated = { ...mockExperience, title: 'Updated Title' };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [updated], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });
      const result = await ExperienceModel.update(1, { title: 'Updated Title' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE experiences'), expect.arrayContaining(['Updated Title', 1]));
      expect(result.title).toBe('Updated Title');
    });

    it('lanza error si no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });
      await expect(ExperienceModel.update(999, { title: 'X' })).rejects.toThrow('Experience not found');
    });

    it('lanza error si no hay campos válidos', async () => {
      await expect(ExperienceModel.update(1, {})).rejects.toThrow('No valid fields to update');
    });
  });

  describe('delete', () => {
    it('elimina la experience', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockExperience], rowCount: 1, command: 'DELETE', oid: 0, fields: [] });
      await expect(ExperienceModel.delete(1)).resolves.toBeUndefined();
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM experiences'), [1]);
    });

    it('lanza error si no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] });
      await expect(ExperienceModel.delete(999)).rejects.toThrow('Experience not found');
    });
  });

  describe('createInquiry', () => {
    it('inserta y devuelve el inquiry', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockInquiry], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await ExperienceModel.createInquiry({ name: 'John', lastname: 'Doe', email: 'john@example.com' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO experience_inquiries'), expect.any(Array));
      expect(result.status).toBe('pending');
    });

    it('acepta inquiry sin experience_id (consulta general)', async () => {
      const generalInquiry = { ...mockInquiry, experience_id: null };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [generalInquiry], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await ExperienceModel.createInquiry({ name: 'Jane', lastname: 'Smith', email: 'jane@example.com' });
      expect(result.experience_id).toBeNull();
    });
  });

  describe('getAllInquiries', () => {
    it('devuelve todos los inquiries con JOIN a experiences', async () => {
      const rows = [{ ...mockInquiry, experience_title: 'Deep Sea Fishing' }];
      vi.mocked(db.query).mockResolvedValueOnce({ rows, rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await ExperienceModel.getAllInquiries();
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN experiences'));
      expect(result[0]).toHaveProperty('experience_title', 'Deep Sea Fishing');
    });
  });

  describe('updateInquiryStatus', () => {
    it('actualiza el status del inquiry', async () => {
      const updated = { ...mockInquiry, status: 'contacted' };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [updated], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });
      const result = await ExperienceModel.updateInquiryStatus(1, 'contacted');
      expect(result.status).toBe('contacted');
    });

    it('lanza error si el inquiry no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });
      await expect(ExperienceModel.updateInquiryStatus(999, 'contacted')).rejects.toThrow('Inquiry not found');
    });
  });

  describe('parseImages', () => {
    it('parsea images como JSON string', async () => {
      const row = { ...mockExperience, images: '["https://example.com/img.jpg"]' };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await ExperienceModel.getById(1);
      expect(Array.isArray(result?.images)).toBe(true);
      expect(result?.images?.[0]).toBe('https://example.com/img.jpg');
    });

    it('devuelve array vacío si images es null', async () => {
      const row = { ...mockExperience, images: null };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await ExperienceModel.getById(1);
      expect(result?.images).toEqual([]);
    });
  });
});
