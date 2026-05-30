-- Normalize legacy 'complete' value to 'completed' in reservations.payment_status
UPDATE reservations
SET payment_status = 'completed'
WHERE payment_status = 'complete';
