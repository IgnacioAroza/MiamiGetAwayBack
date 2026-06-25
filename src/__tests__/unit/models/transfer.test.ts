import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../utils/db_render.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] })
  }
}));

import TransferModel from '../../../models/transfer.js';
import db from '../../../utils/db_render.js';

const mockVehicle = {
  id: 1,
  name: 'Mercedes Benz S Class',
  category: 'sedan',
  capacity: 2,
  luggage_capacity: 3,
  description: 'Luxury sedan',
  images: ['https://example.com/img.jpg'],
  created_at: new Date('2026-06-03'),
};

const mockInquiry = {
  id: 1,
  vehicle_id: 1,
  pick_up: 'MIA Airport',
  drop_off: 'Brickell',
  date: '06-10-2026',
  time: '14:00',
  passengers: 2,
  service_type: 'airport_transfer',
  client_name: 'John Doe',
  client_email: 'john@example.com',
  client_phone: '305-555-0001',
  notes: null,
  status: 'pending',
  created_at: new Date('2026-06-03'),
};

describe('TransferModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Vehicles ──────────────────────────────────────────────────────────────

  describe('getAllVehicles', () => {
    it('devuelve todos los vehículos', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [mockVehicle], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await TransferModel.getAllVehicles();
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM transfer_vehicles'));
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Mercedes Benz S Class');
      expect(result.total).toBe(1);
    });

    it('devuelve array vacío si no hay registros', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await TransferModel.getAllVehicles();
      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getVehicleById', () => {
    it('devuelve el vehículo si existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockVehicle], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await TransferModel.getVehicleById(1);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('devuelve null si no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
      const result = await TransferModel.getVehicleById(999);
      expect(result).toBeNull();
    });
  });

  describe('createVehicle', () => {
    it('inserta y devuelve el vehículo creado', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockVehicle], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await TransferModel.createVehicle({ name: 'Mercedes Benz S Class', category: 'sedan', capacity: 2, luggage_capacity: 3, description: 'Luxury sedan', images: [] });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO transfer_vehicles'), expect.any(Array));
      expect(result.name).toBe('Mercedes Benz S Class');
    });

    it('maneja descripción como null', async () => {
      const row = { ...mockVehicle, description: null };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [row], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await TransferModel.createVehicle({ name: 'Chevrolet Suburban', category: 'suv', capacity: 6, luggage_capacity: 5 });
      expect(result.description).toBeNull();
    });
  });

  describe('updateVehicle', () => {
    it('actualiza solo los campos enviados', async () => {
      const updated = { ...mockVehicle, name: 'Cadillac Escalade' };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [updated], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });
      const result = await TransferModel.updateVehicle(1, { name: 'Cadillac Escalade' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE transfer_vehicles'), expect.arrayContaining(['Cadillac Escalade', 1]));
      expect(result.name).toBe('Cadillac Escalade');
    });

    it('lanza error si no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });
      await expect(TransferModel.updateVehicle(999, { name: 'X' })).rejects.toThrow('Vehicle not found');
    });

    it('lanza error si no hay campos válidos', async () => {
      await expect(TransferModel.updateVehicle(1, {})).rejects.toThrow('No valid fields to update');
    });
  });

  describe('deleteVehicle', () => {
    it('elimina el vehículo', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockVehicle], rowCount: 1, command: 'DELETE', oid: 0, fields: [] });
      await expect(TransferModel.deleteVehicle(1)).resolves.toBeUndefined();
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM transfer_vehicles'), [1]);
    });

    it('lanza error si no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] });
      await expect(TransferModel.deleteVehicle(999)).rejects.toThrow('Vehicle not found');
    });
  });

  // ── Inquiries ─────────────────────────────────────────────────────────────

  describe('createInquiry', () => {
    it('inserta y devuelve el inquiry', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockInquiry], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await TransferModel.createInquiry({ pick_up: 'MIA Airport', drop_off: 'Brickell', date: '06-10-2026', time: '14:00', passengers: 2, service_type: 'airport_transfer', client_name: 'John Doe', client_email: 'john@example.com', client_phone: '305-555-0001' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO transfer_inquiries'), expect.any(Array));
      expect(result.status).toBe('pending');
    });

    it('acepta inquiry sin vehicle_id', async () => {
      const generalInquiry = { ...mockInquiry, vehicle_id: null, vehicle_name: null };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [generalInquiry], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      const result = await TransferModel.createInquiry({ pick_up: 'Hotel', drop_off: 'MIA Airport', date: '06-11-2026', time: '08:00', passengers: 1, service_type: 'airport_transfer', client_name: 'Jane', client_email: 'jane@example.com', client_phone: '305-555-0002' });
      expect(result.vehicle_id).toBeNull();
    });
  });

  describe('getAllInquiries', () => {
    it('devuelve todos los inquiries con JOIN a transfer_vehicles', async () => {
      const rows = [{ ...mockInquiry, vehicle_name: 'Mercedes Benz S Class' }];
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows, rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await TransferModel.getAllInquiries();
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN transfer_vehicles'));
      expect(result.rows[0]).toHaveProperty('vehicle_name', 'Mercedes Benz S Class');
      expect(result.total).toBe(1);
    });
  });

  describe('updateInquiryStatus', () => {
    it('actualiza el status del inquiry', async () => {
      const updated = { ...mockInquiry, status: 'confirmed' };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [updated], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });
      const result = await TransferModel.updateInquiryStatus(1, 'confirmed');
      expect(result.status).toBe('confirmed');
    });

    it('lanza error si el inquiry no existe', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });
      await expect(TransferModel.updateInquiryStatus(999, 'confirmed')).rejects.toThrow('Inquiry not found');
    });
  });

  describe('parseImages', () => {
    it('parsea images como JSON string', async () => {
      const row = { ...mockVehicle, images: '["https://example.com/img.jpg"]' };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await TransferModel.getVehicleById(1);
      expect(Array.isArray(result?.images)).toBe(true);
      expect(result?.images?.[0]).toBe('https://example.com/img.jpg');
    });

    it('devuelve array vacío si images es null', async () => {
      const row = { ...mockVehicle, images: null };
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      const result = await TransferModel.getVehicleById(1);
      expect(result?.images).toEqual([]);
    });
  });
});
