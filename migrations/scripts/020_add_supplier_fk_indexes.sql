-- Add missing FK indexes on supplier tables
-- reservation_suppliers.supplier_id and supplier_payments.reservation_supplier_id
-- had no indexes despite being used in JOINs and WHERE filters, causing full table scans.

CREATE INDEX IF NOT EXISTS idx_reservation_suppliers_supplier_id
    ON reservation_suppliers(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_reservation_supplier_id
    ON supplier_payments(reservation_supplier_id);
