-- Suppliers: reusable providers assigned to reservations
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Links a supplier to a reservation with payout terms
CREATE TABLE IF NOT EXISTS reservation_suppliers (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    payout_per_night NUMERIC(10,2) NOT NULL,
    payment_terms VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (reservation_id)
);

-- Payment history to suppliers
CREATE TABLE IF NOT EXISTS supplier_payments (
    id SERIAL PRIMARY KEY,
    reservation_supplier_id INTEGER NOT NULL REFERENCES reservation_suppliers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('cash', 'wire', 'card', 'transfer')),
    date DATE NOT NULL,
    reference_notes TEXT,
    receipt_images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- supplier_status on reservations
ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS supplier_status VARCHAR(50) NOT NULL DEFAULT 'unassigned'
    CHECK (supplier_status IN ('unassigned', 'searching', 'confirmed'));
