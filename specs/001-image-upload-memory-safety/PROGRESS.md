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

## Estado final

Criterio de memoria acordado con Ignacio: 0 OOM kills con límite de 512 MiB y memoria no reclamable (anon + kernel + shmem) < 400 MiB. Medido en Docker (2 × 30 JPEG de 10 MiB): 202–210 MiB no reclamables, `oom_kill` 0, RSS pico ~262 MiB, RSS posterior 198–210 MiB, temporales 0. `/tmp` del contenedor no es tmpfs. Se descartó `dropFileCache` (`fadvise`): no bajó el pico de forma útil. Detalle en `results.md`.

Pendientes fuera del código: verificar si `/tmp` en Render es tmpfs; demo manual en producción con 30 fotos tras el Front; 7 días en Render sin `server_failed` por OOM. Quedan 19 alertas high y 3 critical de `npm audit` fuera del camino de subida. El borrado remoto ante falla de red no es transaccional; un rollback fallido se registra para limpieza manual.
