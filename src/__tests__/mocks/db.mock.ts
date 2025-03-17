import { vi } from 'vitest';

// Crear un mock más robusto para la base de datos
const query = vi.fn();

// Objeto mockQueryResult que podemos manipular desde los tests
const mockQueryResult: { rows: any[] } = {
  rows: []
};

// Configuración por defecto para retornar filas vacías
query.mockImplementation(() => Promise.resolve(mockQueryResult));

const dbMock = {
  query,
  // Método auxiliar para configurar resultados específicos en los tests
  __setQueryResult(result: any[]) {
    mockQueryResult.rows = result;
  },
  // Método auxiliar para configurar un error en la consulta
  __setQueryError(error: Error) {
    query.mockImplementation(() => Promise.reject(error));
  },
  // Método para resetear el mock
  __resetMock() {
    query.mockReset();
    query.mockImplementation(() => Promise.resolve(mockQueryResult));
    mockQueryResult.rows = [];
  }
};

export default dbMock; 