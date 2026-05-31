-- Expression indexes for VARCHAR date columns in the reservations table.
-- check_in_date and check_out_date are stored as VARCHAR(50) in MM-DD-YYYY HH:mm format.
-- A ::date cast is STABLE (depends on datestyle), so PostgreSQL rejects it in indexes.
-- We create an IMMUTABLE helper function using to_date() with an explicit format,
-- then index on that function so queries using it can do index scans.

CREATE OR REPLACE FUNCTION mga_parse_date(d text) RETURNS date
    LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT to_date(substr(d, 1, 10), 'MM-DD-YYYY')
    $$;

CREATE INDEX IF NOT EXISTS idx_reservations_check_in_date_expr
    ON reservations (mga_parse_date(check_in_date));

CREATE INDEX IF NOT EXISTS idx_reservations_check_out_date_expr
    ON reservations (mga_parse_date(check_out_date));
