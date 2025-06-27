-- RUN THIS AFTER THE MAIN FIX TO CREATE DEMO USERS
-- This creates test users you can use to login

-- Demo patient user
INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at,
    raw_user_meta_data,
    aud,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'patient@demo.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Demo Patient", "role": "patient", "date_of_birth": "1990-01-01", "gender": "male"}',
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Demo doctor user  
INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at,
    raw_user_meta_data,
    aud,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'doctor@demo.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Dr. Demo", "role": "doctor", "license_number": "12345", "specialization": "Cardiology"}',
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Trigger the profile creation for demo users
SELECT public.handle_new_user() FROM auth.users WHERE email IN ('patient@demo.com', 'doctor@demo.com');

SELECT 'Demo users created! Login with:
- patient@demo.com / password123
- doctor@demo.com / password123' as message;
