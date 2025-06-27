
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'patient')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table for detailed patient information
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone_number TEXT,
  address TEXT,
  medical_history TEXT,
  assigned_doctor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create doctors table for detailed doctor information
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE,
  specialization TEXT,
  phone_number TEXT,
  hospital_affiliation TEXT,
  years_of_experience INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ECG devices table for ESP32 devices
CREATE TABLE public.ecg_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  battery_level INTEGER,
  firmware_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ECG readings table for real-time data
CREATE TABLE public.ecg_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.ecg_devices(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  heart_rate INTEGER NOT NULL,
  ecg_data JSONB NOT NULL, -- Store raw ECG waveform data
  signal_quality INTEGER CHECK (signal_quality >= 0 AND signal_quality <= 100),
  battery_level INTEGER,
  temperature DECIMAL(4,2),
  activity_level TEXT,
  anomaly_detected BOOLEAN DEFAULT false,
  anomaly_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MRI scans table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for MRI scans
INSERT INTO storage.buckets (id, name, public) VALUES ('mri-scans', 'mri-scans', false);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mri_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for patients
CREATE POLICY "Patients can view their own data" ON public.patients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view their assigned patients" ON public.patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'doctor'
    ) AND assigned_doctor_id = auth.uid()
  );

CREATE POLICY "Patients can update their own data" ON public.patients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Doctors can update their assigned patients" ON public.patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'doctor'
    ) AND assigned_doctor_id = auth.uid()
  );

-- RLS Policies for doctors
CREATE POLICY "Doctors can view their own data" ON public.doctors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Doctors can update their own data" ON public.doctors
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ECG devices
CREATE POLICY "Patients can view their own devices" ON public.ecg_devices
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view their patients' devices" ON public.ecg_devices
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE assigned_doctor_id = auth.uid()
    )
  );

-- RLS Policies for ECG readings
CREATE POLICY "Patients can view their own ECG data" ON public.ecg_readings
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view their patients' ECG data" ON public.ecg_readings
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE assigned_doctor_id = auth.uid()
    )
  );

CREATE POLICY "Allow ECG data insertion from devices" ON public.ecg_readings
  FOR INSERT WITH CHECK (true); -- This will be secured by API key in edge function

-- RLS Policies for MRI scans
CREATE POLICY "Patients can view their own MRI scans" ON public.mri_scans
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view their patients' MRI scans" ON public.mri_scans
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE assigned_doctor_id = auth.uid()
    )
  );

CREATE POLICY "Only authenticated users can upload MRI scans" ON public.mri_scans
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their uploaded MRI scans" ON public.mri_scans
  FOR UPDATE USING (auth.uid() = uploaded_by);

-- Storage policies for MRI scans
CREATE POLICY "Authenticated users can upload MRI scans" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mri-scans' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view MRI scans they have access to" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'mri-scans' AND (
      -- Patient can view their own scans
      name LIKE '%/' || auth.uid()::text || '/%' OR
      -- Doctor can view their patients' scans
      EXISTS (
        SELECT 1 FROM public.mri_scans ms
        JOIN public.patients p ON ms.patient_id = p.id
        WHERE ms.file_path = name AND p.assigned_doctor_id = auth.uid()
      )
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  );
  
  -- If role is patient, create patient record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'patient' THEN
    INSERT INTO public.patients (user_id, phone_number, gender, date_of_birth)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'phone_number',
      NEW.raw_user_meta_data->>'gender',
      CASE WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
           THEN (NEW.raw_user_meta_data->>'date_of_birth')::date 
           ELSE NULL END
    );
  END IF;
  
  -- If role is doctor, create doctor record
  IF NEW.raw_user_meta_data->>'role' = 'doctor' THEN
    INSERT INTO public.doctors (user_id, license_number, specialization, phone_number)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'license_number',
      NEW.raw_user_meta_data->>'specialization',
      NEW.raw_user_meta_data->>'phone_number'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable realtime for ECG data
ALTER TABLE public.ecg_readings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ecg_readings;
