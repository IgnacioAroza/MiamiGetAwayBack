UPDATE supplier_payments SET method = 'transfer' WHERE method = 'wire';

ALTER TABLE supplier_payments
    DROP CONSTRAINT IF EXISTS supplier_payments_method_check;

ALTER TABLE supplier_payments
    ADD CONSTRAINT supplier_payments_method_check
    CHECK (method IN ('cash', 'card', 'transfer', 'paypal', 'zelle', 'stripe', 'other'));
