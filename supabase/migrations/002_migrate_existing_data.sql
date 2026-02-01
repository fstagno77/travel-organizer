-- Migration: Assign existing data to fstagno@gmail.com
-- Run this AFTER the user has signed up with Google OAuth
-- Execute in Supabase SQL Editor

-- Step 1: Assign existing trips and photos to fstagno@gmail.com
DO $$
DECLARE
  target_user_id UUID;
  trips_count INTEGER;
  photos_count INTEGER;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'fstagno@gmail.com';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User fstagno@gmail.com not found. Please sign up with Google first.';
  END IF;

  -- Update all existing trips without user_id
  UPDATE public.trips
  SET user_id = target_user_id
  WHERE user_id IS NULL;

  GET DIAGNOSTICS trips_count = ROW_COUNT;

  -- Update all existing city photos without user_id
  UPDATE public.city_photos
  SET user_id = target_user_id
  WHERE user_id IS NULL;

  GET DIAGNOSTICS photos_count = ROW_COUNT;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Assigned % trips to user %', trips_count, target_user_id;
  RAISE NOTICE '  - Assigned % city photos to user %', photos_count, target_user_id;
END $$;

-- Step 2: Make user_id NOT NULL (run after migration is verified)
-- Uncomment these lines after verifying the migration worked:

-- ALTER TABLE public.trips
-- ALTER COLUMN user_id SET NOT NULL;

-- ALTER TABLE public.city_photos
-- ALTER COLUMN user_id SET NOT NULL;
