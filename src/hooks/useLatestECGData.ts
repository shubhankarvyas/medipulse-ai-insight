import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSharedDemoECGData } from './useSharedDemoECGData';

interface ECGData {
  heart_rate?: number;
  rr_interval?: number;
  qrs_duration?: number;
  heart_rate_variability?: number;
  st_segment?: number;
  raw_value?: number;
  timestamp?: string;
}

interface ECGReading {
  id: string;
  timestamp: string;
  heart_rate: number;
  ecg_data: ECGData | null;
  signal_quality: number | null;
  battery_level: number | null;
  temperature: number;
  anomaly_detected: boolean | null;
  anomaly_type: string | null;
}

export const useLatestECGData = (patientId: string | null) => {
  const [latestReading, setLatestReading] = useState<ECGReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  
  // Get demo data as fallback
  const demoData = useSharedDemoECGData();

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const fetchLatestReading = async () => {
      const { data, error } = await supabase
        .from('ecg_readings')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLatestReading(data[0] as unknown as ECGReading);
      } else {
        // No real data found, enable demo mode after a delay
        setTimeout(() => {
          setUseDemo(true);
        }, 3000);
      }
      setLoading(false);
    };

    fetchLatestReading();

    // Set up real-time subscription
    const channel = supabase
      .channel('latest_ecg')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ecg_readings',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          setLatestReading(payload.new as unknown as ECGReading);
          setUseDemo(false); // Disable demo mode when real data comes in
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  // Return demo data if demo mode is enabled
  return { 
    latestReading: useDemo ? demoData.currentReading : latestReading, 
    loading: loading && !useDemo 
  };
};
