import { useState, useEffect } from 'react';

interface DemoECGReading {
  id: string;
  timestamp: string;
  heart_rate: number;
  ecg_data: {
    heart_rate: number;
    rr_interval: number;
    qrs_duration: number;
    heart_rate_variability: number;
    st_segment: number;
    raw_value: number;
  };
  signal_quality: number;
  battery_level: number;
  temperature: number;
  anomaly_detected: boolean;
  anomaly_type: string | null;
}

interface DemoECGDevice {
  id: string;
  device_id: string;
  device_name: string;
  is_active: boolean;
  last_sync: string;
  battery_level: number;
}

export const useDemoECGData = () => {
  const [currentReading, setCurrentReading] = useState<DemoECGReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<DemoECGReading[]>([]);
  const [devices] = useState<DemoECGDevice[]>([
    {
      id: 'demo-device-1',
      device_id: 'ESP32-DEMO-001',
      device_name: 'ESP32 ECG Monitor (Demo)',
      is_active: true,
      last_sync: new Date().toISOString(),
      battery_level: 92
    }
  ]);

  const generateRealisticECGReading = (): DemoECGReading => {
    const baseHeartRate = 72;
    const variation = Math.random() * 16 - 8; // ±8 BPM variation
    const heartRate = Math.round(baseHeartRate + variation);
    
    // Calculate RR interval from heart rate
    const rrInterval = Math.round(60000 / heartRate);
    
    // Generate other realistic metrics
    const qrsDuration = 80 + Math.round(Math.random() * 40); // 80-120ms
    const hrv = 30 + Math.round(Math.random() * 40); // 30-70ms
    const stSegment = Math.random() * 0.3; // 0-0.3mV
    const signalQuality = 85 + Math.round(Math.random() * 15); // 85-100%
    const temperature = 98.0 + Math.random() * 1.2; // 98.0-99.2°F
    
    // Determine if anomaly should be detected
    const anomalyDetected = heartRate < 55 || heartRate > 110 || stSegment > 0.15;
    let anomalyType = null;
    
    if (anomalyDetected) {
      if (heartRate < 55) anomalyType = 'Bradycardia';
      else if (heartRate > 110) anomalyType = 'Tachycardia';
      else if (stSegment > 0.15) anomalyType = 'ST Segment Elevation';
    }

    return {
      id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      heart_rate: heartRate,
      ecg_data: {
        heart_rate: heartRate,
        rr_interval: rrInterval,
        qrs_duration: qrsDuration,
        heart_rate_variability: hrv,
        st_segment: stSegment,
        raw_value: heartRate
      },
      signal_quality: signalQuality,
      battery_level: 92,
      temperature: parseFloat(temperature.toFixed(1)),
      anomaly_detected: anomalyDetected,
      anomaly_type: anomalyType
    };
  };

  useEffect(() => {
    // Generate initial reading
    const initialReading = generateRealisticECGReading();
    setCurrentReading(initialReading);
    setRecentReadings([initialReading]);

    // Set up interval to generate new readings every 3 seconds
    const interval = setInterval(() => {
      const newReading = generateRealisticECGReading();
      setCurrentReading(newReading);
      setRecentReadings(prev => [newReading, ...prev.slice(0, 9)]); // Keep last 10 readings
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return {
    currentReading,
    recentReadings,
    devices,
    isConnected: true,
    loading: false
  };
};
