# Presupuesto — MiamiGetAway Platform Upgrade

**Fecha**: Mayo 2026  
**Valor total**: $1.500 USD  
**Modalidad de pago**: 50% adelanto ($750) — 50% al entregar ($750)

---

# PARTE 1 — Técnica (para el desarrollador)

## Resumen de módulos y estimación de horas

| Módulo | Backend | Frontend | Total |
|---|---|---|---|
| Nuevos servicios (Inversiones, Experiencias, Traslados) | 16–21h | 16–22h | 32–43h |
| Sistema de proveedores + profit (Supplier & Payout) | 12–15h | 12–16h | 24–31h |
| Fix PDF + políticas de reserva | 3–4h | 0h | 3–4h |
| Imagen en notas de pagos | 2–3h | 3–4h | 5–7h |
| Fixes de seguridad críticos (incluidos sin costo) | 4–6h | 0h | 4–6h |
| **Total estimado** | **37–49h** | **31–42h** | **68–91h** |

---

## Detalle técnico por módulo

### 1. Nuevos servicios

#### Inversiones (`/api/investments`)
- Tabla: `investments` con campos `name`, `unit_number`, `address`, `description`, `bathrooms`, `rooms`, `price` (nullable), `images` (array Cloudinary)
- CRUD completo con auth en escritura
- Migration SQL nueva
- Zod schema + model + controller + routes

#### Experiencias (`/api/experiences`)
- Tabla `experiences`: `title`, `description`, `capacity`, `price` — gestionada por admin
- Tabla `experience_inquiries`: `name`, `lastname`, `email`, `phone`, `experience_id`, `status` (`pending`/`contacted`/`closed`), `created_at`
- Endpoint público `POST /api/experiences/:id/inquiries` — guarda consulta + envía email al admin
- El WhatsApp redirect lo maneja el frontend

#### Traslados (`/api/transfers`)
- Tabla `transfer_fleet`: `name`, `category` (sedan/suv/van), `capacity`, `description`, `images` — CRUD con auth
- Tabla `transfer_inquiries`: `pick_up`, `drop_off`, `date`, `time`, `passengers`, `service_type` (airport/business/private_event/sports_event), `vehicle_id` (FK nullable), `name`, `lastname`, `email`, `phone`, `status` (`pending`/`contacted`/`closed`)
- Endpoint público `POST /api/transfers/inquiries` — guarda + email al admin

---

### 2. Sistema de proveedores + profit (Supplier & Payout)

**Tres tablas nuevas:**

`suppliers`: `name`, `company`, `email`, `phone` — CRUD con auth, entidad reutilizable entre reservas

`reservation_suppliers`: `reservation_id` (FK), `supplier_id` (FK), `payout_per_night`, `payment_terms` — vincula proveedor a reserva con condiciones de pago

`supplier_payments`: `reservation_supplier_id` (FK), `amount`, `method` (cash/wire/card/transfer), `date`, `reference_notes`, `receipt_images` (array Cloudinary)

**Campos calculados (no se almacenan):**
- Total = noches × payout_per_night
- Paid = SUM(supplier_payments.amount)
- Balance = Total − Paid
- **Profit = SUM(reservation_payments) − SUM(supplier_payments)**

---

### 3. PDF — Fix impresión + políticas

**Problema actual:** `addBackgroundImage()` en `pdfService.ts:709` renderiza fondo con `fillOpacity(1)` y texto en blanco → imprime negro.

**Cambios:**
- Bajar opacidad del fondo a ~0.15 (watermark sutil)
- Cambiar colores de texto de `white` a dark navy (`#1a2a3a`)
- Agregar página nueva al final con políticas de reserva de la empresa (texto provisto por el cliente)

---

### 4. Imagen en notas de pagos

- Nuevo campo `receipt_image` (string nullable) en tabla `reservation_payments`
- Migration SQL
- Endpoints `POST` y `PUT` de pagos aceptan `multipart/form-data` con la imagen
- `GET /api/reservations/:id/payments` incluye `receipt_image` en la respuesta

---

### 5. Fixes de seguridad (incluidos, sin costo adicional)

Corregidos de paso junto con el desarrollo. No se itemizan en el presupuesto al cliente.

| Fix | Severidad | Archivo |
|---|---|---|
| Admin password devuelto en plain text | Crítica | `models/admin.ts` |
| Endpoints `/api/admins` sin auth | Crítica | `routes/admin.ts` |
| SQL injection en `cleanupOldReviews` | Crítica | `models/googleMyBusiness.ts` |
| OAuth callback sin validación de `state` (CSRF) | Crítica | `controllers/googleMyBusiness.ts` |
| CORS abierto si falta `ALLOWED_ORIGINS` | Alta | `app.ts` |
| Instalar `helmet` (headers de seguridad) | Alta | `app.ts` |
| Rate limiting en `/api/auth/login` | Alta | `routes/auth.ts` |
| `algorithm: 'HS256'` explícito en JWT | Media | `authMiddleware.ts` |
| `.max(72)` en schema de password admin | Media | `schemas/adminSchema.ts` |
| Eliminar `dotenv.config()` duplicado | Baja | `controllers/auth.ts` |

---

### Orden de implementación sugerido

1. Fixes de seguridad críticos (bajo riesgo, alto impacto, hacerlo primero)
2. Imagen en notas de pagos (simple, base para el módulo de proveedores)
3. Sistema de proveedores + profit (más complejo, núcleo del valor para el cliente)
4. Nuevos servicios — Inversiones (sigue el patrón de entidades existentes)
5. Nuevos servicios — Experiencias + Traslados (más complejos por la lógica de consultas)
6. PDF fix + políticas (independiente, hacerlo cuando el cliente entregue el texto)

---

# PARTE 2 — Para el cliente

---

# Propuesta de mejora — MiamiGetAway Digital Platform

**Inversión**: $1.500 USD  
**Entrega estimada**: 4–6 semanas  

---

## El problema de hoy

Tu plataforma funciona para gestionar reservas de apartamentos, villas, yates y autos. Pero hay tres cosas que hoy estás haciendo por fuera del sistema, que te generan trabajo extra, errores y pérdida de información:

**1. El margen de ganancia lo calculás en Excel.**  
Cada vez que cerrás una reserva, tenés que ir a una planilla separada para registrar cuánto le pagás al dueño del departamento y calcular cuánto ganaste. Eso es tiempo, y es un riesgo — si algo se pierde o se calcula mal, el error se nota tarde.

**2. No tenés forma de ofrecer experiencias y traslados desde tu plataforma.**  
Cuando un cliente te pide un vuelo en helicóptero, un traslado al aeropuerto o una inversión inmobiliaria, lo manejás por WhatsApp o mail, sin registro. Esas consultas no quedan en ningún lado.

**3. Tu plataforma solo tiene propiedades para alquilar.**  
Pero tu negocio ofrece mucho más. El sistema debería reflejarlo.

---

## Qué va a cambiar

### Tu ganancia visible en tiempo real

Vamos a integrar directamente en cada reserva la información del proveedor (el dueño del departamento): cuánto le pagás por noche, los pagos que ya le hiciste, lo que todavía le debés, y —lo más importante— **cuánto ganaste vos en esa reserva**.

Todo desde la misma pantalla donde hoy gestionás la reserva. Sin Excel, sin planillas aparte, sin cálculos manuales.

También vas a poder adjuntar las **fotos de los recibos de pago** directamente en el sistema, tanto los que registrás vos como los que te manda el proveedor.

### Tres nuevos servicios en tu plataforma

**Inversiones inmobiliarias**: una sección donde mostrás las propiedades disponibles para comprar o invertir, con fotos, descripción, precio y características. Tus clientes las ven en la web y pueden consultarte desde ahí.

**Experiencias**: helicóptero, tours, actividades en Miami. Cada experiencia tiene su ficha con fotos y precio base. Un cliente interesado completa un formulario, vos recibís la consulta por mail y podés darle seguimiento desde el panel de administración.

**Traslados**: una flota de vehículos disponibles (sedán, SUV, van) para distintos tipos de servicio — aeropuerto, negocios, eventos. El cliente elige el vehículo, completa sus datos y vos recibís la solicitud. Cada consulta queda registrada con un estado (pendiente, contactado, cerrado) para que no se te escape ninguna oportunidad.

### Los PDFs que mandás a tus clientes van a verse bien impresos

Hoy el PDF de confirmación de reserva tiene un fondo oscuro que cuando se imprime sale completamente negro. Lo vamos a corregir para que se vea igual de bien en pantalla que en papel. Además, vamos a agregar al final las **políticas de reserva de tu empresa**, para que el cliente las tenga por escrito en el mismo documento.

---

## Por qué vale $1.500

No estamos agregando botones. Estamos reemplazando procesos manuales por flujos digitales que te ahorran tiempo en cada reserva, te dan visibilidad de tu negocio en tiempo real y te permiten ofrecer más servicios sin más trabajo.

| Lo que ganás | Impacto |
|---|---|
| Profit de cada reserva visible sin Excel | Ahorro de tiempo + menos errores |
| Historial de pagos a proveedores con recibos adjuntos | Trazabilidad completa |
| Tres nuevos servicios en la plataforma | Más conversiones, más canales |
| Consultas de experiencias y traslados registradas | Ninguna oportunidad perdida |
| PDFs correctos para clientes | Imagen profesional |

---

## Modalidad de trabajo

- **50% al inicio**: $750 USD — arrancamos el desarrollo
- **50% al entregar**: $750 USD — entrega de todo funcionando en producción

El desarrollo se hace por módulos. Vas a poder ver el avance en cada etapa antes de la entrega final.

---

*Presupuesto preparado por Ignacio Aroza — Mayo 2026*
