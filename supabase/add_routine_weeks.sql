-- Migration: Add multi-week support to routines
-- Run this in the Supabase SQL Editor

-- 1. Create routine_weeks table
CREATE TABLE IF NOT EXISTS public.routine_weeks (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    routine_id  UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(routine_id, week_number)
);

-- 2. RLS
ALTER TABLE public.routine_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers manage their routine weeks" ON public.routine_weeks;
CREATE POLICY "Trainers manage their routine weeks"
ON public.routine_weeks FOR ALL
USING (
    routine_id IN (
        SELECT id FROM public.routines WHERE trainer_id = auth.uid()
    )
);

-- 3. Add routine_week_id to routine_days (nullable — backward compat preserved)
ALTER TABLE public.routine_days
ADD COLUMN IF NOT EXISTS routine_week_id UUID REFERENCES public.routine_weeks(id) ON DELETE SET NULL;

-- 4. Seed: create week 1 for every existing routine
INSERT INTO public.routine_weeks (routine_id, week_number)
SELECT id, 1 FROM public.routines
ON CONFLICT (routine_id, week_number) DO NOTHING;

-- 5. Backfill: link existing days to their routine's week 1
UPDATE public.routine_days d
SET routine_week_id = w.id
FROM public.routine_weeks w
WHERE w.routine_id = d.routine_id
  AND w.week_number = 1
  AND d.routine_week_id IS NULL;
