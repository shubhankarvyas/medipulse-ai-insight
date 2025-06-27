-- Fix the user signup trigger to handle all edge cases
-- Drop and recreate the trigger function with better error handling

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role TEXT;
    profile_id UUID;
BEGIN
    -- Get role from metadata, default to 'patient'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
    
    -- Insert into profiles with error handling
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
            user_role
        );
        
        profile_id := NEW.id;
    EXCEPTION WHEN OTHERS THEN
        -- Log error and continue
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
    END;

    -- Insert into role-specific table with error handling
    BEGIN
        IF user_role = 'patient' THEN
            INSERT INTO public.patients (
                user_id, 
                date_of_birth, 
                gender, 
                phone_number
            )
            VALUES (
                NEW.id,
                CASE 
                    WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
                         AND NEW.raw_user_meta_data->>'date_of_birth' != ''
                    THEN (NEW.raw_user_meta_data->>'date_of_birth')::date
                    WHEN NEW.raw_user_meta_data->>'dateOfBirth' IS NOT NULL 
                         AND NEW.raw_user_meta_data->>'dateOfBirth' != ''
                    THEN (NEW.raw_user_meta_data->>'dateOfBirth')::date
                    ELSE NULL
                END,
                COALESCE(NEW.raw_user_meta_data->>'gender', NULL),
                COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phoneNumber', NULL)
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
                COALESCE(NEW.raw_user_meta_data->>'license_number', NEW.raw_user_meta_data->>'licenseNumber', NULL),
                COALESCE(NEW.raw_user_meta_data->>'specialization', NULL),
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
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create role-specific record for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create more permissive policies
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role and triggers" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;

-- Ensure the trigger function can be executed
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
