import { useState, useEffect } from 'react';

interface ECGReading {
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

interface ECGDevice {
  id: string;
  device_id: string;
  device_name: string;
  is_active: boolean;
  last_sync: string;
  battery_level: number;
}

// Shared demo data state
let sharedDemoData = {
  currentReading: null as ECGReading | null,
  devices: [] as ECGDevice[],
  recentReadings: [] as ECGReading[],
  isConnected: true,
};

let sharedGeneratorInterval: NodeJS.Timeout | null = null;
let subscribers: Array<() => void> = [];

const generateRealisticECGData = (): ECGReading => {
  const now = new Date();
  
  // Generate heart rate with some variation (60-85 BPM with occasional spikes)
  const baseHR = 70;
  const variation = Math.random() * 20 - 10; // -10 to +10
  const spike = Math.random() < 0.05 ? (Math.random() < 0.5 ? -15 : 25) : 0; // 5% chance of spike
  const heartRate = Math.max(45, Math.min(120, Math.round(baseHR + variation + spike)));
  
  // Calculate RR interval from heart rate
  const rrInterval = Math.round(60000 / heartRate);
  
  // Generate other realistic ECG parameters
  const qrsDuration = Math.round(80 + Math.random() * 40); // 80-120ms
  const hrv = Math.round(25 + Math.random() * 45); // 25-70ms
  const stSegment = parseFloat((Math.random() * 0.3).toFixed(2)); // 0-0.3mV
  
  // Generate temperature (98.0-99.5°F)
  const temperature = parseFloat((98.0 + Math.random() * 1.5).toFixed(2));
  
  // Signal quality (85-100%)
  const signalQuality = Math.round(85 + Math.random() * 15);
  
  // Battery level (slowly decreasing)
  const batteryLevel = Math.max(85, 92 - Math.floor(Math.random() * 7));
  
  // Detect anomalies
  let anomalyDetected = false;
  let anomalyType = null;
  
  if (heartRate < 55) {
    anomalyDetected = true;
    anomalyType = 'Bradycardia';
  } else if (heartRate > 110) {
    anomalyDetected = true;
    anomalyType = 'Tachycardia';
  } else if (stSegment > 0.15) {
    anomalyDetected = true;
    anomalyType = 'ST Segment Elevation';
  }
  
  return {
    id: `demo-${Date.now()}-${Math.random()}`,
    timestamp: now.toISOString(),
    heart_rate: heartRate,
    ecg_data: {
      heart_rate: heartRate,
      rr_interval: rrInterval,
      qrs_duration: qrsDuration,
      heart_rate_variability: hrv,
      st_segment: stSegment,
      raw_value: heartRate,
    },
    signal_quality: signalQuality,
    battery_level: batteryLevel,
    temperature: temperature,
    anomaly_detected: anomalyDetected,
    anomaly_type: anomalyType,
  };
};

const generateDemoDevices = (): ECGDevice[] => [
  {
    id: 'demo-device-1',
    device_id: 'ESP32-DEMO-001',
    device_name: 'ESP32 ECG Monitor (Demo)',
    is_active: true,
    last_sync: new Date().toISOString(),
    battery_level: 92,
  }
];

const startSharedGenerator = () => {
  if (sharedGeneratorInterval) return;
  
  // Initialize data
  sharedDemoData.devices = generateDemoDevices();
  sharedDemoData.currentReading = generateRealisticECGData();
  sharedDemoData.recentReadings = [sharedDemoData.currentReading];
  sharedDemoData.isConnected = true;
  
  // Update every 5 seconds
  sharedGeneratorInterval = setInterval(() => {
    const newReading = generateRealisticECGData();
    sharedDemoData.currentReading = newReading;
    sharedDemoData.recentReadings = [newReading, ...sharedDemoData.recentReadings.slice(0, 9)];
    sharedDemoData.devices[0].last_sync = new Date().toISOString();
    
    // Notify all subscribers
    subscribers.forEach(callback => callback());
  }, 5000);
};

const stopSharedGenerator = () => {
  if (sharedGeneratorInterval) {
    clearInterval(sharedGeneratorInterval);
    sharedGeneratorInterval = null;
  }
};

export const useSharedDemoECGData = () => {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // Add this component as a subscriber
    const updateCallback = () => forceUpdate({});
    subscribers.push(updateCallback);
    
    // Start the generator if not already running
    startSharedGenerator();
    
    return () => {
      // Remove this subscriber
      subscribers = subscribers.filter(cb => cb !== updateCallback);
      
      // Stop generator if no more subscribers
      if (subscribers.length === 0) {
        stopSharedGenerator();
      }
    };
  }, []);
  
  return sharedDemoData;
};
