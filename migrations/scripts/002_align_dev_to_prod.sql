-- Alinear esquema de desarrollo con producción
-- NOTA: No ejecutar automáticamente; revisar y ejecutar manualmente en entorno dev
-- Este script intenta ser idempotente donde es posible.

BEGIN;

-- 1) Renombrar tabla mal escrita yatchs -> yachts (si aplica)
DO $$
BEGIN
  IF to_regclass('public.yatchs') IS NOT NULL AND to_regclass('public.yachts') IS NULL THEN
    ALTER TABLE public.yatchs RENAME TO yachts;
  END IF;
END $$;

-- Ajustar secuencia por si existe y está ligada a la antigua tabla
DO $$
BEGIN
  IF to_regclass('public.yatchs_id_seq') IS NOT NULL AND to_regclass('public.yachts') IS NOT NULL THEN
    ALTER SEQUENCE public.yatchs_id_seq OWNED BY public.yachts.id;
    ALTER TABLE ONLY public.yachts ALTER COLUMN id SET DEFAULT nextval('public.yatchs_id_seq'::regclass);
  END IF;
END $$;

-- 2) Admins: reducir username a 50 y agregar UNIQUE(username)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admins' AND column_name='username'
  ) THEN
    ALTER TABLE public.admins
      ALTER COLUMN username TYPE varchar(50) USING substring(username, 1, 50);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_username_key'
  ) THEN
    ALTER TABLE public.admins ADD CONSTRAINT admins_username_key UNIQUE (username);
  END IF;
END $$;

-- 3) Apartments: ajustar nullabilidad y tipos, remover timestamps/trigger
-- Saneamos datos antes de imponer NOT NULL
UPDATE public.apartments SET capacity = 0 WHERE capacity IS NULL;
UPDATE public.apartments SET rooms = 0 WHERE rooms IS NULL;
UPDATE public.apartments SET bathrooms = 0 WHERE bathrooms IS NULL;
UPDATE public.apartments SET unit_number = 'N/A' WHERE unit_number IS NULL OR unit_number = '';

ALTER TABLE public.apartments
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN capacity SET NOT NULL,
  ALTER COLUMN rooms SET NOT NULL,
  ALTER COLUMN bathrooms SET NOT NULL;

ALTER TABLE public.apartments
  ALTER COLUMN unit_number TYPE varchar(100),
  ALTER COLUMN unit_number SET NOT NULL;

-- Quitar columnas de timestamps si existen (prod no las usa en esta tabla)
ALTER TABLE public.apartments DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.apartments DROP COLUMN IF EXISTS updated_at;
DROP TRIGGER IF EXISTS update_apartments_updated_at ON public.apartments;

-- 4) Cars: aumentar longitudes y remover timestamps si existen
ALTER TABLE public.cars
  ALTER COLUMN brand TYPE varchar(100),
  ALTER COLUMN model TYPE varchar(100);

ALTER TABLE public.cars DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.cars DROP COLUMN IF EXISTS updated_at;

-- 5) Clients: email a 255 y quitar UNIQUE(email) para igualar prod; remover timestamps/trigger
ALTER TABLE public.clients
  ALTER COLUMN email TYPE varchar(255);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_email_key') THEN
    ALTER TABLE public.clients DROP CONSTRAINT clients_email_key;
  END IF;
END $$;

ALTER TABLE public.clients DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.clients DROP COLUMN IF EXISTS updated_at;
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;

-- 6) Reservations: alinear restricciones/campos y FK
-- Saneamos datos previos a NOT NULL
UPDATE public.reservations
  SET client_id = (SELECT id FROM public.clients ORDER BY id LIMIT 1)
  WHERE client_id IS NULL;

UPDATE public.reservations
  SET cleaning_fee = 0
  WHERE cleaning_fee IS NULL;

UPDATE public.reservations
  SET amount_due = COALESCE(total_amount,0) - COALESCE(amount_paid,0)
  WHERE amount_due IS NULL;

-- Ajustes de columnas
ALTER TABLE public.reservations
  ALTER COLUMN client_id SET NOT NULL,
  ALTER COLUMN cleaning_fee SET NOT NULL,
  ALTER COLUMN amount_due SET NOT NULL,
  ALTER COLUMN created_at DROP NOT NULL,
  ALTER COLUMN check_in_date DROP NOT NULL,
  ALTER COLUMN check_out_date DROP NOT NULL;

-- Reemplazar check constraint de status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_status_check') THEN
    ALTER TABLE public.reservations DROP CONSTRAINT reservations_status_check;
  END IF;
  ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_status_check CHECK (
      status IN ('pending','confirmed','checked_in','checked_out')
    );
END $$;

-- FK explícita a clients(id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_client_id') THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT fk_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id);
  END IF;
END $$;

-- Quitar updated_at y trigger (prod no los usa en esta tabla)
ALTER TABLE public.reservations DROP COLUMN IF EXISTS updated_at;
DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;

-- 7) Reservation_payments: defaults/check y limpiar columnas extra
ALTER TABLE public.reservation_payments
  ALTER COLUMN payment_date SET DEFAULT CURRENT_TIMESTAMP;

-- Normalizar valores existentes de payment_method para cumplir con el CHECK
-- Pasar a minúsculas
UPDATE public.reservation_payments
  SET payment_method = LOWER(payment_method)
  WHERE payment_method IS NOT NULL;

-- Mapear sinónimos y variantes comunes
UPDATE public.reservation_payments SET payment_method = 'card'
  WHERE payment_method IN ('credit_card','credit-card','credit card','tarjeta','cc','credit');

UPDATE public.reservation_payments SET payment_method = 'bank_transfer'
  WHERE payment_method IN ('bank transfer','bank-transfer','wire','transferencia');

-- Cualquier valor fuera del conjunto permitido -> 'other'
UPDATE public.reservation_payments SET payment_method = 'other'
  WHERE payment_method IS NOT NULL
    AND payment_method NOT IN ('cash','transfer','card','paypal','bank_transfer','zelle','stripe','other');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservation_payments_payment_method_check'
  ) THEN
    ALTER TABLE public.reservation_payments
      ADD CONSTRAINT reservation_payments_payment_method_check CHECK (
        payment_method IN ('cash','transfer','card','paypal','bank_transfer','zelle','stripe','other')
      );
  END IF;
END $$;

ALTER TABLE public.reservation_payments DROP COLUMN IF EXISTS status;
ALTER TABLE public.reservation_payments DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.reservation_payments DROP COLUMN IF EXISTS updated_at;
DROP TRIGGER IF EXISTS update_reservation_payments_updated_at ON public.reservation_payments;

-- 8) Villas: similar a apartments
UPDATE public.villas SET capacity = 0 WHERE capacity IS NULL;
UPDATE public.villas SET rooms = 0 WHERE rooms IS NULL;
UPDATE public.villas SET bathrooms = 0 WHERE bathrooms IS NULL;

ALTER TABLE public.villas
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN capacity SET NOT NULL,
  ALTER COLUMN bathrooms SET NOT NULL,
  ALTER COLUMN rooms SET NOT NULL;

ALTER TABLE public.villas DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.villas DROP COLUMN IF EXISTS updated_at;

-- 9) Yachts: asegurar nullabilidad y limpiar timestamps
ALTER TABLE public.yachts
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN capacity SET NOT NULL;

ALTER TABLE public.yachts DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.yachts DROP COLUMN IF EXISTS updated_at;

-- 10) monthly_summaries: chequeo de mes e índices; tipos a timestamptz
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='monthly_summaries' AND column_name IN ('created_at','updated_at')
  ) THEN
    ALTER TABLE public.monthly_summaries
      ALTER COLUMN created_at TYPE timestamptz USING created_at,
      ALTER COLUMN updated_at TYPE timestamptz USING updated_at;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public' AND constraint_name='monthly_summaries_month_check'
  ) THEN
    ALTER TABLE public.monthly_summaries
      ADD CONSTRAINT monthly_summaries_month_check CHECK (month >= 1 AND month <= 12);
  END IF;
END $$;

-- Reemplazar UNIQUE(month,year) por índice único si existiese constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_summaries_month_year_key') THEN
    ALTER TABLE public.monthly_summaries DROP CONSTRAINT monthly_summaries_month_year_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_summaries_month_year ON public.monthly_summaries (month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_year ON public.monthly_summaries (year);

-- 11) Limpiar índices que no existen en prod (opcional si quieres espejo exacto)
DROP INDEX IF EXISTS public.idx_reservations_dates;
DROP INDEX IF EXISTS public.idx_payments_date;

-- 12) Eliminar triggers restantes sobre updated_at y función si no se usa
DROP TRIGGER IF EXISTS update_monthly_summaries_updated_at ON public.monthly_summaries;

-- La función puede eliminarse si no hay triggers dependientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgfoid = (
      SELECT oid FROM pg_proc WHERE proname = 'update_updated_at_column'
    )
  ) THEN
    DROP FUNCTION IF EXISTS public.update_updated_at_column();
  END IF;
END $$;

COMMIT;
