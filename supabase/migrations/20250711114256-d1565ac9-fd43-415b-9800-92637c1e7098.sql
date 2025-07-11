
-- Update the order_stage enum to include 'delivery' stage
-- Note: We need to drop and recreate the enum since ALTER TYPE ADD VALUE might not work in all cases
DO $$ 
BEGIN
    -- Check if 'delivery' value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'delivery' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_stage')
    ) THEN
        -- Add 'delivery' to the enum
        ALTER TYPE order_stage ADD VALUE 'delivery';
    END IF;
END $$;

-- Add a delivered_at timestamp column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
