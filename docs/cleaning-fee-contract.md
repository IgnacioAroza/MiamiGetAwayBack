# API Contract — Cleaning Fee (actualización suppliers)

> Cambio puntual sobre la implementación existente de suppliers.

---

## Qué cambia

Se agrega el campo `cleaning_fee` a la asignación de proveedor en una reserva.

---

## 1. POST /api/reservations/:id/supplier

Agregar `cleaning_fee` al body (opcional, default `0`):

```json
{
  "supplier_id": 1,
  "payout_per_night": 180.00,
  "cleaning_fee": 120.00,
  "payment_terms": "Within 48h after check-out"
}
```

---

## 2. PUT /api/reservations/:id/supplier

También acepta `cleaning_fee` para actualizarlo:

```json
{
  "cleaning_fee": 150.00
}
```

---

## 3. GET /api/reservations/:id/supplier — response actualizado

```json
{
  "id": 1,
  "reservation_id": 1,
  "supplier": { ... },
  "payout_per_night": 180.00,
  "cleaning_fee": 120.00,
  "payment_terms": "Within 48h after check-out",
  "calculated": {
    "total": 1380.00,
    "paid": 1260.00,
    "balance": 120.00,
    "profit": 695.00
  }
}
```

**Fórmulas actualizadas:**
- `total` = `nights × payout_per_night + cleaning_fee`
- `profit` = `reservation.total_amount − total` (margen sobre el valor del deal, no sobre pagos realizados)

---

## 4. Vista de recibos en pagos al proveedor

El response de `GET /api/reservations/:id/supplier/payments` ya incluye `receiptImages`:

```json
[
  {
    "id": 1,
    "reservationSupplierId": 1,
    "amount": 1260.00,
    "method": "wire",
    "date": "2026-06-09",
    "referenceNotes": "Wire ref #WR-001",
    "receiptImages": [
      "https://res.cloudinary.com/dcxa0ozit/image/upload/v1/.../receipt.jpg"
    ],
    "createdAt": "2026-06-09T10:00:00.000Z"
  }
]
```

**Lógica de UI:**
- Si `receiptImages.length > 0` → mostrar thumbnails clickeables (abrir en lightbox o nueva pestaña)
- Si `receiptImages` está vacío → no mostrar nada o texto "Sin recibos"
- Las URLs son de Cloudinary, se pueden usar directamente en `<img src="..." />`

**No hay cambios en la API** — el campo ya venía en el response.

---

## 5. Cómo mostrarlo en el resumen financiero

```
Ingresos del cliente        $2,075.00   ← suma reservation_payments
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Costo proveedor (noches)    $1,260.00   ← nights × payout_per_night
Cleaning fee                  $120.00   ← cleaning_fee  ← NUEVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total a pagar supplier      $1,380.00   ← calculated.total
Pagado                      $1,260.00   ← calculated.paid
Balance pendiente             $120.00   ← calculated.balance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Profit                        $695.00   ← calculated.profit
```
