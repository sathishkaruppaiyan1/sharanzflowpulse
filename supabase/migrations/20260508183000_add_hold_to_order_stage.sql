DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'order_stage'
      AND e.enumlabel = 'hold'
  ) THEN
    ALTER TYPE public.order_stage ADD VALUE 'hold' AFTER 'pending';
  END IF;
END $$;
