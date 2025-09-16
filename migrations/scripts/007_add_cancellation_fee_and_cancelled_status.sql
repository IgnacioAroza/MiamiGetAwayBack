-- Agrega columna cancellation_fee y estado 'cancelled' a reservations
-- Idempotente y seguro para ejecutar en dev/prod

BEGIN;

-- 1) Columna cancellation_fee con default 0 y NOT NULL
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric(10,2) DEFAULT 0 NOT NULL;

-- Asegurar que valores nulos existentes queden en 0 (por si la columna existiese sin default)
UPDATE public.reservations
  SET cancellation_fee = 0
  WHERE cancellation_fee IS NULL;

ALTER TABLE public.reservations
  ALTER COLUMN cancellation_fee SET DEFAULT 0,
  ALTER COLUMN cancellation_fee SET NOT NULL;

-- 2) Ampliar check constraint de status para incluir 'cancelled'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_status_check') THEN
    ALTER TABLE public.reservations DROP CONSTRAINT reservations_status_check;
  END IF;
  ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_status_check CHECK (
      status IN ('pending','confirmed','checked_in','checked_out','cancelled')
    );
END $$;

COMMIT;

