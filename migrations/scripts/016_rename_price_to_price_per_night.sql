DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'apartments' AND column_name = 'price'
    ) THEN
        ALTER TABLE apartments RENAME COLUMN price TO price_per_night;
    END IF;
END $$;
