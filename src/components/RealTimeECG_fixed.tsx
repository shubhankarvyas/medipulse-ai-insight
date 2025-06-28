import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Wifi, WifiOff, Battery, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDemoECGData } from '@/hooks/useDemoECGData';

interface ECGReading {
  id: string;
  timestamp: string;
  heart_rate: number;
  ecg_data: number[] | null;
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

export const RealTimeECG = () => {
  // ALL HOOKS MUST BE AT THE TOP - NO CONDITIONAL HOOKS!
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<ECGDevice[]>([]);
  const [currentReading, setCurrentReading] = useState<ECGReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<ECGReading[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [useDemo, setUseDemo] = useState(false);

  // Get demo data as fallback
  const demoData = useDemoECGData();

  // Get patient ID effect
  useEffect(() => {
    const getPatientId = async () => {
      if (!user || !userProfile) return;
      
      if (userProfile.role === 'patient') {
        const { data, error } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setPatientId(data.id);
        }
      } else {
        setPatientId(null);
      }
    };

    getPatientId();
  }, [user, userProfile]);

  // Fetch devices and readings effect
  useEffect(() => {
    if (!userProfile || !patientId) return;

    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('ecg_devices')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true);

      if (!error) {
        setDevices(data || []);
        setLoading(false);
      }
    };

    const fetchRecentReadings = async () => {
      const { data, error } = await supabase
        .from('ecg_readings')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentReadings(data as ECGReading[]);
        if (data.length > 0) {
          setCurrentReading(data[0] as ECGReading);
          setIsConnected(true);
        }
      }
    };

    fetchDevices();
    fetchRecentReadings();

    // Set up real-time subscription for ECG readings
    const channel = supabase
      .channel('ecg_readings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ecg_readings',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          const newReading = payload.new as ECGReading;
          setCurrentReading(newReading);
          setRecentReadings(prev => [newReading, ...prev.slice(0, 9)]);
          setIsConnected(true);

          // Show alert for anomalies
          if (newReading.anomaly_detected) {
            toast({
              title: 'Anomaly Detected!',
              description: `${newReading.anomaly_type} detected in your ECG reading.`,
              variant: 'destructive'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile, toast, patientId]);

  // Demo mode activation effect
  useEffect(() => {
    if (!loading && devices.length === 0 && !useDemo) {
      const timer = setTimeout(() => {
        setUseDemo(true);
        toast({
          title: 'Demo Mode Activated',
          description: 'No ECG devices found. Showing simulated data for demonstration.',
          variant: 'default'
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [loading, devices.length, useDemo, toast]);

  // Demo mode anomaly notification effect
  useEffect(() => {
    if (useDemo && demoData.currentReading?.anomaly_detected) {
      toast({
        title: 'Demo: Anomaly Detected!',
        description: `${demoData.currentReading.anomaly_type} detected in simulated ECG reading.`,
        variant: 'destructive'
      });
    }
  }, [demoData.currentReading?.anomaly_detected, demoData.currentReading?.anomaly_type, useDemo, toast]);

  // Helper functions
  const getHeartRateStatus = (heartRate: number) => {
    if (heartRate < 60) return { status: 'low', color: 'bg-blue-100 text-blue-700' };
    if (heartRate > 100) return { status: 'high', color: 'bg-red-100 text-red-700' };
    return { status: 'normal', color: 'bg-green-100 text-green-700' };
  };

  // Use demo data if enabled or if no real devices found
  const displayDevices = useDemo ? demoData.devices : devices;
  const displayCurrentReading = useDemo ? demoData.currentReading : currentReading;
  const displayRecentReadings = useDemo ? demoData.recentReadings : recentReadings;
  const displayIsConnected = useDemo ? demoData.isConnected : isConnected;

  if (loading && !useDemo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Loading ECG Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayDevices.length === 0 && !useDemo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            ECG Monitoring
          </CardTitle>
          <CardDescription>No ECG devices found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <WifiOff className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No ECG devices are currently registered to your account.</p>
            <p className="text-sm text-gray-500 mb-4">
              Connect your ESP32 ECG device to start monitoring your heart rhythm.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setUseDemo(true)}
              className="mt-2"
            >
              Try Demo Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              ECG Device Status
              {useDemo && (
                <Badge variant="secondary" className="ml-2">Demo Mode</Badge>
              )}
            </div>
            <Badge variant={displayIsConnected ? "default" : "destructive"}>
              {displayIsConnected ? (
                <><Wifi className="w-3 h-3 mr-1" /> Connected</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" /> Disconnected</>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayDevices.map((device) => (
              <div key={device.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{device.device_name || `Device ${device.device_id}`}</h4>
                  <Badge variant={device.is_active ? "default" : "secondary"}>
                    {device.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Device ID:</span>
                    <span className="font-mono">{device.device_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Battery:</span>
                    <div className="flex items-center">
                      <Battery className="w-3 h-3 mr-1" />
                      <span>{device.battery_level || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Sync:</span>
                    <span>
                      {device.last_sync 
                        ? new Date(device.last_sync).toLocaleTimeString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Reading */}
      {displayCurrentReading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-red-500" />
                Current Heart Rate
                {useDemo && (
                  <Badge variant="outline" className="ml-2">Live Demo</Badge>
                )}
              </div>
              {displayCurrentReading.anomaly_detected && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Anomaly Detected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-600 mb-2">
                  {displayCurrentReading.heart_rate} BPM
                </div>
                <Badge className={getHeartRateStatus(displayCurrentReading.heart_rate).color}>
                  {getHeartRateStatus(displayCurrentReading.heart_rate).status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Signal Quality:</span>
                  <span className="font-medium">{displayCurrentReading.signal_quality}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-medium">{displayCurrentReading.temperature}°F</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Timestamp:</span>
                  <span className="font-medium">
                    {new Date(displayCurrentReading.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {displayCurrentReading.anomaly_detected && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center text-red-700 font-medium mb-1">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Anomaly Detected
                    </div>
                    <p className="text-sm text-red-600">
                      {displayCurrentReading.anomaly_type}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* ECG Waveform Placeholder */}
            <div className="mt-6 h-32 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg flex items-center justify-center border">
              <div className="flex items-center space-x-2">
                <Activity className="w-6 h-6 text-blue-500 animate-pulse" />
                <span className="text-blue-600 font-medium">Live ECG Waveform</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Readings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent ECG Readings</CardTitle>
          <CardDescription>Your heart rate data over the past readings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayRecentReadings.map((reading, index) => (
              <div key={reading.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-600">
                    {new Date(reading.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="font-semibold">{reading.heart_rate} BPM</div>
                  <div className="text-sm text-gray-500">
                    Quality: {reading.signal_quality}%
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {reading.anomaly_detected && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {reading.anomaly_type}
                    </Badge>
                  )}
                  <Badge className={getHeartRateStatus(reading.heart_rate).color}>
                    {getHeartRateStatus(reading.heart_rate).status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          {displayRecentReadings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No ECG readings available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
