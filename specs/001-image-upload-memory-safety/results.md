# Resultado local — 2026-10-06

## RF y evidencia

| RF | Evidencia |
|---|---|
| RF-1 | Rutas de seis listados con máximo 30; `IMAGE_CONFIGS` alineada. `uploadMiddleware.test.ts` prueba límite por ruta. |
| RF-2 | Ruta de traslados y `IMAGE_CONFIGS.transfers`: 20. Prueba de límite del middleware. |
| RF-3 | Rutas de proveedor: 5; reserva: `single` (1). Configuración y tests de controllers de pagos. |
| RF-4 | Multer limita 10 MiB; test de 10 MiB + 1 byte y cleanup. Error `FILE_TOO_LARGE` incluye archivo. |
| RF-5 | Firma y decodificación `sharp` de JPEG/PNG/WebP; tests de MIME falso, GIF, archivo truncado y WebP válido. |
| RF-6 | `diskStorage`, subida por `file.path`; prueba de carga local con 60 archivos por tanda. |
| RF-7 | Cola global de tres; test de dos tandas concurrentes conserva orden y registra máximo 3. |
| RF-8 | Cleanup al terminar respuesta o cerrar conexión; tests de éxito, límite y archivo inválido. Directorio temporal vacío tras carga. Aborto de red no tiene test específico. |
| RF-9 | Limpieza en arranque; test con directorio huérfano y directorio ajeno intacto. |
| RF-10 | Test de subida parcial verifica `destroy` de las URLs exitosas. Fallo de borrado remoto queda registrado, sin garantía transaccional. |
| RF-11 | Test verifica nombre y motivo por cada archivo fallido, en orden; controllers envían `details`. |
| RF-12 | Tests de inversión, experiencia y traslado; borrado posterior al guardado. |
| RF-13 | Tests de departamento, traslado, inversión, comprobante proveedor y reserva verifican orden DB antes de borrar anteriores; mismo patrón en auto, villa, yate y experiencia. |
| RF-14 | Tests de fallo DB en departamento, experiencia, proveedor y reserva verifican que solo se compensan archivos nuevos. Upload fallido se detiene antes de editar DB. |
| RF-15 | Tests de mail exitoso/fallido verifican adjunto `Buffer` y ausencia de `generateInvoicePdf`. |

## Prueba de carga

Docker: Node 22, `--memory=512m`, `--max-old-space-size=256`, `MALLOC_ARENA_MAX=2`; PostgreSQL 18 local en Docker; Cloudinary simulado con lectura completa por stream. Dos requests HTTP simultáneas, 30 JPEG de 10 MiB cada una. JPEG de 4000×4000 píxeles, con aproximadamente 0,3 MiB de relleno para llegar a 10 MiB. Ambos HTTP 200; 60 imágenes persistidas en DB local; temporales remanentes: 0; OOM kills: 0.

- Pico RSS del proceso: 267.476.992 bytes (255 MiB), menor a 400 MB.
- RSS posterior a la carga: 207.405.056 bytes (198 MiB), menor a 250 MB dentro de 10 minutos.
- Criterio acordado (2026-10-06): 0 OOM kills con límite de 512 MiB y memoria no reclamable (anon + kernel + shmem de `memory.stat`) < 400 MiB. El cgroup total no sirve como métrica: el kernel llena el límite con page cache de los temporales.
- Desglose del cgroup en el pico (muestreo cada 10 ms, dos corridas): `memory.peak` 512 MiB; en el pico anon 75/70, file 420/425, kernel 16, shmem 0 MiB. **Máximo de anon+kernel+shmem: 210 y 202 MiB (< 400)**. `memory.events`: `oom_kill 0`, `max` 3708/3467 (el kernel reclamó cache al tocar el tope).
- `os.tmpdir()` en el contenedor es `/tmp` sobre overlay, no tmpfs (`shmem` = 0): los temporales son page cache reclamable. En Render no está verificado.
- Descartado: `fadvise(dont-need)` tras escribir/validar/subir cada archivo (`dropFileCache`, con dependencia nativa). Pico de cgroup 488 MiB (file 295), sin mejora real; se eliminó.
- Corrida adicional con JPEG pequeño relleno a 10 MiB: 2 HTTP 200, pico RSS 127.389.696 bytes, sin OOM.

## Gates

- `NODE_ENV=test npm test`: 428 pasados, 5 `todo`; `.env.test` local ignorado por Git, PostgreSQL local y Cloudinary ficticio.
- `npm run build`: verde.
- `npm audit`: sin high/critical para `express`, `proxy-addr`, `multer`, `busboy`, `sharp` y `cloudinary`. Persisten 19 high y 3 critical en otras dependencias del proyecto; fuera del camino de subida auditado.
- Verificar en Render si `/tmp` es tmpfs (en ese caso los temporales contarían como memoria no reclamable).
- Demo en producción y 7 días sin `server_failed` por OOM: pendientes del despliegue posterior al Front.

## Memoria nativa de sharp en validación — 2026-10-06

Producción (Render, 8 CPUs, `MALLOC_ARENA_MAX=2`): tras cargas, anon ~334 MiB y la memoria no bajaba (145–150 MB tras el restart; 389 MB tras una edición). No se reproduce esa magnitud en Docker; sí se reproduce una retención nativa menor, que el fix elimina.

Cambio: `sharp.cache(false)`, `sharp.concurrency(1)`, y `stats()` → `resize(64).toBuffer()` con `failOn: 'truncated'` (JPEG usa shrink-on-load). Los tests de truncado, corrupto y MIME falso siguen rechazando.

Docker: Node 22, `--memory=512m`, `--cpuset-cpus=0-9` (10 CPUs), `--max-old-space-size=256`, 2 requests simultáneas de 21 JPEG sintéticos (12 MP o 24 MP, 2–6 MB), Cloudinary simulado, `memory.stat` cada 20 ms. MiB, anon+kernel:

| Escenario | Reposo | Pico | Después (50 s) |
|---|---|---|---|
| Antes, 12 MP, arena sin setear | 86 | 185 | 140 |
| Antes, 12 MP, arena=2 | 78 | 189 | 138 |
| Antes, 24 MP, arena sin setear | 79 | 191 | 103 |
| Antes, 24 MP, arena=2 | 70 | 212 | 94 |
| **Después**, 12 MP, arena sin setear | 78 | 116 | 91 |
| **Después**, 12 MP, arena=2 | 70 | 97 | 70 |
| **Después**, 24 MP, arena sin setear | 92 | 126 | 105 |
| **Después**, 24 MP, arena=2 | 75 | 97 | 71 |

Edición (PUT villa, 2 en paralelo, 21 fotos nuevas y `existingImages=[]` que borra 21 anteriores, controller real y DB local): antes 69 → pico 187 → 134 (arena=2, 12 MP) y 82 → 196 → 103 (arena sin setear, 24 MP); después 75 → 98 → 72. `heapUsed` de JS: ~15 MB, o sea la retención era nativa. `syncImages` usa el mismo `uploadImages` que el alta; no hay un camino de memoria distinto en la edición.

Limitaciones: JPEG sintéticos, no fotos de celular; no se ejecutó `dist/app.js` con el SDK real de Cloudinary; CPUs visibles 10 vs 8 en Render. La línea base de reposo de producción (~145 MB) es mayor que la de Docker (~70–90 MiB): falta separar heap JS de memoria nativa en la instancia real (ver PR).
