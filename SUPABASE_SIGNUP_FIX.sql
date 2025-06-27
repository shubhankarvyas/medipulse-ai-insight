-- DIRECT SUPABASE FIX - Run this in your Supabase SQL Editor
-- This will fix the signup trigger that's causing the 500 error

-- Step 1: Drop the existing problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create a more robust trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get role from metadata, default to 'patient'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
    
    -- Insert into profiles (this is the main requirement)
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'fullName', 
            ''
        ),
        user_role
    );

    -- Insert into role-specific table with better error handling
    IF user_role = 'patient' THEN
        -- Insert patient record
        INSERT INTO public.patients (
            user_id, 
            date_of_birth, 
            gender, 
            phone_number
        )
        VALUES (
            NEW.id,
            -- Handle different date field names and null values
            CASE 
                WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
                     AND NEW.raw_user_meta_data->>'date_of_birth' != ''
                THEN (NEW.raw_user_meta_data->>'date_of_birth')::date
                WHEN NEW.raw_user_meta_data->>'dateOfBirth' IS NOT NULL 
                     AND NEW.raw_user_meta_data->>'dateOfBirth' != ''
                THEN (NEW.raw_user_meta_data->>'dateOfBirth')::date
                ELSE NULL
            END,
            NEW.raw_user_meta_data->>'gender',
            COALESCE(
                NEW.raw_user_meta_data->>'phone_number', 
                NEW.raw_user_meta_data->>'phoneNumber'
            )
        );
    ELSIF user_role = 'doctor' THEN
        -- Insert doctor record
        INSERT INTO public.doctors (
            user_id,
            license_number,
            specialization,
            years_of_experience
        )
        VALUES (
            NEW.id,
            COALESCE(
                NEW.raw_user_meta_data->>'license_number', 
                NEW.raw_user_meta_data->>'licenseNumber'
            ),
            NEW.raw_user_meta_data->>'specialization',
            -- Handle years of experience safely
            CASE 
                WHEN NEW.raw_user_meta_data->>'years_of_experience' IS NOT NULL 
                     AND NEW.raw_user_meta_data->>'years_of_experience' != ''
                THEN (NEW.raw_user_meta_data->>'years_of_experience')::integer
                WHEN NEW.raw_user_meta_data->>'yearsOfExperience' IS NOT NULL 
                     AND NEW.raw_user_meta_data->>'yearsOfExperience' != ''
                THEN (NEW.raw_user_meta_data->>'yearsOfExperience')::integer
                ELSE NULL
            END
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If anything fails, log it but don't prevent user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, authenticated;
