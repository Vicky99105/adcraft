-- SQL script to update existing uploads table with new fields
-- Run this in your Supabase SQL editor if you need to add the new fields

-- Add new columns to uploads table (if they don't exist)
DO $$ 
BEGIN
    -- Add execution_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'execution_id') THEN
        ALTER TABLE uploads ADD COLUMN execution_id uuid REFERENCES executions(id);
    END IF;
    
    -- Add file_size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'file_size') THEN
        ALTER TABLE uploads ADD COLUMN file_size bigint;
    END IF;
    
    -- Add content_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'content_type') THEN
        ALTER TABLE uploads ADD COLUMN content_type text;
    END IF;
    
    -- Add is_fallback column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'is_fallback') THEN
        ALTER TABLE uploads ADD COLUMN is_fallback boolean DEFAULT false;
    END IF;
END $$;
