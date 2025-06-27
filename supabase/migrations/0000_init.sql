-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('doctor', 'patient')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
DROP POLICY IF EXISTS "Allow authenticated uploads to mri-scans" ON storage.objects;

-- 🧹 Drop all existing tables
DROP TABLE IF EXISTS public.mri_scans CASCADE;
DROP TABLE IF EXISTS public.ecg_readings CASCADE;
DROP TABLE IF EXISTS public.ecg_devices CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ✅ Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'patient')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ✅ Create patients table (includes assigned_doctor_id)
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    phone_number TEXT,
    medical_history TEXT,
    assigned_doctor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ✅ Create doctors table
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_number TEXT UNIQUE,
    specialization TEXT,
    phone_number TEXT,
    years_of_experience INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ✅ Create ECG devices table
CREATE TABLE public.ecg_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMPTZ,
    battery_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ✅ Create ECG readings table
CREATE TABLE public.ecg_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.ecg_devices(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    heart_rate INTEGER NOT NULL,
    temperature DECIMAL(4,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ✅ Create MRI scans table
CREATE TABLE public.mri_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    scan_type TEXT,
    scan_date DATE,
    ai_analysis_result JSONB,
    ai_confidence_score DECIMAL(3,2),
    doctor_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'reviewed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ✅ Create storage bucket (MRI)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mri-scans', 'mri-scans', false)
ON CONFLICT (id) DO NOTHING;

-- ✅ Add storage policies
CREATE POLICY "Public Access to mri-scans"
ON storage.objects FOR SELECT
USING ( bucket_id = 'mri-scans' );

CREATE POLICY "Insert Access to mri-scans"
ON storage.objects FOR INSERT
WITH CHECK ( 
    bucket_id = 'mri-scans' 
    AND auth.role() = 'authenticated'
);

-- ✅ Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mri_scans ENABLE ROW LEVEL SECURITY;

-- ✅ Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (true);  -- Everyone can view profiles
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ✅ MRI scan access
CREATE POLICY "Users can insert own MRI scans" ON public.mri_scans
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can view own MRI scans" ON public.mri_scans
    FOR SELECT USING (
        auth.uid() = uploaded_by OR
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    );
CREATE POLICY "Doctors can view assigned MRI scans" ON public.mri_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE assigned_doctor_id = auth.uid() AND id = mri_scans.patient_id
        )
    );

-- ✅ Policies for patients
CREATE POLICY "Patients can view own data" ON public.patients
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Patients can update own data" ON public.patients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view all patients" ON public.patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'doctor'
        )
    );

CREATE POLICY "Patients can insert own data" ON public.patients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ✅ Policies for doctors
CREATE POLICY "Doctors can view own data" ON public.doctors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Doctors can update own data" ON public.doctors
    FOR UPDATE USING (auth.uid() = user_id);

-- ✅ Realtime for ECG
ALTER PUBLICATION supabase_realtime ADD TABLE public.ecg_readings;
ALTER TABLE public.ecg_readings REPLICA IDENTITY FULL;

-- ✅ Supabase function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- First, insert into profiles
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
    );

    -- Then, based on role, insert into either patients or doctors
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'patient' THEN
        INSERT INTO public.patients (user_id)
        VALUES (NEW.id);
    ELSE
        INSERT INTO public.doctors (user_id)
        VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to postgres role
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Ensure the function runs with elevated privileges
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

-- ✅ Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
