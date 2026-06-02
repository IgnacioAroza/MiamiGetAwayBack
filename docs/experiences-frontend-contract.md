# Experiences — Frontend Contract

## Base URL

```
https://miami-api-u1k5.onrender.com/api/experiences
```

---

## Tipos

```typescript
interface Experience {
  id: number;
  title: string;
  description: string | null;
  capacity: number | null;   // null = sin límite / no especificado
  price: number | null;      // null = "A consultar"
  images: string[];          // URLs Cloudinary
  created_at: string;        // ISO timestamp
}

type InquiryStatus = 'pending' | 'contacted' | 'closed';

interface ExperienceInquiry {
  id: number;
  experience_id: number | null;
  experience_title: string | null;  // viene del JOIN, null si consulta general
  name: string;
  lastname: string;
  email: string;
  phone: string | null;
  status: InquiryStatus;
  created_at: string;
}
```

---

## Endpoints — Experiences

### GET /api/experiences
Lista todas las experiencias. **Público.**

**Response 200:**
```json
[
  {
    "id": 1,
    "title": "Deep Sea Fishing",
    "description": "Full day offshore fishing trip with equipment included.",
    "capacity": 8,
    "price": 350,
    "images": ["https://res.cloudinary.com/.../image1.jpg"],
    "created_at": "2026-06-01T12:00:00.000Z"
  }
]
```

> Las imágenes vienen optimizadas para listado (tamaño reducido).

---

### GET /api/experiences/:id
Detalle de una experiencia. **Público.**

**Response 200:**
```json
{
  "id": 1,
  "title": "Deep Sea Fishing",
  "description": "Full day offshore fishing trip with equipment included.",
  "capacity": 8,
  "price": 350,
  "images": ["https://res.cloudinary.com/.../image1.jpg"],
  "responsiveImages": [...],
  "created_at": "2026-06-01T12:00:00.000Z"
}
```

> `responsiveImages` contiene variantes de tamaño para srcset.

**Response 404:**
```json
{ "message": "Experience not found" }
```

---

### POST /api/experiences
Crea una nueva experiencia. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `title` | string | ✅ | |
| `description` | string | ❌ | opcional |
| `capacity` | number | ❌ | entero positivo; omitir = sin límite |
| `price` | number | ❌ | omitir o enviar vacío = "A consultar" |
| `images` | File[] | ❌ | campo `images`, máx. 30 archivos |

**Response 201:**
```json
{
  "id": 2,
  "title": "Sunset Yacht Tour",
  "description": null,
  "capacity": null,
  "price": null,
  "images": [],
  "created_at": "2026-06-01T14:00:00.000Z"
}
```

**Response 400:** validación fallida
```json
{ "message": "Invalid experience data", "errors": { ... } }
```

---

### PUT /api/experiences/:id
Actualiza una experiencia. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):** mismos campos que POST, todos opcionales. Solo se actualizan los campos enviados.

> Si se envían imágenes nuevas, **reemplazan** las existentes en Cloudinary.

**Response 200:** objeto `Experience` actualizado.

**Response 404:**
```json
{ "message": "Experience not found" }
```

---

### DELETE /api/experiences/:id
Elimina una experiencia y sus imágenes de Cloudinary. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "message": "Experience and associated images deleted successfully" }
```

**Response 404:**
```json
{ "message": "Experience not found" }
```

---

## Endpoints — Inquiries

### POST /api/experiences/inquiries
Envía una consulta de interés. **Público.**  
Dispara una notificación por email al admin automáticamente.

**Headers:**
```
Content-Type: application/json
```

**Body:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `experience_id` | number | ❌ | omitir o `null` = consulta general |
| `name` | string | ✅ | |
| `lastname` | string | ✅ | |
| `email` | string | ✅ | debe ser email válido |
| `phone` | string | ❌ | opcional |

**Response 201:**
```json
{
  "id": 1,
  "experience_id": 1,
  "name": "John",
  "lastname": "Doe",
  "email": "john@example.com",
  "phone": "305-555-1234",
  "status": "pending",
  "created_at": "2026-06-01T15:00:00.000Z"
}
```

**Response 400:**
```json
{ "message": "Invalid inquiry data", "errors": { ... } }
```

---

### GET /api/experiences/inquiries
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
    "experience_id": 1,
    "experience_title": "Deep Sea Fishing",
    "name": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone": "305-555-1234",
    "status": "pending",
    "created_at": "2026-06-01T15:00:00.000Z"
  },
  {
    "id": 2,
    "experience_id": null,
    "experience_title": null,
    "name": "Jane",
    "lastname": "Smith",
    "email": "jane@example.com",
    "phone": null,
    "status": "contacted",
    "created_at": "2026-06-01T16:00:00.000Z"
  }
]
```

---

### PATCH /api/experiences/inquiries/:id
Actualiza el status de un inquiry. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{ "status": "contacted" }
```

> Valores válidos: `"pending"`, `"contacted"`, `"closed"`

**Response 200:** objeto `ExperienceInquiry` actualizado.

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

- Cuando `price === null`, mostrar **"A consultar"**.
- Cuando `capacity === null`, no mostrar el campo o mostrar **"Sin límite"**.
- Cuando `experience_title === null` en un inquiry, el visitante hizo una consulta general (no sobre una experiencia específica).
- El formulario de inquiry puede enviarse sin seleccionar experiencia — es válido.
- Imágenes: campo `images` en `multipart/form-data`, máximo 30 por request.
