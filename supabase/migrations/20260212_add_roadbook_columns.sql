-- Add missing columns to travel_roadbooks
ALTER TABLE public.travel_roadbooks
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS departure_date DATE;
