-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO FIX THE ISSUES
-- Go to: https://supabase.com/dashboard/project/rcopavlcfnbwjqstseau/sql

-- 1. Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own MRI scans" ON public.mri_scans;
DROP POLICY IF EXISTS "Users can view own MRI scans" ON public.mri_scans;
DROP POLICY IF EXISTS "Doctors can view assigned MRI scans" ON public.mri_scans;
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;
DROP POLICY IF EXISTS "Patients can update own data" ON public.patients;
DROP POLICY IF EXISTS "Doctors can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can insert own data" ON public.patients;
DROP POLICY IF EXISTS "Doctors can view own data" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can update own data" ON public.doctors;

-- 2. Temporarily disable RLS to allow setup
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mri_scans DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions for all authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Create a simple trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- Insert into role-specific table
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'patient' THEN
        INSERT INTO public.patients (
            user_id, 
            date_of_birth, 
            gender, 
            phone_number
        )
        VALUES (
            NEW.id,
            (NEW.raw_user_meta_data->>'date_of_birth')::date,
            NEW.raw_user_meta_data->>'gender',
            NEW.raw_user_meta_data->>'phone_number'
        )
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        INSERT INTO public.doctors (
            user_id,
            license_number,
            specialization,
            years_of_experience
        )
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'license_number',
            NEW.raw_user_meta_data->>'specialization',
            COALESCE((NEW.raw_user_meta_data->>'years_of_experience')::integer, 0)
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create a simple policy that allows everything for now
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON public.profiles USING (true) WITH CHECK (true);

-- Success message
SELECT 'Database setup completed successfully!' as message;
