-- Migration v2: Add MUAC column to growth_records
-- Run this once in the Supabase SQL Editor (dashboard.supabase.com → SQL Editor)

ALTER TABLE growth_records
  ADD COLUMN IF NOT EXISTS muac NUMERIC(5,2);
