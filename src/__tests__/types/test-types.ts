import { Request, Response, NextFunction } from 'express';

// Tipos para mocks
export type MockRequest = Partial<Request>;

// Define MockResponse sin extender Response directamente
export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  [key: string]: any;
}

// Extender el módulo global para Jest
declare global {
  namespace jest {
    // Extender el tipo Mock para agregar métodos específicos
    interface Mock {
      mockReturnValue(value: any): jest.Mock;
      mockReturnThis(): jest.Mock;
      mockResolvedValue(value: any): jest.Mock;
      mockRejectedValue(error: any): jest.Mock;
      mockResolvedValueOnce(value: any): jest.Mock;
      mockRejectedValueOnce(error: any): jest.Mock;
      mockImplementation(fn: (...args: any[]) => any): jest.Mock;
    }
  }
}

// Tipos para mocks de base de datos
export interface DbMock {
  query: jest.Mock;
}

// Tipo para modelo mockeable
export interface ApartmentModelMock {
  getAll: jest.Mock;
  getApartmentById: jest.Mock;
  createApartment: jest.Mock;
  updateApartment: jest.Mock;
  deleteApartment: jest.Mock;
} 