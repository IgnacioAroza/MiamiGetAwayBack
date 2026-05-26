ALTER TABLE reservation_payments
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
