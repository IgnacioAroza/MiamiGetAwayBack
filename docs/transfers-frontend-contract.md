# Transfers — Frontend Contract

## Base URL

```
https://miami-api-u1k5.onrender.com/api/transfers
```

---

## Tipos

```typescript
type VehicleCategory = 'sedan' | 'suv' | 'van';

type ServiceType =
  | 'airport_transfer'
  | 'business_travel'
  | 'sports_events'
  | 'private_events'
  | 'yacht_transfer'
  | 'video_film_production'
  | 'hourly';

type InquiryStatus = 'pending' | 'confirmed' | 'cancelled';

interface TransferVehicle {
  id: number;
  name: string;
  category: VehicleCategory;
  capacity: number;           // cantidad de pasajeros
  luggage_capacity: number;   // cantidad de maletas
  description: string | null;
  images: string[];           // URLs Cloudinary
  created_at: string;         // ISO timestamp
}

interface TransferInquiry {
  id: number;
  vehicle_id: number | null;
  vehicle_name: string | null;  // viene del JOIN, null si no eligió vehículo
  pick_up: string;
  drop_off: string;
  date: string;                 // formato MM-DD-YYYY
  time: string;                 // formato HH:mm
  passengers: number;
  service_type: ServiceType;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string | null;
  status: InquiryStatus;
  created_at: string;           // ISO timestamp
}
```

---

## Endpoints — Vehículos (Fleet)

### GET /api/transfers/vehicles
Lista todos los vehículos de la flota. **Público.**

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Mercedes Benz S Class",
    "category": "sedan",
    "capacity": 2,
    "luggage_capacity": 3,
    "description": "Premium executive sedan with black leather interior.",
    "images": ["https://res.cloudinary.com/.../mercedes.jpg"],
    "created_at": "2026-06-03T12:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Cadillac Escalade Premium Luxury ESV",
    "category": "suv",
    "capacity": 6,
    "luggage_capacity": 5,
    "description": null,
    "images": [],
    "created_at": "2026-06-03T12:00:00.000Z"
  }
]
```

> Las imágenes vienen optimizadas para listado (tamaño reducido).

---

### GET /api/transfers/vehicles/:id
Detalle de un vehículo. **Público.**

**Response 200:**
```json
{
  "id": 1,
  "name": "Mercedes Benz S Class",
  "category": "sedan",
  "capacity": 2,
  "luggage_capacity": 3,
  "description": "Premium executive sedan with black leather interior.",
  "images": ["https://res.cloudinary.com/.../mercedes.jpg"],
  "responsiveImages": [...],
  "created_at": "2026-06-03T12:00:00.000Z"
}
```

> `responsiveImages` contiene variantes de tamaño para srcset.

**Response 404:**
```json
{ "message": "Vehicle not found" }
```

---

### POST /api/transfers/vehicles
Crea un nuevo vehículo. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `name` | string | ✅ | nombre del vehículo |
| `category` | string | ✅ | `sedan` \| `suv` \| `van` |
| `capacity` | number | ✅ | entero positivo, cantidad de pasajeros |
| `luggage_capacity` | number | ✅ | entero ≥ 0, cantidad de maletas |
| `description` | string | ❌ | opcional |
| `images` | File[] | ❌ | campo `images`, máx. 20 archivos |

**Response 201:**
```json
{
  "id": 3,
  "name": "Executive Jet Style Sprinter",
  "category": "van",
  "capacity": 8,
  "luggage_capacity": 12,
  "description": "Upscale executive design with cream leather interior.",
  "images": ["https://res.cloudinary.com/.../sprinter.jpg"],
  "created_at": "2026-06-03T14:00:00.000Z"
}
```

**Response 400:** validación fallida
```json
{ "message": "Invalid vehicle data", "errors": { ... } }
```

---

### PUT /api/transfers/vehicles/:id
Actualiza un vehículo. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):** mismos campos que POST, todos opcionales. Solo se actualizan los campos enviados.

> Si se envían imágenes nuevas, **reemplazan** las existentes en Cloudinary.

**Response 200:** objeto `TransferVehicle` actualizado.

**Response 400:**
```json
{ "message": "Invalid vehicle data", "errors": { ... } }
```

**Response 404:**
```json
{ "message": "Vehicle not found" }
```

---

### DELETE /api/transfers/vehicles/:id
Elimina un vehículo y sus imágenes de Cloudinary. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "message": "Vehicle and associated images deleted successfully" }
```

**Response 404:**
```json
{ "message": "Vehicle not found" }
```

---

## Endpoints — Inquiries

### POST /api/transfers/inquiries
Envía una solicitud de traslado. **Público.**  
Dispara una notificación por email al admin automáticamente.

**Headers:**
```
Content-Type: application/json
```

**Body:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `vehicle_id` | number | ❌ | omitir o `null` si el cliente no eligió vehículo |
| `pick_up` | string | ✅ | texto libre, ej: "MIA Airport Terminal D" |
| `drop_off` | string | ✅ | texto libre, ej: "1428 Brickell Ave" |
| `date` | string | ✅ | formato `MM-DD-YYYY`, ej: `"06-15-2026"` |
| `time` | string | ✅ | formato `HH:mm`, ej: `"14:30"` |
| `passengers` | number | ✅ | entero positivo |
| `service_type` | string | ✅ | ver valores válidos abajo |
| `client_name` | string | ✅ | nombre completo |
| `client_email` | string | ✅ | debe ser email válido |
| `client_phone` | string | ✅ | |
| `notes` | string | ❌ | opcional, cualquier info adicional |

**Valores válidos para `service_type`:**
| Valor | Label sugerido en UI |
|---|---|
| `airport_transfer` | Airport Transfer |
| `business_travel` | Business Travel |
| `sports_events` | Sports & Events |
| `private_events` | Private Events |
| `yacht_transfer` | Yacht Transfer |
| `video_film_production` | Video / Film Production |
| `hourly` | Hourly Service |

**Response 201:**
```json
{
  "id": 1,
  "vehicle_id": 1,
  "vehicle_name": "Mercedes Benz S Class",
  "pick_up": "MIA Airport Terminal D",
  "drop_off": "1428 Brickell Ave",
  "date": "06-15-2026",
  "time": "14:30",
  "passengers": 2,
  "service_type": "airport_transfer",
  "client_name": "John Doe",
  "client_email": "john@example.com",
  "client_phone": "305-555-1234",
  "notes": null,
  "status": "pending",
  "created_at": "2026-06-03T15:00:00.000Z"
}
```

> Si `vehicle_id` fue `null`, `vehicle_name` también será `null`.

**Response 400:**
```json
{ "message": "Invalid inquiry data", "errors": { ... } }
```

---

### GET /api/transfers/inquiries
Lista todos los inquiries. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "vehicle_id": 1,
    "vehicle_name": "Mercedes Benz S Class",
    "pick_up": "MIA Airport Terminal D",
    "drop_off": "1428 Brickell Ave",
    "date": "06-15-2026",
    "time": "14:30",
    "passengers": 2,
    "service_type": "airport_transfer",
    "client_name": "John Doe",
    "client_email": "john@example.com",
    "client_phone": "305-555-1234",
    "notes": null,
    "status": "pending",
    "created_at": "2026-06-03T15:00:00.000Z"
  },
  {
    "id": 2,
    "vehicle_id": null,
    "vehicle_name": null,
    "pick_up": "Fontainebleau Hotel",
    "drop_off": "American Airlines Arena",
    "date": "06-20-2026",
    "time": "19:00",
    "passengers": 10,
    "service_type": "sports_events",
    "client_name": "Jane Smith",
    "client_email": "jane@example.com",
    "client_phone": "305-555-9999",
    "notes": "VIP group, need extra luggage space",
    "status": "confirmed",
    "created_at": "2026-06-03T16:00:00.000Z"
  }
]
```

> Ordenado por `created_at DESC` (más recientes primero).

---

### PATCH /api/transfers/inquiries/:id
Actualiza el status de un inquiry. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{ "status": "confirmed" }
```

> Valores válidos: `"pending"`, `"confirmed"`, `"cancelled"`

**Response 200:** objeto `TransferInquiry` actualizado.

**Response 400:**
```json
{ "message": "Invalid status", "errors": { ... } }
```

**Response 404:**
```json
{ "message": "Inquiry not found" }
```

---

## Notas de UI

### Vehículos
- **`category`** se puede mostrar con labels: `sedan` → "Sedan", `suv` → "SUV", `van` → "Van / Sprinter".
- **`capacity`** y **`luggage_capacity`** siempre vienen como enteros; mostrarlos con iconos de persona y maleta respectivamente.
- Si `description === null`, no renderizar el campo.
- Imágenes: campo `images` en `multipart/form-data`, máximo 20 por request. Si se envían imágenes en un PUT, **reemplazan** las anteriores.

### Inquiries
- El formulario de inquiry puede enviarse sin seleccionar vehículo — `vehicle_id` es opcional.
- Cuando `vehicle_id === null`, el cliente no eligió un vehículo específico; mostrar "No especificado" o "A definir".
- **`date`** viene como string `MM-DD-YYYY` — parsear con cuidado para evitar problemas de timezone.
- **`time`** viene como string `HH:mm` en formato 24h.
- **Status badges sugeridos:**
  | Status | Color |
  |---|---|
  | `pending` | Amarillo / Warning |
  | `confirmed` | Verde / Success |
  | `cancelled` | Rojo / Error |
- Después de enviar el formulario público, mostrar un mensaje de confirmación al usuario. El admin recibe el email automáticamente.
