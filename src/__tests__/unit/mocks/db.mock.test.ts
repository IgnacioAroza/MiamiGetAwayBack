import { describe, it, expect, beforeEach } from 'vitest';
import dbMock from '../../mocks/db.mock.js';

describe('DB Mock', () => {
  beforeEach(() => {
    dbMock.__resetMock();
  });

  it('debería devolver filas vacías por defecto', async () => {
    const result = await dbMock.query('SELECT * FROM any_table');
    expect(result.rows).toEqual([]);
  });

  it('debería devolver resultados específicos cuando se configuran', async () => {
    const testData = [{ id: 1, name: 'Test' }];
    dbMock.__setQueryResult(testData);
    
    const result = await dbMock.query('SELECT * FROM any_table');
    expect(result.rows).toEqual(testData);
  });

  it('debería rechazar con un error cuando se configura un error', async () => {
    const testError = new Error('DB Error');
    dbMock.__setQueryError(testError);
    
    await expect(dbMock.query('SELECT * FROM any_table')).rejects.toThrow('DB Error');
  });

  it('debería restablecerse correctamente con resetMock', async () => {
    // Primero configuramos un resultado personalizado
    const testData = [{ id: 1, name: 'Test' }];
    dbMock.__setQueryResult(testData);
    
    // Luego restablecemos el mock
    dbMock.__resetMock();
    
    // Verificamos que vuelve al estado inicial
    const result = await dbMock.query('SELECT * FROM any_table');
    expect(result.rows).toEqual([]);
  });

  it('debería registrar las consultas SQL ejecutadas', async () => {
    const sql = 'SELECT * FROM test_table WHERE id = $1';
    const params = [1];
    
    await dbMock.query(sql, params);
    
    expect(dbMock.query).toHaveBeenCalledWith(sql, params);
  });
}); 