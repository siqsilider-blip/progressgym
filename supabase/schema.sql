-- Run this in your Supabase SQL Editor

-- Create custom types
CREATE TYPE plan_status AS ENUM ('active', 'inactive', 'completed');

-- 1. Create Trainers Table (extends auth.users)
CREATE TABLE public.trainers (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We want to automatically insert a row into public.trainers when a user signs up.
-- Creating a trigger to handle this.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trainers (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Create Students Table
CREATE TABLE public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES public.trainers(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  active_plan plan_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Exercises Table (Trainer-specific custom exercises or global exercises if trainer_id is null)
CREATE TABLE public.exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES public.trainers(id), 
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Workouts/Plans Table
CREATE TABLE public.workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES public.trainers(id) NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Workout Exercises Table (Join table for Workouts & Exercises)
CREATE TABLE public.workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10',
  rest_time_seconds INTEGER DEFAULT 60,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- SET UP ROW LEVEL SECURITY (RLS)

-- Enable RLS on all tables
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- Trainers
-- Trainers can only read and update their own profile
CREATE POLICY "Trainers can view own profile" 
  ON public.trainers FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Trainers can update own profile" 
  ON public.trainers FOR UPDATE 
  USING (auth.uid() = id);

-- Students
-- Trainers can do all actions on their own students
CREATE POLICY "Trainers can select own students" 
  ON public.students FOR SELECT 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert own students" 
  ON public.students FOR INSERT 
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own students" 
  ON public.students FOR UPDATE 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own students" 
  ON public.students FOR DELETE 
  USING (auth.uid() = trainer_id);

-- Exercises
-- Trainers can see global exercises (trainer_id IS NULL) or their own
CREATE POLICY "Trainers can select exercises" 
  ON public.exercises FOR SELECT 
  USING (auth.uid() = trainer_id OR trainer_id IS NULL);

CREATE POLICY "Trainers can insert own exercises" 
  ON public.exercises FOR INSERT 
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own exercises" 
  ON public.exercises FOR UPDATE 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own exercises" 
  ON public.exercises FOR DELETE 
  USING (auth.uid() = trainer_id);

-- Workouts
CREATE POLICY "Trainers can select own workouts" 
  ON public.workouts FOR SELECT 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert own workouts" 
  ON public.workouts FOR INSERT 
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own workouts" 
  ON public.workouts FOR UPDATE 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own workouts" 
  ON public.workouts FOR DELETE 
  USING (auth.uid() = trainer_id);

-- Workout Exercises (Inherits security through workout_id join if we get fancy, but simple way is below)
-- Since we need to know if the workout belongs to the trainer...
CREATE POLICY "Trainers can select own workout exercises" 
  ON public.workout_exercises FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE workouts.id = workout_exercises.workout_id AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert own workout exercises" 
  ON public.workout_exercises FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE workouts.id = workout_exercises.workout_id AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update own workout exercises" 
  ON public.workout_exercises FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE workouts.id = workout_exercises.workout_id AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete own workout exercises" 
  ON public.workout_exercises FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE workouts.id = workout_exercises.workout_id AND workouts.trainer_id = auth.uid()
    )
  );
