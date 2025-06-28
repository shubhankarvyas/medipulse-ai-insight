-- Fix ECG readings table by adding missing columns

-- Add missing columns to ecg_readings table
ALTER TABLE public.ecg_readings 
ADD COLUMN IF NOT EXISTS ecg_data JSONB,
ADD COLUMN IF NOT EXISTS signal_quality INTEGER CHECK (signal_quality >= 0 AND signal_quality <= 100),
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS activity_level TEXT,
ADD COLUMN IF NOT EXISTS anomaly_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS anomaly_type TEXT;

-- Update existing records to have default values
UPDATE public.ecg_readings 
SET 
    ecg_data = '{"heart_rate": ' || heart_rate || ', "timestamp": "' || timestamp || '"}',
    signal_quality = CASE 
        WHEN heart_rate BETWEEN 60 AND 100 THEN 95
        WHEN heart_rate BETWEEN 50 AND 120 THEN 85
        ELSE 70
    END,
    battery_level = 85,
    anomaly_detected = CASE 
        WHEN heart_rate < 50 OR heart_rate > 120 THEN true
        ELSE false
    END,
    anomaly_type = CASE 
        WHEN heart_rate < 50 THEN 'Bradycardia'
        WHEN heart_rate > 120 THEN 'Tachycardia'
        ELSE NULL
    END
WHERE ecg_data IS NULL;

-- Verify the changes
SELECT COUNT(*) as total_records, 
       COUNT(ecg_data) as records_with_ecg_data,
       COUNT(signal_quality) as records_with_signal_quality
FROM public.ecg_readings;
