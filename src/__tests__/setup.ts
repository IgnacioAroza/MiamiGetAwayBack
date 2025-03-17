// Este archivo configura el entorno global para las pruebas de Vitest
import { vi, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Cargar variables de entorno para pruebas
dotenv.config({ path: '.env.test' });

// Mock para la base de datos
vi.mock('../utils/db_render.js', () => ({
  default: {
    query: vi.fn().mockImplementation(() => Promise.resolve({ rows: [] }))
  }
}));

// Configuración para procesar las imágenes
class MockFile {
  parts: any[];
  filename: string;
  properties: any;

  constructor(parts: any[], filename: string, properties: any) {
    this.parts = parts;
    this.filename = filename;
    this.properties = properties;
  }
}

// Establecer File globalmente
(global as any).File = MockFile;

// Configuración para solicitudes HTTP
(global as any).fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ok: true
  })
);

// Configurar mocks globales
vi.mock('../schemas/apartmentSchema.js', () => ({
  validateApartment: vi.fn().mockReturnValue({ 
    success: true,
    data: {} 
  })
}));

// Mock para cloudinary
vi.mock('../utils/cloudinary.js', () => ({
  uploadImage: vi.fn().mockResolvedValue({ secure_url: 'https://test-image-url.com' }),
  deleteImage: vi.fn().mockResolvedValue({ result: 'ok' })
}));

// Mock para cloudinaryConfig
vi.mock('../utils/cloudinaryConfig.js', () => ({
  uploader: {
    upload: vi.fn().mockResolvedValue({ 
      public_id: 'test_public_id',
      secure_url: 'https://test-url.com/image.jpg'
    }),
    destroy: vi.fn().mockResolvedValue({ result: 'ok' })
  }
}));

// Limpiar todos los mocks después de cada prueba
afterEach(() => {
  vi.clearAllMocks();
}); 