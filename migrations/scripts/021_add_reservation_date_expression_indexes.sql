-- Expression indexes for VARCHAR date columns in the reservations table.
-- check_in_date and check_out_date are stored as VARCHAR(50) in MM-DD-YYYY HH:mm format.
-- All queries apply a ::date cast (e.g. check_in_date::date >= $1), making the existing
-- idx_reservations_dates index non-sargable. These indexes match the exact expression
-- used in WHERE clauses and ORDER BY so PostgreSQL can use index scans.

SET datestyle = 'ISO, MDY';

CREATE INDEX IF NOT EXISTS idx_reservations_check_in_date_expr
    ON reservations ((check_in_date::date));

CREATE INDEX IF NOT EXISTS idx_reservations_check_out_date_expr
    ON reservations ((check_out_date::date));
