import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Activity, TrendingUp, AlertTriangle, Calendar, Download, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RealTimeECG } from "@/components/RealTimeECG";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PatientData {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  phone_number: string | null;
  assigned_doctor_id: string | null;
  created_at: string;
  updated_at: string;
}

export const PatientDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!user || !userProfile || userProfile.role !== 'patient') {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setPatientData(data);
      }
      setLoading(false);
    };

    fetchPatientData();
  }, [user, userProfile]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userProfile || userProfile.role !== 'patient') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">You don't have permission to access the patient dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  // ECG-specific vital signs - in real app, these would come from latest ECG readings
  const ecgMetrics = {
    heartRate: 72,
    rrIntervals: 830, // milliseconds
    qrsDuration: 102, // milliseconds
    stSegment: 0.1, // mV
    hrv: 45, // RMSSD in ms
    temperature: 98.6
  };

  const handleExportReport = async () => {
    try {
      if (!patientData) {
        toast({
          title: "Error",
          description: "Patient data not found",
          variant: "destructive"
        });
        return;
      }

      // Fetch patient's MRI scans and ECG data
      const { data: mriScans } = await supabase
        .from('mri_scans')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('created_at', { ascending: false });

      // Fetch ECG readings
      const { data: ecgReadings } = await supabase
        .from('ecg_readings')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Create a comprehensive report
      const reportData = {
        patient: {
          name: userProfile?.full_name || 'Unknown',
          email: userProfile?.email || 'Unknown',
          dateOfBirth: patientData.date_of_birth,
          gender: patientData.gender,
          phoneNumber: patientData.phone_number
        },
        reportGenerated: new Date().toISOString(),
        ecgMetrics: ecgMetrics,
        recentECGReadings: ecgReadings?.slice(0, 5) || [],
        mriScans: mriScans || [],
        summary: {
          totalMRIScans: mriScans?.length || 0,
          totalECGReadings: ecgReadings?.length || 0,
          latestHeartRate: ecgMetrics.heartRate,
          healthStatus: "Stable"
        }
      };

      // Convert to JSON and create downloadable file
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `patient-report-${userProfile?.full_name?.replace(/\s+/g, '-') || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast({
        title: "Report Exported",
        description: "Your medical report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleScheduleAppointment = () => {
    navigate('/book-appointment');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {userProfile.full_name || 'Patient'}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleScheduleAppointment}>
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-teal-600 to-blue-600" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2 text-teal-600" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Full Name</p>
              <p className="font-medium">{userProfile.full_name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="font-medium">
                {patientData?.date_of_birth 
                  ? new Date(patientData.date_of_birth).toLocaleDateString()
                  : 'Not provided'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="font-medium capitalize">{patientData?.gender || 'Not provided'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ECG Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Heart Rate</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{ecgMetrics.heartRate} BPM</div>
            <p className="text-xs text-red-600 mt-1">Normal range</p>
            <div className="mt-3">
              <Progress value={75} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">RR Intervals</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{ecgMetrics.rrIntervals} ms</div>
            <p className="text-xs text-blue-600 mt-1">Average</p>
            <div className="mt-3">
              <Progress value={65} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Temperature</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{ecgMetrics.temperature}°F</div>
            <p className="text-xs text-green-600 mt-1">Normal</p>
            <div className="mt-3">
              <Progress value={80} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">QRS Duration</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{ecgMetrics.qrsDuration} ms</div>
            <p className="text-xs text-purple-600 mt-1">Normal</p>
            <div className="mt-3">
              <Progress value={70} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">HRV (RMSSD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{ecgMetrics.hrv} ms</div>
            <p className="text-xs text-orange-600 mt-1">Good</p>
            <div className="mt-3">
              <Progress value={85} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">ST Segment</CardTitle>
            <Activity className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{ecgMetrics.stSegment} mV</div>
            <p className="text-xs text-teal-600 mt-1">Elevated trend</p>
            <div className="mt-3">
              <Progress value={60} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time ECG Component */}
      <RealTimeECG />

      {/* Health Insights */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-800">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Health Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-white rounded-lg border border-green-200">
            <p className="font-medium text-green-800">ECG Monitoring Active</p>
            <p className="text-sm text-green-600 mt-1">
              Your ECG device is connected and monitoring your heart rhythm in real-time.
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <p className="font-medium text-blue-800">AI Analysis Ready</p>
            <p className="text-sm text-blue-600 mt-1">
              Upload your MRI scans for AI-powered analysis and diagnosis assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
