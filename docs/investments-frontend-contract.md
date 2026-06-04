# Investments — Frontend Contract

## Base URL

```
https://miami-api-u1k5.onrender.com/api/investments
```

---

## Tipos

```typescript
interface Investment {
  id: number;
  name: string;
  unit_number: string | null;   // opcional
  address: string;
  description: string | null;
  bathrooms: number;
  rooms: number;
  price: number | null;         // null = "A consultar"
  images: string[];             // URLs Cloudinary
  created_at: string;           // ISO timestamp
}
```

---

## Endpoints

### GET /api/investments
Lista todas las inversiones. **Público.**

**Query params opcionales:**
| Param | Tipo | Default | Notas |
|---|---|---|---|
| `page` | number | — | número de página (base 1) |
| `limit` | number | — | ítems por página (máx 20) |

Sin params devuelve array directo. Con `?page=1&limit=10` devuelve `{ data: [...], pagination: { page, limit, total, totalPages } }`.

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Oceana Bal Harbour",
    "unit_number": "1502",
    "address": "10201 Collins Ave, Bal Harbour, FL 33154",
    "description": "Luxury 2-bedroom unit with ocean views.",
    "bathrooms": 2,
    "rooms": 2,
    "price": 950000,
    "images": ["https://res.cloudinary.com/.../image1.jpg"],
    "created_at": "2026-05-28T12:00:00.000Z"
  }
]
```

> Las imágenes vienen optimizadas para listado (tamaño reducido).

---

### GET /api/investments/:id
Detalle de una inversión. **Público.**

**Response 200:**
```json
{
  "id": 1,
  "name": "Oceana Bal Harbour",
  "unit_number": "1502",
  "address": "10201 Collins Ave, Bal Harbour, FL 33154",
  "description": "Luxury 2-bedroom unit with ocean views.",
  "bathrooms": 2,
  "rooms": 2,
  "price": 950000,
  "images": ["https://res.cloudinary.com/.../image1.jpg"],
  "responsiveImages": [...],
  "created_at": "2026-05-28T12:00:00.000Z"
}
```

> `responsiveImages` contiene variantes de tamaño para srcset.

**Response 404:**
```json
{ "error": "Investment not found" }
```

---

### POST /api/investments
Crea una nueva inversión. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `name` | string | ✅ | |
| `address` | string | ✅ | |
| `bathrooms` | number | ✅ | entero ≥ 0 |
| `rooms` | number | ✅ | entero > 0 |
| `unit_number` | string | ❌ | opcional |
| `description` | string | ❌ | opcional |
| `price` | number | ❌ | omitir o enviar vacío = "A consultar" |
| `images` | File[] | ❌ | campo `images`, máx. 30 archivos |

**Response 201:**
```json
{
  "id": 2,
  "name": "Echo Brickell",
  "unit_number": null,
  "address": "1451 Brickell Ave, Miami, FL 33131",
  "description": null,
  "bathrooms": 1,
  "rooms": 1,
  "price": null,
  "images": [],
  "created_at": "2026-05-28T14:00:00.000Z"
}
```

**Response 400:** validación fallida
```json
{ "message": "Invalid investment data", "errors": { ... } }
```

---

### PUT /api/investments/:id
Actualiza una inversión. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):** mismos campos que POST, todos opcionales. Solo se actualizan los campos enviados.

> Si se envían imágenes nuevas, **reemplazan** las existentes en Cloudinary.

**Response 200:** objeto `Investment` actualizado.

**Response 404:**
```json
{ "message": "Investment not found" }
```

---

### DELETE /api/investments/:id
Elimina una inversión y sus imágenes de Cloudinary. **Requiere JWT.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "message": "Investment and associated images deleted successfully" }
```

**Response 404:**
```json
{ "message": "Investment not found" }
```

---

## Notas de UI

- Cuando `price === null`, mostrar **"A consultar"** en lugar de un valor numérico.
- Cuando `unit_number === null`, simplemente no mostrarlo.
- El contacto del cliente (WhatsApp / email) lo maneja **el frontend** — el backend no tiene endpoint de inquiry para inversiones.
- Imágenes: campo `images` en `multipart/form-data`, máximo 30 por request.
