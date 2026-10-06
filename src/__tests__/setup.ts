// Este archivo configura el entorno global para las pruebas de Vitest
import { vi, afterEach } from 'vitest';
import dotenv from 'dotenv';

const admins = new Map<number, { id: number; username: string; email: string; password: string }>();
let nextAdminId = 1;

// Cargar variables de entorno para pruebas
dotenv.config({ path: '.env.test' });

// Mock para la base de datos
vi.mock('../utils/db_render.js', () => ({
  default: {
    query: vi.fn().mockImplementation((text: string, params: any[] = []) => {
      if (text.includes('DELETE FROM admins') && !text.includes('WHERE')) {
        admins.clear();
        return Promise.resolve({ rows: [] });
      }
      if (text.includes('INSERT INTO admins')) {
        const admin = { id: nextAdminId++, username: params[0], email: params[1], password: params[2] };
        admins.set(admin.id, admin);
        return Promise.resolve({ rows: [{ id: admin.id, username: admin.username, email: admin.email }] });
      }
      if (text.includes('UPDATE admins SET')) {
        const admin = admins.get(Number(params.at(-1)));
        if (admin) admin.username = params[0];
        return Promise.resolve({ rows: [] });
      }
      if (text.includes('DELETE FROM admins WHERE')) {
        const admin = admins.get(Number(params[0]));
        admins.delete(Number(params[0]));
        return Promise.resolve({ rows: admin ? [admin] : [] });
      }
      if (text.includes('SELECT id, username, email FROM admins')) {
        const selected = params.length ? [admins.get(Number(params[0]))] : [...admins.values()];
        return Promise.resolve({ rows: selected.filter(Boolean).map(({ id, username, email }) => ({ id, username, email })) });
      }
      if (text.includes('INSERT INTO villas')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Test Villa",
            description: "A beautiful villa for testing",
            address: "Test Address",
            capacity: 8,
            bathrooms: 3,
            rooms: 4,
            price: 500.5,
            location: "Miami Beach",
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('INSERT INTO yachts')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Test Yacht",
            description: "A beautiful yacht for testing",
            capacity: 10,
            price: 1000.5,
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('SELECT * FROM villas WHERE id')) {
        if (params[0] == 999999) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Test Villa",
            description: "A beautiful villa for testing",
            address: "Test Address",
            capacity: 8,
            bathrooms: 3,
            rooms: 4,
            price: 500.5,
            location: "Miami Beach",
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('SELECT * FROM yachts WHERE id')) {
        if (params[0] == 999999) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Test Yacht",
            description: "A beautiful yacht for testing",
            capacity: 10,
            price: 1000.5,
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('SELECT * FROM villas')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Test Villa",
            description: "A beautiful villa for testing",
            address: "Test Address",
            capacity: 8,
            bathrooms: 3,
            rooms: 4,
            price: 500.5,
            location: "Miami Beach",
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('SELECT * FROM yachts')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Test Yacht",
            description: "A luxury yacht",
            capacity: 10,
            price: 1000.5,
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('UPDATE villas')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Updated Villa",
            description: "A beautiful villa for testing",
            address: "Test Address",
            capacity: 8,
            bathrooms: 3,
            rooms: 4,
            price: 1000.5,
            location: "Miami Beach",
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('UPDATE yachts')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 1, 
            name: "Updated Yacht",
            description: "A luxury yacht",
            capacity: 10,
            price: 1500.5,
            images: ["image1.jpg", "image2.jpg"]
          }] 
        });
      }
      if (text.includes('DELETE FROM villas WHERE id')) {
        if (params[0] == 999999) {
          return Promise.resolve({ rows: [] }); 
        }
        return Promise.resolve({ rows: [{ id: params[0] }] });
      }
      if (text.includes('DELETE FROM yachts WHERE id')) {
        if (params[0] == 999999) {
          return Promise.resolve({ rows: [] }); 
        }
        return Promise.resolve({ rows: [{ id: params[0] }] });
      }
      return Promise.resolve({ rows: [] });
    })
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
vi.mock('../schemas/villaSchema.js', () => ({
  validateVilla: vi.fn().mockReturnValue({ success: true, data: {} }),
  validatePartialVilla: vi.fn().mockImplementation((data: any) => ({ success: true, data }))
}));

vi.mock('../schemas/yachtSchema.js', () => ({
  validateYacht: vi.fn().mockReturnValue({ success: true, data: {} }),
  validatePartialYacht: vi.fn().mockImplementation((data: any) => ({ success: true, data }))
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
