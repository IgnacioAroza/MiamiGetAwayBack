ALTER TABLE reservation_suppliers
    ADD COLUMN IF NOT EXISTS cleaning_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
