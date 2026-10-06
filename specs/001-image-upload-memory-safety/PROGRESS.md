# Progreso — checkpoint 2026-10-06

Rama: `IgnacioAroza/spec-001-image-upload-memory`. No se hizo push ni PR; `main` intacta.

## Tareas hechas

| Tarea | Commit | Resultado |
|---|---|---|
| T01 | `a400584` | `.env.test` local, baseline y dos fallos preexistentes de admins corregidos; tests verdes. |
| T02 | `a9d59d9` | Multer/Cloudinary, Node 22.x y heap 256 MiB. |
| T03 | `d6a6634` | Recepción a disco, límites por ruta y cleanup. |
| T04 | `4fac747` | Firma y decodificación real de imágenes. |
| T05 | `fc2be8f` | Prueba de limpieza al arrancar. |
| T06 | `836dfeb` | Subida por ruta y cola global de 3. |
| T07 | `eaa894d` | Errores ordenados por archivo; compensación parcial de T06. |
| T08 | `4a4bf0b` | Reemplazo seguro en departamento, auto, villa y yate. |
| T09 | `65a06d6` | Reemplazo seguro en inversión, experiencia y traslado. |
| T10 | `5b5f71d` | Reemplazo seguro de comprobantes. |
| T11 | `a5751b8` | PDF adjunto como `Buffer`, sin temporal. |
| T12 | `6a434c0` | Carga local, matriz RF, auditoría, actualización de `sharp` y Express; plan, tareas y script commiteados. |

Gates: `NODE_ENV=test npm test` = 428 pasados, 5 `todo`; `npm run build` verde. `.env.test` se creó localmente con PostgreSQL local y credenciales Cloudinary ficticias; está ignorado por Git. Los contenedores de la carga ya se eliminaron.

## Decisiones tomadas

- Límite por archivo: 10 MiB. Cantidades: 30 por listado salvo traslado 20; proveedor 5; pago de reserva 1.
- Archivos temporales por request bajo `os.tmpdir()`. Validación de firma y decodificación JPEG/PNG/WebP con `sharp` 0.35.x.
- Cloudinary recibe rutas de archivo. Cola global máxima de 3; rollback de éxitos ante falla parcial.
- Guardar nuevos en DB antes de borrar anteriores. Si falla la escritura, borrar los nuevos.
- Mail de confirmación adjunta PDF en memoria.
- Front spec 001 se despliega primero. No se cambiaron variables de Render.

## Render: Ignacio debe configurar

- `MALLOC_ARENA_MAX=2`.
- `NODE_VERSION=22.23.3` si Render no adopta `engines.node: 22.x` de `package.json`.
- Confirmar que el start command sea `npm start` para aplicar `--max-old-space-size=256`.
- Confirmar espacio temporal para dos tandas de hasta 300 MiB antes del despliegue.

## Próxima tarea pendiente y dudas

**Próximo:** acordar si el criterio de pico <400 MB de la spec se mide por RSS del proceso o memoria total del cgroup/Render; si es cgroup, reducir el pico y repetir la carga. No arrancar hasta que Ignacio retome después del reinicio.

Carga con 2 requests simultáneas de 30 JPEG de 10 MiB, 4000×4000, PostgreSQL 18 local y Cloudinary simulado: ambos HTTP 200; RSS pico 255 MiB, RSS posterior 198 MiB, cero OOM y cero temporales. Pico cgroup 513 MiB por caché de archivos: **no cumple <400 MB si esa es la métrica**. Detalle en `results.md`.

Pendientes de aceptación posteriores: demo manual en producción con 30 fotos tras el Front y 7 días en Render sin `server_failed` por OOM. Quedan 19 alertas high y 3 critical de `npm audit` fuera de las dependencias del camino de subida auditado. El borrado remoto ante falla de red no es transaccional; un rollback fallido se registra para limpieza manual.
