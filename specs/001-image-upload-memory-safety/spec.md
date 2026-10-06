---
spec_number: 001
spec_slug: image-upload-memory-safety
spec_created_at: 2026-10-06T00:00:00Z
spec_status: draft
---

# Spec 001 — Subida de imágenes sin agotar la memoria del servidor

## Contexto y objetivo
El backend corre en Render Starter con un límite de 512 MB de RAM. Entre el 29/09 y el
05/10/2026 el servidor fue terminado 3 veces por falta de memoria (OOM kill), con
cortes de ~10 s y requests respondidas con 502. La memoria sube en escalones
(140 → 300 → 370 → 490 MB) coincidiendo con cargas de listados con imágenes, y no
vuelve a bajar. Hoy cada carga retiene en RAM todas las imágenes completas (hasta
30 × 10 MB) y las envía todas a la vez. Además, el camino de subida arrastra
vulnerabilidades conocidas (auditoría 2026-06-12, C4 y hallazgo #11 de la auditoría
de seguridad) y deja imágenes huérfanas en el almacenamiento al editar algunos
listados. El objetivo es que cargar imágenes no pueda tirar el servidor ni dejar
basura, sin quitarle al cliente la posibilidad de cargar 30 fotos por listado.
Esta spec es la mitad backend de un cambio en dos partes; la otra mitad es
`MiamiGetAwayFront/specs/001-image-compression-before-upload`, que comprime las
imágenes en el panel y **se despliega primero**.

## Usuarios / actores
- Admins del cliente que cargan y editan listados y comprobantes desde el panel.
- Usuarios finales de la web, afectados indirectamente por las caídas.

## Historias de usuario
- H1: Como admin quiero subir hasta 30 fotos de una villa sin que el sistema se caiga,
  para cargar listados completos de una vez.
- H2: Como admin quiero que, si falla una carga, no queden imágenes sueltas ni se
  pierdan las imágenes o comprobantes que ya existían, para no tener que limpiar a mano.
- H3: Como dueño del proyecto quiero que el servidor vuelva a un consumo bajo después
  de cada carga, para no pagar un plan más grande.
- H4: Como dueño del proyecto quiero que el almacenamiento de imágenes no acumule
  archivos que ningún listado usa, para no pagar por basura.

## Requisitos funcionales (EARS)
- RF-1: EL SISTEMA acepta hasta 30 imágenes por departamento, villa, yate, auto,
  experiencia o inversión.
- RF-2: EL SISTEMA acepta hasta 20 imágenes por vehículo de traslado.
- RF-3: EL SISTEMA acepta hasta 5 comprobantes por pago a proveedor y 1 comprobante por
  pago de reserva.
- RF-4: SI una imagen recibida supera los 10 MB, ENTONCES EL SISTEMA la rechaza
  indicando cuál imagen y el motivo.
- RF-5: SI el contenido de un archivo recibido no corresponde a un formato de imagen
  permitido, ENTONCES EL SISTEMA lo rechaza indicando cuál archivo, sin importar el
  tipo que declare la request.
- RF-6: MIENTRAS procesa una carga de imágenes, EL SISTEMA no mantiene todas las
  imágenes de la carga en memoria al mismo tiempo.
- RF-7: MIENTRAS procesa una carga de imágenes, EL SISTEMA envía como máximo 3 imágenes
  en simultáneo al servicio de almacenamiento.
- RF-8: CUANDO termina una carga de imágenes, con éxito o con error, EL SISTEMA elimina
  todos los archivos temporales que generó para esa carga.
- RF-9: CUANDO el servidor arranca, EL SISTEMA elimina los archivos temporales de cargas
  que quedaron interrumpidas.
- RF-10: SI falla la subida de alguna imagen de una carga, ENTONCES EL SISTEMA elimina
  del almacenamiento las imágenes de esa carga que sí se subieron.
- RF-11: SI falla la subida de alguna imagen de una carga, ENTONCES EL SISTEMA responde
  indicando qué imágenes fallaron y el motivo de cada una.
- RF-12: CUANDO un admin reemplaza las imágenes de una inversión, experiencia o
  traslado, EL SISTEMA elimina del almacenamiento las imágenes anteriores que dejaron
  de usarse.
- RF-13: CUANDO un admin reemplaza imágenes o comprobantes existentes, EL SISTEMA
  elimina los anteriores recién después de haber guardado los nuevos.
- RF-14: SI falla la subida de imágenes o comprobantes de reemplazo, ENTONCES EL SISTEMA
  conserva los anteriores sin cambios.
- RF-15: CUANDO se envía el mail de confirmación de reserva, EL SISTEMA adjunta el PDF
  sin dejar archivos en el disco del servidor, haya funcionado o fallado el envío.

## Requisitos no funcionales
- Memoria pico: con límite de 512 MiB y 2 cargas simultáneas de 30 imágenes de 10 MB,
  0 OOM kills y memoria no reclamable (anon + kernel + shmem de `memory.stat` del cgroup)
  por debajo de 400 MiB. No se mide el cgroup total: incluye page cache de los temporales,
  que el kernel reclama bajo presión.
- Memoria en reposo: dentro de los 10 minutos posteriores a una carga, el uso vuelve a
  menos de 250 MB.
- El entorno de ejecución usa una versión de runtime fija y límites de memoria
  configurados de acuerdo al plan de hosting.
- Seguridad: las dependencias que reciben archivos y los envían al almacenamiento no
  tienen vulnerabilidades conocidas de severidad high o critical.
- Pruebas: ninguna prueba de esta spec escribe en la base de datos ni en el
  almacenamiento de producción.
- Despliegue: se despliega después de la spec 001 del Front.
- Mensajes de error con códigos o textos que el front pueda mostrar en ES y EN.

## Casos límite
- Archivo con extensión o tipo declarado de imagen pero contenido de otro tipo.
- Archivo de imagen corrupto.
- Request enviada por un cliente viejo con imágenes sin comprimir (hasta 10 MB c/u).
- Dos admins cargando listados con 30 imágenes al mismo tiempo.
- Reinicio del servidor en medio de una carga (temporales huérfanos, RF-9).
- Timeout del servicio de almacenamiento en una imagen del medio de la carga.
- Edición que solo borra o reordena imágenes, sin subir nuevas.
- Edición de inversión/experiencia/traslado sin imágenes nuevas: las existentes no se tocan.

## Fuera de alcance
- Compresión de imágenes en el panel (cubierta por la spec 001 del Front).
- Cambiar el plan de Render.
- Migrar el almacenamiento de imágenes a otro proveedor.
- Subida directa desde el navegador al almacenamiento sin pasar por el backend.
- Limpieza retroactiva de las imágenes huérfanas que ya existen hoy en el almacenamiento.
- Unificar el formato de la columna `images` entre tablas (auditoría, deuda aparte).
- Observabilidad / logging general de la app.
- Limpieza de dependencias no usadas (tarea menor del plan, no requisito).

## Criterios de finalización
- Todos los RF con test en verde.
- Prueba de carga local con límite de 512 MB, base local y almacenamiento simulado:
  2 cargas simultáneas de 30 imágenes de 10 MB con 0 OOM kills y memoria no reclamable < 400 MiB.
- Auditoría de dependencias sin high/critical en el camino de subida.
- Demo manual en producción: alta y edición de una villa con 30 fotos de celular.
- 7 días en producción sin eventos `server_failed` por OOM en Render.

## Dudas abiertas
Ninguna.
