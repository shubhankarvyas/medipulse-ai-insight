import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Activity, TrendingUp, AlertTriangle, Calendar, Download, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLatestECGData } from "@/hooks/useLatestECGData";
import { RealTimeECG } from "@/components/RealTimeECG";
import { DebugAuth } from "@/components/DebugAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  
  // Get real-time ECG data
  const { latestReading, loading: ecgLoading } = useLatestECGData(patientData?.id || null);

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

  // ECG metrics from real data or shared demo data
  const ecgMetrics = {
    heartRate: latestReading?.heart_rate || 0,
    bloodPressure: {
      systolic: 120,
      diastolic: 80
    },
    oxygenSaturation: 98,
    rrIntervals: latestReading?.ecg_data?.rr_interval || 0, // milliseconds
    qrsDuration: latestReading?.ecg_data?.qrs_duration || 0, // milliseconds
    stSegment: latestReading?.ecg_data?.st_segment || 0, // mV
    hrv: latestReading?.ecg_data?.heart_rate_variability || 0, // RMSSD in ms
    temperature: latestReading?.temperature || 0,
    signalQuality: latestReading?.signal_quality || 0,
    batteryLevel: latestReading?.battery_level || 0,
    anomalyDetected: latestReading?.anomaly_detected || false,
    anomalyType: latestReading?.anomaly_type || null,
    lastUpdate: latestReading?.timestamp || null
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

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(41, 128, 185);
      pdf.text('MediPulse AI - Medical Report', 20, 25);
      
      // Patient Info
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Patient Information', 20, 45);
      
      pdf.setFontSize(12);
      const patientInfo = [
        `Name: ${userProfile?.full_name || 'Unknown'}`,
        `Email: ${userProfile?.email || 'Unknown'}`,
        `Date of Birth: ${patientData.date_of_birth || 'Not provided'}`,
        `Gender: ${patientData.gender || 'Not provided'}`,
        `Phone: ${patientData.phone_number || 'Not provided'}`,
        `Report Generated: ${new Date().toLocaleString()}`
      ];
      
      let yPosition = 55;
      patientInfo.forEach(info => {
        pdf.text(info, 20, yPosition);
        yPosition += 8;
      });
      
      // ECG Metrics Section
      yPosition += 10;
      pdf.setFontSize(16);
      pdf.setTextColor(220, 53, 69);
      pdf.text('ECG Metrics', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const ecgInfo = [
        `Heart Rate: ${ecgMetrics.heartRate} BPM`,
        `Blood Pressure: ${ecgMetrics.bloodPressure?.systolic || 'N/A'}/${ecgMetrics.bloodPressure?.diastolic || 'N/A'} mmHg`,
        `SpO2: ${ecgMetrics.oxygenSaturation || 'N/A'}%`,
        `Heart Rate Variability: ${ecgMetrics.hrv} ms`,
        `Temperature: ${ecgMetrics.temperature}°F`
      ];
      
      ecgInfo.forEach(info => {
        pdf.text(info, 20, yPosition);
        yPosition += 8;
      });
      
      // Fetch and add recent data
      const { data: mriScans } = await supabase
        .from('mri_scans')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: ecgReadings } = await supabase
        .from('ecg_readings')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // MRI Scans Section
      yPosition += 15;
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.setTextColor(40, 167, 69);
      pdf.text('Recent MRI Scans', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      if (mriScans && mriScans.length > 0) {
        mriScans.forEach((scan, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${index + 1}. Scan Date: ${new Date(scan.created_at).toLocaleDateString()}`, 20, yPosition);
          yPosition += 6;
          if (scan.ai_analysis_result) {
            pdf.text(`   Analysis: ${JSON.stringify(scan.ai_analysis_result)}`, 20, yPosition);
            yPosition += 6;
          }
          yPosition += 3;
        });
      } else {
        pdf.text('No MRI scans available', 20, yPosition);
        yPosition += 8;
      }
      
      // ECG Readings Section
      yPosition += 10;
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.setTextColor(255, 193, 7);
      pdf.text('Recent ECG Readings', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      if (ecgReadings && ecgReadings.length > 0) {
        ecgReadings.forEach((reading, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${index + 1}. ${new Date(reading.created_at).toLocaleString()} - Heart Rate: ${reading.heart_rate} BPM`, 20, yPosition);
          yPosition += 8;
        });
      } else {
        pdf.text('No ECG readings available', 20, yPosition);
      }
      
      // Footer
      const footerY = pageHeight - 15;
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Generated by MediPulse AI - Confidential Medical Report', 20, footerY);
      
      // Save the PDF
      const fileName = `medical-report-${userProfile?.full_name?.replace(/\s+/g, '-') || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Report Exported",
        description: "Your medical report has been downloaded as a PDF.",
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
      {(ecgLoading || ecgMetrics.heartRate === 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Heart Rate</CardTitle>
            <div className="flex items-center space-x-1">
              {!ecgLoading && latestReading && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live data" />
              )}
              <Heart className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{ecgMetrics.heartRate} BPM</div>
            <p className="text-xs text-red-600 mt-1">
              {ecgMetrics.anomalyDetected ? ecgMetrics.anomalyType : 'Normal range'}
            </p>
            <div className="mt-3">
              <Progress value={Math.min(100, (ecgMetrics.heartRate / 120) * 100)} className="h-2" />
            </div>
            {latestReading && (
              <p className="text-xs text-gray-500 mt-1">
                Updated: {new Date(latestReading.timestamp).toLocaleTimeString()}
              </p>
            )}
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
            <div className="flex items-center space-x-1">
              {!ecgLoading && latestReading && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live data" />
              )}
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{ecgMetrics.temperature.toFixed(2)}°F</div>
            <p className="text-xs text-green-600 mt-1">Normal</p>
            <div className="mt-3">
              <Progress value={Math.min(100, ((ecgMetrics.temperature - 95) / 10) * 100)} className="h-2" />
            </div>
            {latestReading && (
              <p className="text-xs text-gray-500 mt-1">
                Signal: {ecgMetrics.signalQuality}%
              </p>
            )}
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
            <div className="text-2xl font-bold text-orange-600">{ecgMetrics.hrv.toFixed(2)} ms</div>
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
            <div className="text-2xl font-bold text-teal-600">{ecgMetrics.stSegment.toFixed(2)} mV</div>
            <p className="text-xs text-teal-600 mt-1">Elevated trend</p>
            <div className="mt-3">
              <Progress value={60} className="h-2" />
            </div>
          </CardContent>
        </Card>
        </div>
      )}

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
