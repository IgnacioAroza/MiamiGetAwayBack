-- Add ON DELETE CASCADE to reservation_payments.reservation_id FK.
-- This ensures that deleting a reservation also removes its payment records,
-- enabling safe compensating deletes when reservation creation + payment fail atomically.

ALTER TABLE reservation_payments
    DROP CONSTRAINT IF EXISTS reservation_payments_reservation_id_fkey;

ALTER TABLE reservation_payments
    ADD CONSTRAINT reservation_payments_reservation_id_fkey
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE;
