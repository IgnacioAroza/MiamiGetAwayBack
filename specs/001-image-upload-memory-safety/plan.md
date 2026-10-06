# Plan — spec 001 backend

## Decisiones

1. Mantener 10 MiB por archivo. Cambiar Multer a `diskStorage` en un directorio propio bajo `os.tmpdir()`, con nombre aleatorio por request. No usar `file.buffer`. La ruta de upload envolverá Multer para borrar el directorio en `finish`, `close` y error; al arrancar, borrará directorios propios dejados por procesos anteriores antes de aceptar requests. Limitar cantidad en cada ruta: 30 para los seis listados (incluido auto), 20 para traslado, 5 comprobantes de proveedor y 1 de reserva. Sin tocar límites de fotos *ya guardadas*.
2. Validar contenido desde disco antes de Cloudinary: firma y decodificación para JPEG/PNG/WebP, con límite de 10 MiB y error que incluya `originalname`, índice y código estable (`FILE_TOO_LARGE`, `INVALID_IMAGE`, `TOO_MANY_FILES`, `UPLOAD_FAILED`). El `mimetype` declarado nunca decide aceptación. Usar la dependencia `sharp` ya instalada para detectar archivos corruptos; medir su memoria en la carga y evitar transformaciones en memoria. Respuesta compatible con `error`/`details` existentes y códigos aptos para traducir en ES/EN.
3. `ImageService.uploadImages` subirá rutas con `cloudinary.uploader.upload(file.path, ...)`; cola con límite **global** de 3 uploads simultáneos, preservando orden de URLs. Esperará a que terminen las tareas activas antes de limpiar. En falla parcial borrará las URLs de esa tanda y devolverá cada fallo con archivo y motivo. Si falla el rollback, registrará el public ID y motivo: un proveedor remoto no permite prometer borrado absoluto ante caída de red.
4. Separar en `syncImages` preparación y confirmación: primero subir y armar URLs; tras persistir en DB, borrar URLs anteriores omitidas. Si la escritura falla, borrar las nuevas. Aplicar el mismo orden a inversión, experiencia, traslado, comprobantes de proveedor y de reserva. Ediciones sin archivos nuevos conservan imágenes salvo borrado/reordenamiento explícito (`existingImages` donde ya existe). Para inversión/experiencia/traslado, el contrato actual de archivos nuevos sigue siendo reemplazo total; sin archivos no cambia `images`.
5. Mail de confirmación: usar `PdfService.generatePdfForDownload()` y adjuntar `Buffer` a Nodemailer; no escribir PDF temporal en ese flujo. Otros usos del PDF quedan fuera de este cambio.
6. Dependencias: actualizar Multer a una 2.x corregida (verificar con `npm audit`: 2.10 no es versión de Multer), Cloudinary a una 2.x sin high/critical y tipos de Multer compatibles. `engines.node` fijado a Node 22.x. `start` con `--max-old-space-size=256`; `MALLOC_ARENA_MAX=2` se configura en Render, no en código. No borrar `sharp`: se reutiliza para RF-5.

## Archivos

- `src/middleware/uploadMiddleware.ts`, `src/app.ts`, `src/routes/{apartment,car,villa,yacht,investment,experience,transfer,suppliers,reservation,reservationPayments}.ts`, `src/utils/imageUtils.ts`.
- `src/services/{imageService,supplierService,reservationPaymentsService,emailService}.ts` y controllers de los siete listados, pagos de reserva y alta de comprobantes, según el ciclo de persistencia.
- `package.json`, `package-lock.json`, tests en `src/__tests__/`, script aislado de carga en `scripts/`, esta spec y configuración local de pruebas ignorada por Git.

## Orden y verificación

1. Baseline de `npm test` con `NODE_ENV=test` y `.env.test` local apuntando **solo** a PostgreSQL local y Cloudinary ficticio. Ningún test debe tocar servicios reales. Revisar fallos preexistentes antes de cambiar código.
2. Dependencias y runtime; luego recepción a disco, validación y cleanup; después cola/rollback; después persistencia segura por entidad; al final PDF.
3. Tras cada tarea: tests enfocados, `npm test`, commit conventional en español. Build y auditoría tras los cambios de dependencias y al cierre.
4. Prueba de carga local con proceso limitado a 512 MiB, dos requests de 30 × 10 MiB, DB local y Cloudinary simulado; medir RSS pico y RSS luego de hasta 10 minutos. Verificar 0 OOM kills y memoria no reclamable (anon+kernel+shmem del cgroup) <400 MiB en el pico, <250 MiB reposo, sin OOM, 60 temporales borrados. La prueba no carga en producción.
5. Despliegue: primero Front spec 001. Ignacio configura en Render `MALLOC_ARENA_MAX=2` y Node 22.x (`NODE_VERSION=22.23.3` si Render no respeta `engines`). Revisar que Render use `npm start` y espacio temporal suficiente para dos tandas de 300 MiB. No modificaré Render.

## Riesgos y límites

- El disco temporal puede alojar hasta 600 MiB por dos requests máximos; confirmar espacio del contenedor antes de la prueba y despliegue. Requests adicionales podrían agotar disco: límites de cantidad/tamaño, cuota operativa del filesystem y rate limit existente son defensas; la carga exigida es de dos requests.
- Una escritura DB que falla después de subir imágenes requiere compensación en Cloudinary. Una caída del proceso entre ambas operaciones puede dejar imágenes remotas; no hay transacción distribuida. Registrar fallo de compensación para limpieza manual.
- Borrar archivos al recibir `close` exige esperar a que Multer/Cloudinary hayan terminado de usarlos; se probarán abortos y errores de parser. La limpieza de arranque solo toca el prefijo exclusivo de la app.
- Este worktree no tiene `.env.test`; se creará local, ignorado por Git, con credenciales falsas y PostgreSQL local. Jamás usar `.env` de producción.
- El archivo `docs/auditoria-api-2026-06-12.md` citado no está en el worktree; la auditoría 004 y `npm audit` son la evidencia disponible.
- La demo en producción y 7 días sin OOM requieren despliegue y observación posteriores; se informarán como pendientes, no como pruebas ya realizadas.
