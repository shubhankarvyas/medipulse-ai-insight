-- Fix doctor policies to allow patients to view all doctors for appointment booking
-- and fix doctor dashboard functionality

-- Add policy to allow authenticated users to view all doctors for appointment booking
CREATE POLICY "Allow patients to view all doctors for appointments" ON public.doctors
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Add policy to allow patients to view all doctor profiles for appointment booking
CREATE POLICY "Allow users to view doctor profiles" ON public.profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND role = 'doctor'
    );

-- Grant additional permissions for better functionality
GRANT SELECT ON public.doctors TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
