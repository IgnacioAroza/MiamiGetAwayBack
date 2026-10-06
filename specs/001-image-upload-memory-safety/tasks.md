# Tareas — spec 001 backend

Plan aprobado. T01–T12 ejecutadas y commiteadas; T12 detectó un pico de memoria de cgroup mayor a 400 MB. Próximo trabajo pendiente: resolver ese criterio antes de dar por cerrada la spec. Demo en producción y 7 días sin OOM quedan a cargo del despliegue posterior.

| ID | Tarea | RF | Verificación |
|---|---|---|---|
| T01 ✅ | Crear `.env.test` local seguro; correr baseline y registrar fallos previos | seguridad de pruebas | `NODE_ENV=test npm test`; revisar destino DB/Cloudinary |
| T02 ✅ | Actualizar Multer/Cloudinary/tipos y fijar Node/heap | RF-6 | `npm run build`; `npm audit --omit=dev` sin high/critical en cadena upload |
| T03 ✅ | Implementar directorio temporal por request, límite de 10 MiB, cantidad por ruta y errores HTTP con archivo/código | RF-1, RF-2, RF-3, RF-4, RF-6, RF-8 | Supertest de límites, abortos y limpieza de archivos |
| T04 ✅ | Validar firma y decodificación JPEG/PNG/WebP desde disco | RF-5 | Tests con header falso, datos corruptos y archivo válido |
| T05 ✅ | Limpiar directorios de uploads interrumpidos al arrancar | RF-9 | Test de arranque con temporales propios y archivo ajeno intacto |
| T06 ✅ | Cambiar Cloudinary a upload por ruta, cola global de 3 y orden estable | RF-6, RF-7, RF-8 | Test de 30 archivos con máximo activo 3 y orden estable |
| T07 ✅ | Compensar subida parcial y detallar fallos por archivo | RF-10, RF-11 | Tests con timeout/error intermedio y `destroy` de los éxitos |
| T08 ✅ | Diferir borrado de `syncImages` hasta DB y compensar fallo de DB en departamento/auto/villa/yate | RF-13, RF-14 | Tests de alta, borrado/reordenamiento, fallo de upload y DB |
| T09 ✅ | Hacer reemplazo seguro en inversión/experiencia/traslado | RF-12, RF-13, RF-14 | Tests por controller: éxito, sin archivos y fallas de upload/DB |
| T10 ✅ | Hacer reemplazo seguro en pagos a proveedor y pago de reserva | RF-3, RF-13, RF-14 | Tests por service/controller con fallas de subida y escritura |
| T11 ✅ | Adjuntar PDF en memoria al mail de confirmación | RF-15 | Test `sendMail` éxito/error; ningún archivo temporal creado |
| T12 ✅ | Prueba de carga, auditoría final y matriz RF | RF-1..RF-15 | 2 × 30 × 10 MiB, RSS pico/reposo, `npm test`, `npm run build`, auditoría |
