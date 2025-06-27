-- 🔧 SUPABASE SIGNUP FIX - Fix the 500 error when creating new accounts
-- This will fix the trigger that handles user registration

-- Step 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create a robust trigger function that handles the exact data structure
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
    
    -- Insert into profiles table (this is required)
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        user_role
    );

    -- Insert into role-specific table based on user role
    IF user_role = 'patient' THEN
        INSERT INTO public.patients (
            user_id, 
            date_of_birth, 
            gender, 
            phone_number
        )
        VALUES (
            NEW.id,
            -- Handle date safely
            CASE 
                WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
                     AND NEW.raw_user_meta_data->>'date_of_birth' != ''
                     AND NEW.raw_user_meta_data->>'date_of_birth' != 'null'
                THEN (NEW.raw_user_meta_data->>'date_of_birth')::date
                ELSE NULL
            END,
            NULLIF(NEW.raw_user_meta_data->>'gender', 'null'),
            NULLIF(NEW.raw_user_meta_data->>'phone_number', 'null')
        );
    ELSIF user_role = 'doctor' THEN
        INSERT INTO public.doctors (
            user_id,
            license_number,
            specialization,
            years_of_experience
        )
        VALUES (
            NEW.id,
            NULLIF(NEW.raw_user_meta_data->>'license_number', 'null'),
            NULLIF(NEW.raw_user_meta_data->>'specialization', 'null'),
            -- Handle integer safely
            CASE 
                WHEN NEW.raw_user_meta_data->>'years_of_experience' IS NOT NULL 
                     AND NEW.raw_user_meta_data->>'years_of_experience' != ''
                     AND NEW.raw_user_meta_data->>'years_of_experience' != 'null'
                THEN (NEW.raw_user_meta_data->>'years_of_experience')::integer
                ELSE NULL
            END
        );
    END IF;

    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;