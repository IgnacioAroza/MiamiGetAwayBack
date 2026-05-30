# Suppliers & Payout — Contrato Frontend

**Base URL local:** `http://localhost:3001/api`
**Base URL producción:** `https://miami-api-u1k5.onrender.com/api`
**Auth:** todas las rutas requieren `Authorization: Bearer <token>`
**Token:** `POST /api/auth/login` → `{ "username": "...", "password": "..." }`

---

## 1. Proveedores (entidad reutilizable)

### `GET /api/suppliers` ✅ auth
Lista todos los proveedores disponibles para asignar a reservas.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Carolina Méndez",
    "company": "Coastal Stays Management",
    "email": "carolina@coastalstays.com",
    "phone": "+1 305 555 0142",
    "createdAt": "2026-05-26T10:00:00.000Z"
  }
]
```

### `POST /api/suppliers` ✅ auth
Solo `name` es requerido.

```json
{
  "name": "Carolina Méndez",
  "company": "Coastal Stays Management",
  "email": "carolina@coastalstays.com",
  "phone": "+1 305 555 0142"
}
```
Response: objeto creado con `id`. Status `201`.

### `PUT /api/suppliers/:id` ✅ auth
Mismo body que POST, todos los campos opcionales. Status `200`.

### `DELETE /api/suppliers/:id` ✅ auth
Response: `{ "message": "Supplier deleted successfully" }`. Status `200`.

---

## 2. `supplier_status` en la reserva

Cada objeto reserva incluye el campo `supplier_status`. Leelo directamente — no lo calcules desde la presencia/ausencia del supplier.

| Valor | Color | Cuándo |
|---|---|---|
| `unassigned` | 🔴 Rojo | Al crear la reserva (default) |
| `searching` | 🟡 Amarillo | Admin lo setea manualmente |
| `confirmed` | 🟢 Verde | API lo setea al asignar proveedor |

**Reglas automáticas (la API lo maneja sola):**
- `POST /api/reservations/:id/supplier` → `supplier_status = 'confirmed'`
- `DELETE /api/reservations/:id/supplier` → `supplier_status = 'unassigned'`

### `PATCH /api/reservations/:id/supplier-status` ✅ auth
Solo para setear `searching`. Los otros dos estados los maneja la API automáticamente.

```json
{ "status": "searching" }
```
Response: `{ "message": "Supplier status updated" }`. Status `200`.

---

## 3. Asignación de proveedor a reserva

### `GET /api/reservations/:id/supplier` ✅ auth
Devuelve el proveedor asignado con todos los calculados.
Si no hay proveedor asignado devuelve `404` → mostrar botón "Asignar proveedor".

**Response:**
```json
{
  "id": 1,
  "reservation_id": 1,
  "supplier": {
    "id": 1,
    "name": "Carolina Méndez",
    "company": "Coastal Stays Management",
    "email": "carolina@coastalstays.com",
    "phone": "+1 305 555 0142"
  },
  "payout_per_night": 100,
  "cleaning_fee": 120,
  "payment_terms": "Within 48h after check-out",
  "calculated": {
    "total": 820,
    "paid": 350,
    "balance": 470,
    "profit": 580
  }
}
```

> `total` = `noches × payout_per_night + cleaning_fee`
> `paid` = suma de pagos registrados al proveedor
> `balance` = total − paid
> `profit` = `reservation.total_amount − total` (margen del deal, no del flujo de caja)

### `POST /api/reservations/:id/supplier` ✅ auth
Asigna un proveedor a la reserva. Si ya tiene uno asignado devuelve `409`.

```json
{
  "supplier_id": 1,
  "payout_per_night": 100,
  "cleaning_fee": 120,
  "payment_terms": "Within 48h after check-out"
}
```
`cleaning_fee` y `payment_terms` son opcionales. `cleaning_fee` default `0`. Response: mismo shape que el GET. Status `201`.

### `PUT /api/reservations/:id/supplier` ✅ auth
Actualizar términos. Mismo body que POST, todos opcionales. Response: mismo shape que GET. Status `200`.

### `DELETE /api/reservations/:id/supplier` ✅ auth
Desvincula el proveedor. `supplier_status` vuelve automáticamente a `unassigned`.
Response: `{ "message": "Supplier unassigned successfully" }`. Status `200`.

---

## 4. Pagos al proveedor

### `GET /api/reservations/:id/supplier/payments` ✅ auth
Lista todos los pagos registrados al proveedor de esa reserva.

**Response:**
```json
[
  {
    "id": 1,
    "reservationSupplierId": 1,
    "amount": "350.00",
    "method": "wire",
    "date": "2026-05-26",
    "referenceNotes": "Chase ****4421",
    "receiptImages": ["https://res.cloudinary.com/..."],
    "createdAt": "2026-05-26T10:00:00.000Z"
  }
]
```

### `POST /api/reservations/:id/supplier/payments` ✅ auth
`multipart/form-data`

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `amount` | number | ✅ | |
| `method` | `cash` \| `wire` \| `card` \| `transfer` | ✅ | |
| `date` | `YYYY-MM-DD` | ✅ | |
| `reference_notes` | string | ❌ | |
| `receipt_images` | File[] | ❌ | Máx. 10 archivos, 10MB c/u, mismo key por cada archivo |

Response: objeto de pago creado. Status `201`.

### `DELETE /api/supplier-payments/:id` ✅ auth
Elimina el pago y borra las imágenes de Cloudinary automáticamente.
Response: `{ "message": "Supplier payment deleted successfully" }`. Status `200`.

---

## 5. Imagen en pagos del cliente (receipt_image)

Los endpoints de pagos del cliente aceptan `multipart/form-data` con imagen opcional.

### `POST /api/reservations/:id/payments` ✅ auth
`multipart/form-data`

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `amount` | number | ✅ | |
| `paymentMethod` | `card` \| `cash` \| `transfer` \| `paypal` \| `zelle` \| `stripe` \| `other` | ✅ | |
| `paymentReference` | string | ❌ | |
| `notes` | string | ❌ | |
| `receipt_image` | File | ❌ | 1 archivo, máx. 10MB |

### `PUT /api/reservation-payments/:id` ✅ auth
Mismo esquema. Si se sube imagen nueva, la anterior se elimina de Cloudinary automáticamente.

Para eliminar la imagen existente sin subir una nueva, agregar al form-data:
```
remove_receipt_image: "true"
```

**Response de todos los GET de pagos del cliente** — incluye `receiptImage`:
```json
{
  "id": 1,
  "reservationId": 1,
  "amount": "1050.00",
  "paymentDate": "2026-05-26T10:00:00.000Z",
  "paymentMethod": "transfer",
  "paymentReference": "CHASE-001",
  "notes": "Full payment",
  "receiptImage": null
}
```

> Mostrar `receiptImage` como imagen clickeable (lightbox o link) en el detalle de la reserva. Puede ser `null`.

---

## Notas de implementación

- Para requests sin archivo usar `Content-Type: application/json`
- Para requests con archivo usar `multipart/form-data` (el browser/axios lo setea solo al usar `FormData`)
- `receipt_images` (pagos proveedor) acepta múltiples archivos con el mismo key en el form
- Si `GET /api/reservations/:id/supplier` devuelve `404` → mostrar panel "Sin proveedor asignado" con botón para asignar
- El campo `supplier_status` siempre viene en el objeto reserva — usarlo para el color del badge, no inferirlo
