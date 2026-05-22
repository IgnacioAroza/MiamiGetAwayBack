# API ↔ Frontend Contract — MiamiGetAway v2

> Documento de referencia para implementación en API y Frontend.
> Todos los endpoints protegidos requieren `Authorization: Bearer <token>`.
> Base URL: `/api`

---

## 1. INVERSIONES

### Nuevos endpoints

#### `GET /api/investments`
Público. Devuelve todas las inversiones.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Brickell City Centre Unit 12A",
    "unit_number": "12A",
    "address": "78 SW 7th St, Miami, FL 33130",
    "description": "Departamento de lujo con vista al mar",
    "bathrooms": 2,
    "rooms": 3,
    "price": 450000,
    "images": ["https://res.cloudinary.com/..."]
  }
]
```
> `price` puede ser `null` → el frontend muestra "Consultar precio".

#### `GET /api/investments/:id`
Público.

#### `POST /api/investments` **(auth)**
`multipart/form-data`

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | ✅ |
| `unit_number` | string | ✅ |
| `address` | string | ✅ |
| `description` | string | ✅ |
| `bathrooms` | number | ✅ |
| `rooms` | number | ✅ |
| `price` | number | ❌ (null = "a consultar") |
| `images` | File[] | ❌ máx. 30 |

#### `PUT /api/investments/:id` **(auth)**
Mismo body que POST.

#### `DELETE /api/investments/:id` **(auth)**

---

## 2. EXPERIENCIAS

### Entidad (admin)

#### `GET /api/experiences` — Público
**Response:**
```json
[
  {
    "id": 1,
    "title": "Vuelo en helicóptero",
    "description": "Tour panorámico de Miami de 30 minutos",
    "capacity": 4,
    "price": 299,
    "images": ["https://res.cloudinary.com/..."]
  }
]
```

#### `GET /api/experiences/:id` — Público
#### `POST /api/experiences` **(auth)** — `multipart/form-data`

| Campo | Tipo | Requerido |
|---|---|---|
| `title` | string | ✅ |
| `description` | string | ✅ |
| `capacity` | number | ✅ |
| `price` | number | ✅ |
| `images` | File[] | ❌ máx. 30 |

#### `PUT /api/experiences/:id` **(auth)** — `multipart/form-data`
#### `DELETE /api/experiences/:id` **(auth)**

---

### Consultas de clientes

#### `POST /api/experiences/:id/inquiries` — Público

**Request body (JSON):**
```json
{
  "name": "John",
  "lastname": "Smith",
  "email": "john@email.com",
  "phone": "+1 305 555 0000"
}
```

**Response `201`:**
```json
{
  "id": 5,
  "experience_id": 1,
  "name": "John",
  "lastname": "Smith",
  "email": "john@email.com",
  "phone": "+1 305 555 0000",
  "status": "pending",
  "created_at": "2026-05-16T10:00:00Z"
}
```

> **Frontend:** después de recibir 201, redirigir al usuario a WhatsApp con un link prefabricado. El backend solo guarda y notifica al admin por email.

#### `GET /api/experiences/:id/inquiries` **(auth)**
Lista todas las consultas de una experiencia.

#### `PATCH /api/experiences/inquiries/:id` **(auth)**
Actualizar estado de una consulta.

**Request body:**
```json
{ "status": "contacted" }
```
> `status` puede ser: `pending` | `contacted` | `closed`

---

## 3. TRASLADOS

### Flota (admin)

#### `GET /api/transfers/fleet` — Público
**Response:**
```json
[
  {
    "id": 1,
    "name": "Cadillac Escalade ESV",
    "category": "suv",
    "capacity": 6,
    "description": "SUV de lujo con amenidades ejecutivas",
    "images": ["https://res.cloudinary.com/..."]
  }
]
```

#### `GET /api/transfers/fleet/:id` — Público
#### `POST /api/transfers/fleet` **(auth)** — `multipart/form-data`

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | ✅ |
| `category` | `sedan` \| `suv` \| `van` | ✅ |
| `capacity` | number | ✅ |
| `description` | string | ✅ |
| `images` | File[] | ❌ máx. 30 |

#### `PUT /api/transfers/fleet/:id` **(auth)**
#### `DELETE /api/transfers/fleet/:id` **(auth)**

---

### Consultas de traslado

#### `POST /api/transfers/inquiries` — Público

**Request body (JSON):**
```json
{
  "pick_up": "Miami International Airport",
  "drop_off": "1001 N Federal Hwy, Hallandale Beach",
  "date": "2026-06-15",
  "time": "14:30",
  "passengers": 3,
  "service_type": "airport",
  "vehicle_id": 1,
  "name": "John",
  "lastname": "Smith",
  "email": "john@email.com",
  "phone": "+1 305 555 0000"
}
```
> `vehicle_id` es opcional. `service_type`: `airport` | `business` | `private_event` | `sports_event`

**Response `201`:**
```json
{
  "id": 12,
  "status": "pending",
  "created_at": "2026-05-16T10:00:00Z"
}
```

> **Frontend:** igual que experiencias — después del 201, redirigir a WhatsApp. El backend guarda y notifica al admin por email.

#### `GET /api/transfers/inquiries` **(auth)**
Lista todas las consultas. Query params opcionales: `status`, `service_type`.

#### `PATCH /api/transfers/inquiries/:id` **(auth)**
```json
{ "status": "contacted" }
```

---

## 4. PROVEEDORES (Supplier & Payout)

### Proveedores — entidad reutilizable

#### `GET /api/suppliers` **(auth)**
```json
[
  {
    "id": 1,
    "name": "Carolina Méndez",
    "company": "Coastal Stays Management",
    "email": "carolina@coastalstays.com",
    "phone": "+1 305 555 0142"
  }
]
```

#### `POST /api/suppliers` **(auth)**
```json
{
  "name": "Carolina Méndez",
  "company": "Coastal Stays Management",
  "email": "carolina@coastalstays.com",
  "phone": "+1 305 555 0142"
}
```

#### `PUT /api/suppliers/:id` **(auth)**
#### `DELETE /api/suppliers/:id` **(auth)**

---

### Campo `supplier_status` en reservaciones

El campo `supplier_status` vive en la tabla `reservations` y se incluye en todos los GET de reservas.

| Valor | Color frontend | Quién lo setea |
|---|---|---|
| `unassigned` | 🔴 Rojo | API al crear la reserva (default) |
| `searching` | 🟡 Amarillo | Admin manualmente |
| `confirmed` | 🟢 Verde | API al asignar proveedor |

**Reglas automáticas (sin intervención del admin):**
- `POST /api/reservations` → `supplier_status = 'unassigned'`
- `POST /api/reservations/:id/supplier` → `supplier_status = 'confirmed'`
- `DELETE /api/reservations/:id/supplier` → `supplier_status = 'unassigned'`

**Endpoint para actualización manual:**

#### `PATCH /api/reservations/:id/supplier-status` **(auth)**
Solo útil para setear `searching`. Los otros dos estados los maneja la API sola.

```json
{ "supplier_status": "searching" }
```

> **Frontend:** leer `supplier_status` del objeto reserva y aplicar color. No calcular el estado desde la presencia/ausencia del supplier — usar siempre este campo.

---

### Vínculo proveedor ↔ reserva

#### `GET /api/reservations/:id/supplier` **(auth)**
Devuelve el proveedor y payout terms de una reserva, con totales calculados.

**Response:**
```json
{
  "id": 3,
  "reservation_id": 301,
  "supplier": {
    "id": 1,
    "name": "Carolina Méndez",
    "company": "Coastal Stays Management",
    "email": "carolina@coastalstays.com",
    "phone": "+1 305 555 0142"
  },
  "payout_per_night": 245,
  "payment_terms": "Within 48h after check-out",
  "calculated": {
    "total": 1960,
    "paid": 500,
    "balance": 1460,
    "profit": 1200
  }
}
```
> `calculated.profit` = suma de `reservation_payments` − suma de `supplier_payments`.
> Si no hay proveedor asignado, devuelve `404`.

#### `POST /api/reservations/:id/supplier` **(auth)**
Asignar o reemplazar proveedor en una reserva.

```json
{
  "supplier_id": 1,
  "payout_per_night": 245,
  "payment_terms": "Within 48h after check-out"
}
```

#### `PUT /api/reservations/:id/supplier` **(auth)**
Actualizar términos (mismo body que POST).

#### `DELETE /api/reservations/:id/supplier` **(auth)**
Desvincula el proveedor de la reserva.

---

### Pagos al proveedor

#### `GET /api/reservations/:id/supplier/payments` **(auth)**
```json
[
  {
    "id": 1,
    "amount": 500,
    "method": "wire",
    "date": "2026-05-02",
    "reference_notes": "Chase ****4421",
    "receipt_images": ["https://res.cloudinary.com/..."]
  }
]
```

#### `POST /api/reservations/:id/supplier/payments` **(auth)**
`multipart/form-data`

| Campo | Tipo | Requerido |
|---|---|---|
| `amount` | number | ✅ |
| `method` | `cash` \| `wire` \| `card` \| `transfer` | ✅ |
| `date` | `YYYY-MM-DD` | ✅ |
| `reference_notes` | string | ❌ |
| `receipt_images` | File[] | ❌ máx. 5 |

#### `DELETE /api/reservations/:id/supplier/payments/:paymentId` **(auth)**

---

## 5. IMAGEN EN PAGOS DE RESERVA (modificación)

### Endpoints modificados

#### `POST /api/reservations/:id/payments` **(auth)** — ahora `multipart/form-data`

Se agrega el campo opcional `receipt_image` (1 archivo).

| Campo | Tipo | Requerido |
|---|---|---|
| `amount` | number | ✅ |
| `paymentMethod` | string | ✅ |
| `paymentDate` | `MM-DD-YYYY HH:mm` | ✅ |
| `notes` | string | ❌ |
| `receipt_image` | File | ❌ 1 archivo, máx. 10MB |

#### `PUT /api/reservation-payments/:id` **(auth)** — ahora `multipart/form-data`
Mismo cambio. Si se sube una imagen nueva, la anterior se elimina de Cloudinary.

### Response modificada (en todos los GET de pagos)
Se agrega `receipt_image` al objeto de pago:

```json
{
  "id": 10,
  "reservationId": 301,
  "amount": 1000,
  "paymentMethod": "wire",
  "paymentDate": "05-02-2026 10:00",
  "notes": "Primer pago",
  "receipt_image": "https://res.cloudinary.com/..."
}
```

> **Frontend:** mostrar el recibo como imagen clickeable (lightbox o link) en el detalle de la reserva y en el listado de pagos. `receipt_image` puede ser `null`.

---

## 6. PDF — CAMBIOS (sin impacto en endpoints)

No cambia ningún contrato de API. Los endpoints de PDF son los mismos:
- `POST /api/reservations/:id/pdf`
- `GET /api/reservations/:id/pdf/download`

**Qué cambia internamente:**
- El PDF imprime correctamente (fondo como watermark, texto oscuro)
- El PDF incluye una página extra con las políticas de reserva de la empresa

> **Frontend:** ningún cambio requerido.

---

## Resumen de endpoints nuevos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/investments` | ❌ | Listar inversiones |
| GET | `/api/investments/:id` | ❌ | Detalle inversión |
| POST | `/api/investments` | ✅ | Crear inversión |
| PUT | `/api/investments/:id` | ✅ | Actualizar inversión |
| DELETE | `/api/investments/:id` | ✅ | Eliminar inversión |
| GET | `/api/experiences` | ❌ | Listar experiencias |
| GET | `/api/experiences/:id` | ❌ | Detalle experiencia |
| POST | `/api/experiences` | ✅ | Crear experiencia |
| PUT | `/api/experiences/:id` | ✅ | Actualizar experiencia |
| DELETE | `/api/experiences/:id` | ✅ | Eliminar experiencia |
| POST | `/api/experiences/:id/inquiries` | ❌ | Consulta de cliente |
| GET | `/api/experiences/:id/inquiries` | ✅ | Listar consultas |
| PATCH | `/api/experiences/inquiries/:id` | ✅ | Actualizar estado consulta |
| GET | `/api/transfers/fleet` | ❌ | Listar flota |
| GET | `/api/transfers/fleet/:id` | ❌ | Detalle vehículo |
| POST | `/api/transfers/fleet` | ✅ | Crear vehículo |
| PUT | `/api/transfers/fleet/:id` | ✅ | Actualizar vehículo |
| DELETE | `/api/transfers/fleet/:id` | ✅ | Eliminar vehículo |
| POST | `/api/transfers/inquiries` | ❌ | Consulta de traslado |
| GET | `/api/transfers/inquiries` | ✅ | Listar consultas de traslado |
| PATCH | `/api/transfers/inquiries/:id` | ✅ | Actualizar estado consulta |
| GET | `/api/suppliers` | ✅ | Listar proveedores |
| POST | `/api/suppliers` | ✅ | Crear proveedor |
| PUT | `/api/suppliers/:id` | ✅ | Actualizar proveedor |
| DELETE | `/api/suppliers/:id` | ✅ | Eliminar proveedor |
| PATCH | `/api/reservations/:id/supplier-status` | ✅ | Setear estado `searching` manualmente |
| GET | `/api/reservations/:id/supplier` | ✅ | Proveedor de reserva + calculados |
| POST | `/api/reservations/:id/supplier` | ✅ | Asignar proveedor |
| PUT | `/api/reservations/:id/supplier` | ✅ | Actualizar términos |
| DELETE | `/api/reservations/:id/supplier` | ✅ | Desvincular proveedor |
| GET | `/api/reservations/:id/supplier/payments` | ✅ | Pagos al proveedor |
| POST | `/api/reservations/:id/supplier/payments` | ✅ | Registrar pago al proveedor |
| DELETE | `/api/reservations/:id/supplier/payments/:paymentId` | ✅ | Eliminar pago proveedor |
