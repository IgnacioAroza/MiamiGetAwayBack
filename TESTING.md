# Guía de Testing para MiamiGetAwayBack

Este proyecto utiliza Vitest como framework de testing. A continuación, se detallan las instrucciones para ejecutar las pruebas.

## Configuración del entorno de pruebas

Antes de ejecutar las pruebas, asegúrate de tener instaladas todas las dependencias:

```bash
npm install
```

También necesitarás configurar un archivo `.env.test` con las variables de entorno necesarias para las pruebas. Ya hemos creado este archivo con valores de prueba.

## Ejecutar pruebas con Vitest

Para ejecutar todas las pruebas:

```bash
npm test
```

Para ejecutar pruebas en modo watch (se ejecutan automáticamente al guardar cambios):

```bash
npm run test:watch
```

Para ver la cobertura de código:

```bash
npm run test:coverage
```

Para ejecutar pruebas con interfaz gráfica:

```bash
npm run test:ui
```

## Estructura de las pruebas

Las pruebas están organizadas en las siguientes carpetas:

- `src/__tests__/unit/`: Pruebas unitarias para modelos, controladores y utilidades.
- `src/__tests__/integration/`: Pruebas de integración para las rutas de la API.
- `src/__tests__/mocks/`: Mocks utilizados en las pruebas.

## Convenciones de nomenclatura

- Los archivos de prueba tienen la extensión `.test.ts`.

## Estructura de las pruebas

Una buena prueba unitaria sigue estas prácticas:

1. **Arrange**: Configurar el entorno de prueba (mocks, datos de prueba).
2. **Act**: Ejecutar la función o método a probar.
3. **Assert**: Verificar que el resultado es el esperado.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Mi función', () => {
  beforeEach(() => {
    // Limpiar mocks o restablecer estados
    vi.clearAllMocks();
  });

  it('debería hacer algo específico', () => {
    // Arrange - preparar
    const datos = { /* ... */ };
    
    // Act - ejecutar
    const resultado = miFuncion(datos);
    
    // Assert - verificar
    expect(resultado).toBe(valorEsperado);
  });
});
```

## Solución de problemas comunes

### Problemas con importaciones

Si encuentras errores relacionados con importaciones, asegúrate de que:

1. Las extensiones de archivo estén incluidas en las importaciones (`.js` al final).
2. Los mocks estén configurados correctamente, especialmente para módulos ESM.

### Problemas con tipos

Para resolver problemas de tipos en las pruebas:

1. Utiliza `as unknown as Type` para conversiones de tipo cuando sea necesario.
2. Asegúrate de que los mocks tengan la estructura correcta, especialmente cuando se utilizan con `default exports`.

## Recursos adicionales

- [Documentación de Vitest](https://vitest.dev/)