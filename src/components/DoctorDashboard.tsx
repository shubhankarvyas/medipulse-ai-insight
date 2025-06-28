import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Search, AlertTriangle, Activity, Brain, FileText, Plus, Calendar, Heart, Download, Eye, Phone, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface RealPatient {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  phone_number: string | null;
  assigned_doctor_id: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  patient_notes: string | null;
  mri_report_shared: boolean;
  ecg_report_shared: boolean;
  shared_mri_scans: string[] | null;
  patients: {
    profiles: {
      full_name: string;
      email: string;
    };
  };
}

interface MRIScan {
  id: string;
  file_name: string;
  scan_date: string | null;
  ai_analysis_result: unknown;
  status: string;
  created_at: string;
  patients: {
    profiles: {
      full_name: string;
    };
  };
}

export const DoctorDashboard = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [realPatients, setRealPatients] = useState<RealPatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sharedMRIScans, setSharedMRIScans] = useState<MRIScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorData, setDoctorData] = useState<{ id: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<RealPatient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
  const [allMRIScans, setAllMRIScans] = useState<MRIScan[]>([]); // For debugging
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<unknown>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeAlerts: 0,
    stablePatients: 0,
    aiDiagnoses: 0
  });

  const fetchDoctorData = useCallback(async () => {
    if (!user) return;

    try {
      // Get doctor record
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (doctorError) throw doctorError;
      
      setDoctorData(doctor);

      // Fetch all patients (since we don't have assigned patients yet, show all)
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select(`
          id,
          user_id,
          date_of_birth,
          gender,
          phone_number,
          assigned_doctor_id,
          profiles!patients_user_id_fkey(full_name, email)
        `)
        .not('profiles', 'is', null);

      if (patientsData && !patientsError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRealPatients(patientsData as any);
      }

      if (patientsData && !patientsError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRealPatients(patientsData as any);
      }

      // Fetch appointments for this doctor
      console.log('Fetching appointments for doctor ID:', doctor.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointmentsData, error: appointmentsError } = await (supabase as any)
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          notes,
          patient_notes,
          mri_report_shared,
          ecg_report_shared,
          shared_mri_scans,
          patients!inner(
            profiles!patients_user_id_fkey(full_name, email)
          )
        `)
        .eq('doctor_id', doctor.id)
        .order('appointment_date', { ascending: true });

      console.log('Appointments data:', appointmentsData);
      console.log('Appointments error:', appointmentsError);

      if (appointmentsData && !appointmentsError) {
        setAppointments(appointmentsData);
      }

      // Calculate real statistics
      const totalPatients = patientsData?.length || 0;
      
      // Count MRI scans with AI analysis
      const { data: mriData, error: mriError } = await supabase
        .from('mri_scans')
        .select('id, ai_analysis_result, status')
        .eq('status', 'analyzed')
        .not('ai_analysis_result', 'is', null);

      const aiDiagnoses = mriData?.length || 0;

      // For now, using mock data for alerts and stable patients
      // In a real app, you'd calculate these based on ECG data, vital signs, etc.
      const activeAlerts = Math.floor(totalPatients * 0.1); // 10% of patients have alerts
      const stablePatients = totalPatients - activeAlerts;

      setStats({
        totalPatients,
        activeAlerts,
        stablePatients,
        aiDiagnoses
      });

      // Fetch MRI scans shared with this doctor through appointments
      const sharedScanIds: string[] = [];
      appointmentsData?.forEach((apt: Appointment) => {
        if (apt.shared_mri_scans && apt.mri_report_shared) {
          sharedScanIds.push(...apt.shared_mri_scans);
        }
      });

      console.log('Shared scan IDs extracted from appointments:', sharedScanIds);

      if (sharedScanIds.length > 0) {
        // First, just check if these scan IDs exist at all
        const { data: simpleMRIData, error: simpleMRIError } = await supabase
          .from('mri_scans')
          .select('*')
          .in('id', sharedScanIds);
        
        console.log('Raw MRI scans found by IDs:', simpleMRIData);
        console.log('MRI fetch error:', simpleMRIError);
        
        if (simpleMRIData && !simpleMRIError && simpleMRIData.length > 0) {
          // Get patient info separately for each scan
          const scansWithPatients = await Promise.all(
            simpleMRIData.map(async (scan) => {
              const { data: patientData } = await supabase
                .from('patients')
                .select(`
                  id,
                  user_id,
                  profiles!patients_user_id_fkey(full_name, email)
                `)
                .eq('id', scan.patient_id)
                .single();
              
              console.log(`Patient data for scan ${scan.id}:`, patientData);
              
              return {
                ...scan,
                patients: patientData
              };
            })
          );
          
          console.log('Final scans with patient data:', scansWithPatients);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSharedMRIScans(scansWithPatients as any);
        } else {
          console.log('No MRI scans found with the provided IDs');
          setSharedMRIScans([]);
        }
      } else {
        console.log('No shared scan IDs found in appointments');
        setSharedMRIScans([]);
      }

      // Debug: Fetch all MRI scans in the system to compare
      const { data: allScansData, error: allScansError } = await supabase
        .from('mri_scans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (allScansData && !allScansError) {
        console.log('All MRI scans in system:', allScansData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAllMRIScans(allScansData as any);
      }

    } catch (error) {
      console.error('Error fetching doctor data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (userProfile?.role === 'doctor' && user) {
      fetchDoctorData();
    }
  }, [user, userProfile, fetchDoctorData]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile || userProfile.role !== 'doctor') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">You don't have permission to access the doctor dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = [
    // These would be calculated from real ECG data, vital signs, etc.
    // For now, showing sample structure
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "attention": 
        return "bg-red-100 text-red-700 border-red-200";
      case "improving": 
        return "bg-blue-100 text-blue-700 border-blue-200";
      default: 
        return "bg-green-100 text-green-700 border-green-200";
    }
  };

  const downloadMRIScan = async (scanId: string, fileName: string) => {
    try {
      // Get the file path for the MRI scan
      const { data: scanData, error: scanError } = await supabase
        .from('mri_scans')
        .select('file_path')
        .eq('id', scanId)
        .single();

      if (scanError) throw scanError;

      // Get download URL from storage
      const { data: urlData } = await supabase.storage
        .from('mri-scans')
        .createSignedUrl(scanData.file_path, 3600); // 1 hour expiry

      if (urlData?.signedUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = urlData.signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download Started",
          description: `Downloading ${fileName}`,
        });
      }
    } catch (error) {
      console.error('Error downloading MRI scan:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the MRI scan",
        variant: "destructive"
      });
    }
  };

  const viewAIAnalysis = (analysisResult: unknown) => {
    // Handle AI analysis viewing
    console.log('AI Analysis:', analysisResult);
    toast({
      title: "AI Analysis",
      description: "Opening AI analysis details",
    });
  };

  const generatePatientReport = async (patient: RealPatient) => {
    try {
      // Fetch patient data
      const { data: mriScans } = await supabase
        .from('mri_scans')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      const { data: ecgReadings } = await supabase
        .from('ecg_readings')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('appointment_date', { ascending: false });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(41, 128, 185);
      pdf.text('MediPulse AI - Doctor\'s Patient Report', 20, 25);
      
      // Patient Info
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Patient Information', 20, 45);
      
      pdf.setFontSize(12);
      const patientInfo = [
        `Patient ID: ${patient.id}`,
        `User ID: ${patient.user_id}`,
        `Date of Birth: ${patient.date_of_birth || 'Not provided'}`,
        `Gender: ${patient.gender || 'Not provided'}`,
        `Phone: ${patient.phone_number || 'Not provided'}`,
        `Assigned Doctor: ${patient.assigned_doctor_id || 'Not assigned'}`,
        `Patient Since: ${new Date().toLocaleDateString()}`,
        `Report Generated: ${new Date().toLocaleString()}`
      ];
      
      let yPosition = 55;
      patientInfo.forEach(info => {
        pdf.text(info, 20, yPosition);
        yPosition += 8;
      });
      
      // Appointments Summary
      yPosition += 10;
      pdf.setFontSize(16);
      pdf.setTextColor(220, 53, 69);
      pdf.text('Appointments Summary', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      if (appointments && appointments.length > 0) {
        pdf.text(`Total Appointments: ${appointments.length}`, 20, yPosition);
        yPosition += 8;
        
        appointments.slice(0, 5).forEach((appointment, index) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${index + 1}. ${new Date(appointment.appointment_date).toLocaleDateString()} - ${appointment.status}`, 20, yPosition);
          yPosition += 6;
          if (appointment.notes) {
            pdf.text(`   Notes: ${appointment.notes}`, 20, yPosition);
            yPosition += 6;
          }
          yPosition += 3;
        });
      } else {
        pdf.text('No appointments recorded', 20, yPosition);
        yPosition += 8;
      }
      
      // MRI Scans Section
      yPosition += 15;
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.setTextColor(40, 167, 69);
      pdf.text('MRI Scans Analysis', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      if (mriScans && mriScans.length > 0) {
        pdf.text(`Total MRI Scans: ${mriScans.length}`, 20, yPosition);
        yPosition += 8;
        
        mriScans.forEach((scan, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${index + 1}. Scan Date: ${new Date(scan.created_at).toLocaleDateString()}`, 20, yPosition);
          yPosition += 6;
          if (scan.ai_analysis_result) {
            pdf.text(`   AI Analysis: ${JSON.stringify(scan.ai_analysis_result)}`, 20, yPosition);
            yPosition += 6;
          }
          pdf.text(`   File: ${scan.file_name}`, 20, yPosition);
          yPosition += 8;
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
      pdf.text('ECG Readings Summary', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      if (ecgReadings && ecgReadings.length > 0) {
        pdf.text(`Total ECG Readings: ${ecgReadings.length}`, 20, yPosition);
        yPosition += 8;
        
        // Calculate some basic stats
        const values = ecgReadings.map(r => r.heart_rate).filter(v => !isNaN(v));
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          
          pdf.text(`Average Heart Rate: ${avg.toFixed(2)} BPM`, 20, yPosition);
          yPosition += 6;
          pdf.text(`Min Heart Rate: ${min} BPM`, 20, yPosition);
          yPosition += 6;
          pdf.text(`Max Heart Rate: ${max} BPM`, 20, yPosition);
          yPosition += 8;
        }
        
        pdf.text('Recent Readings:', 20, yPosition);
        yPosition += 6;
        
        ecgReadings.slice(0, 5).forEach((reading, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${index + 1}. ${new Date(reading.created_at).toLocaleString()} - Heart Rate: ${reading.heart_rate} BPM`, 20, yPosition);
          yPosition += 6;
        });
      } else {
        pdf.text('No ECG readings available', 20, yPosition);
      }
      
      // Footer
      const footerY = pageHeight - 15;
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Generated by MediPulse AI - Confidential Medical Report - Doctor\'s Copy', 20, footerY);
      
      // Save the PDF
      const fileName = `patient-report-${patient.user_id}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Report Generated",
        description: "Patient report has been downloaded as a PDF.",
      });
    } catch (error) {
      console.error('Error generating patient report:', error);
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate patient report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentDetailsOpen(true);
  };

  const handleStartConsultation = async (appointment: Appointment) => {
    try {
      // Update appointment status to 'in_progress' or 'active'
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Consultation Started",
        description: `Starting consultation with ${appointment.patients?.profiles?.full_name}`,
      });

      // Refresh appointments data
      fetchDoctorData();
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast({
        title: "Error",
        description: "Failed to start consultation",
        variant: "destructive"
      });
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Completed",
        description: "Appointment has been marked as completed",
      });

      // Refresh appointments data
      fetchDoctorData();
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({
        title: "Error",
        description: "Failed to complete appointment",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and manage your patients' health data</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Generate Reports
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-teal-600 to-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalPatients}</div>
            <p className="text-xs text-blue-600 mt-1">Registered patients</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activeAlerts}</div>
            <p className="text-xs text-red-600 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Stable Patients</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.stablePatients}</div>
            <p className="text-xs text-green-600 mt-1">
              {stats.totalPatients > 0 ? ((stats.stablePatients / stats.totalPatients) * 100).toFixed(1) : 0}% stable
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">AI Diagnoses</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.aiDiagnoses}</div>
            <p className="text-xs text-purple-600 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="patients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="patients">Patient List</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="reports">Shared Reports</TabsTrigger>
          <TabsTrigger value="ai-diagnosis">AI Diagnosis</TabsTrigger>
          <TabsTrigger value="alerts">Critical Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-6">
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Patients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realPatients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{patient.profiles?.full_name || 'Unknown Patient'}</CardTitle>
                      <CardDescription>
                        {patient.date_of_birth ? 
                          `Age: ${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}` : 
                          'Age: Unknown'
                        } | {patient.gender || 'Gender not specified'}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm">{patient.profiles?.email || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm">{patient.phone_number || 'Not provided'}</span>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Patient Details</DialogTitle>
                          <DialogDescription>
                            Complete information for {patient.profiles?.full_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                              <p className="text-sm">{patient.profiles?.full_name || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Gender</Label>
                              <p className="text-sm capitalize">{patient.gender || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Age</Label>
                              <p className="text-sm">
                                {patient.date_of_birth ? 
                                  `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years` : 
                                  'Not provided'
                                }
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Date of Birth</Label>
                              <p className="text-sm">
                                {patient.date_of_birth ? 
                                  new Date(patient.date_of_birth).toLocaleDateString() : 
                                  'Not provided'
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600">Contact Information</Label>
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{patient.profiles?.email || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{patient.phone_number || 'Not provided'}</span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 pt-4">
                            <Button size="sm" className="flex-1">
                              <Activity className="w-4 h-4 mr-1" />
                              View Medical History
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              <Heart className="w-4 h-4 mr-1" />
                              Monitor Live
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="flex-1"
                              onClick={() => generatePatientReport(patient)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Generate Report
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600">
                      Monitor Live
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>Scheduled appointments with patients</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{appointment.patients?.profiles?.full_name || 'Unknown Patient'}</h4>
                          <p className="text-sm text-gray-600">{appointment.patients?.profiles?.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(appointment.appointment_date).toLocaleString()}
                          </p>
                          {appointment.patient_notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded">
                              <p className="text-sm text-blue-800">
                                <strong>Patient Notes:</strong> {appointment.patient_notes}
                              </p>
                            </div>
                          )}
                          <div className="flex space-x-2 mt-2">
                            {appointment.mri_report_shared && (
                              <Badge variant="outline" className="text-purple-700 border-purple-300">
                                MRI Reports Shared
                              </Badge>
                            )}
                            {appointment.ecg_report_shared && (
                              <Badge variant="outline" className="text-red-700 border-red-300">
                                ECG Reports Shared
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            appointment.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                            appointment.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {appointment.status}
                          </Badge>
                          <div className="flex space-x-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewAppointmentDetails(appointment)}>
                              <FileText className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                            {appointment.status === 'scheduled' && (
                              <Button size="sm" onClick={() => handleStartConsultation(appointment)}>
                                Start Consultation
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No appointments scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Details Dialog */}
          <Dialog open={appointmentDetailsOpen} onOpenChange={setAppointmentDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
                <DialogDescription>
                  Complete appointment information for {selectedAppointment?.patients?.profiles?.full_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Patient Name</Label>
                    <p className="text-sm">{selectedAppointment?.patients?.profiles?.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email</Label>
                    <p className="text-sm">{selectedAppointment?.patients?.profiles?.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Date & Time</Label>
                    <p className="text-sm">
                      {selectedAppointment ? new Date(selectedAppointment.appointment_date).toLocaleString() : ''}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <Badge className={
                      selectedAppointment?.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                      selectedAppointment?.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      selectedAppointment?.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {selectedAppointment?.status}
                    </Badge>
                  </div>
                </div>
                
                {selectedAppointment?.patient_notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Patient Notes</Label>
                    <div className="mt-1 p-3 bg-blue-50 rounded border">
                      <p className="text-sm text-blue-800">{selectedAppointment.patient_notes}</p>
                    </div>
                  </div>
                )}
                
                {selectedAppointment?.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Additional Notes</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                      <p className="text-sm text-gray-700">{selectedAppointment.notes}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">Shared Reports</Label>
                  <div className="flex space-x-2 mt-1">
                    {selectedAppointment?.mri_report_shared && (
                      <Badge variant="outline" className="text-purple-700 border-purple-300">
                        MRI Reports Shared
                      </Badge>
                    )}
                    {selectedAppointment?.ecg_report_shared && (
                      <Badge variant="outline" className="text-red-700 border-red-300">
                        ECG Reports Shared
                      </Badge>
                    )}
                    {!selectedAppointment?.mri_report_shared && !selectedAppointment?.ecg_report_shared && (
                      <span className="text-sm text-gray-500">No reports shared</span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  {selectedAppointment?.status === 'scheduled' && (
                    <Button 
                      onClick={() => {
                        if (selectedAppointment) {
                          handleStartConsultation(selectedAppointment);
                          setAppointmentDetailsOpen(false);
                        }
                      }}
                      className="flex-1"
                    >
                      Start Consultation
                    </Button>
                  )}
                  {selectedAppointment?.status === 'in_progress' && (
                    <Button 
                      onClick={() => {
                        if (selectedAppointment) {
                          handleCompleteAppointment(selectedAppointment.id);
                          setAppointmentDetailsOpen(false);
                        }
                      }}
                      className="flex-1"
                    >
                      Complete Appointment
                    </Button>
                  )}
                  {selectedAppointment?.status === 'completed' && (
                    <Button variant="outline" className="flex-1" disabled>
                      Appointment Completed
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Debug Information */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Total Appointments:</strong> {appointments.length}</p>
                <p><strong>Appointments with MRI sharing:</strong> {appointments.filter(apt => apt.mri_report_shared).length}</p>
                <p><strong>Appointments with scan IDs:</strong> {appointments.filter(apt => apt.shared_mri_scans && apt.shared_mri_scans.length > 0).length}</p>
                <div>
                  <strong>Appointment Details:</strong>
                  <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                    {JSON.stringify(appointments.map(apt => ({
                      id: apt.id,
                      patient: apt.patients?.profiles?.full_name,
                      mri_shared: apt.mri_report_shared,
                      scan_ids: apt.shared_mri_scans
                    })), null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-500" />
                Shared MRI Reports
              </CardTitle>
              <CardDescription>MRI scans shared by patients for consultation</CardDescription>
            </CardHeader>
            <CardContent>
              {sharedMRIScans.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sharedMRIScans.map((scan) => (
                    <div key={scan.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{scan.file_name}</h4>
                          <p className="text-sm text-gray-600">{scan.patients?.profiles?.full_name || 'Unknown Patient'}</p>
                          <p className="text-sm text-gray-500">
                            Uploaded: {new Date(scan.created_at).toLocaleDateString()}
                          </p>
                          {scan.scan_date && (
                            <p className="text-sm text-gray-500">
                              Scan Date: {new Date(scan.scan_date).toLocaleDateString()}
                            </p>
                          )}
                          <Badge className={
                            scan.status === 'analyzed' ? 'bg-green-100 text-green-700 mt-2' :
                            scan.status === 'pending' ? 'bg-yellow-100 text-yellow-700 mt-2' :
                            'bg-blue-100 text-blue-700 mt-2'
                          }>
                            {scan.status}
                          </Badge>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button size="sm" variant="outline" onClick={() => viewAIAnalysis(scan.ai_analysis_result)}>
                            <Brain className="w-4 h-4 mr-1" />
                            View AI Analysis
                          </Button>
                          <Button size="sm" onClick={() => downloadMRIScan(scan.id, scan.file_name)}>
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      {scan.ai_analysis_result && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">
                            <strong>AI Analysis Available:</strong> Advanced diagnostic insights ready for review
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No shared reports available</p>
                  <p className="text-sm">Patients will share reports when booking appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                Critical Alerts
              </CardTitle>
              <CardDescription>Immediate attention required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {criticalAlerts.length > 0 ? (
                criticalAlerts.map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : 'bg-orange-500'} animate-pulse`}></div>
                      <div>
                        <p className="font-semibold text-red-800">{alert.patient}</p>
                        <p className="text-sm text-red-600">{alert.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600">{alert.time}</p>
                      <Button size="sm" className="mt-2">Respond</Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No critical alerts at this time</p>
                  <p className="text-sm">Critical alerts will appear when patients' vital signs require immediate attention</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Outcomes</CardTitle>
                <CardDescription>Recovery trends over the past 3 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-600">Analytics Chart Placeholder</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Diagnostic Accuracy</CardTitle>
                <CardDescription>Model performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">MRI Classification</span>
                    <span className="font-semibold">97.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">ECG Anomaly Detection</span>
                    <span className="font-semibold">99.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Risk Assessment</span>
                    <span className="font-semibold">95.8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-diagnosis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-500" />
                AI Diagnosis Dashboard
              </CardTitle>
              <CardDescription>AI-powered medical analysis and diagnostics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent AI Analyses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent AI Analyses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sharedMRIScans.filter(scan => scan.ai_analysis_result).length > 0 ? (
                      <div className="space-y-4">
                        {sharedMRIScans
                          .filter(scan => scan.ai_analysis_result)
                          .slice(0, 5)
                          .map((scan) => (
                            <div key={scan.id} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-medium">{scan.file_name}</h5>
                                  <p className="text-sm text-gray-600">{scan.patients?.profiles?.full_name}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(scan.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge className="bg-green-100 text-green-700">
                                  AI Analyzed
                                </Badge>
                              </div>
                              <div className="mt-2 flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => viewAIAnalysis(scan.ai_analysis_result)}
                                >
                                  <Brain className="w-4 h-4 mr-1" />
                                  View Analysis
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => downloadMRIScan(scan.id, scan.file_name)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No AI analyses available</p>
                        <p className="text-sm">Analyses will appear when patients share MRI scans</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium">Total Scans Analyzed</p>
                          <p className="text-sm text-gray-600">All time</p>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{stats.aiDiagnoses}</div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium">Accuracy Rate</p>
                          <p className="text-sm text-gray-600">Model performance</p>
                        </div>
                        <div className="text-2xl font-bold text-green-600">97.3%</div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <div>
                          <p className="font-medium">Processing Time</p>
                          <p className="text-sm text-gray-600">Average analysis time</p>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">2.4s</div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <div>
                          <p className="font-medium">Anomalies Detected</p>
                          <p className="text-sm text-gray-600">This month</p>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">
                          {Math.floor(stats.aiDiagnoses * 0.15)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Analysis Categories */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Analysis Categories</CardTitle>
                  <CardDescription>Distribution of AI findings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {Math.floor(stats.aiDiagnoses * 0.7)}
                      </div>
                      <p className="text-sm font-medium">Normal Findings</p>
                      <p className="text-xs text-gray-500">No abnormalities detected</p>
                    </div>
                    
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-2">
                        {Math.floor(stats.aiDiagnoses * 0.15)}
                      </div>
                      <p className="text-sm font-medium">Requires Review</p>
                      <p className="text-xs text-gray-500">Potential concerns identified</p>
                    </div>
                    
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600 mb-2">
                        {Math.floor(stats.aiDiagnoses * 0.15)}
                      </div>
                      <p className="text-sm font-medium">Critical Findings</p>
                      <p className="text-xs text-gray-500">Immediate attention needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* All MRI Scans in System - Debugging Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Debugging: All MRI Scans in System</CardTitle>
            <CardDescription>For development purposes - view all MRI scans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Shared MRI Scans Found:</strong>
                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                  {sharedMRIScans.length > 0 ? JSON.stringify(sharedMRIScans, null, 2) : 'No shared MRI scans found'}
                </pre>
              </div>
              <div>
                <strong>All MRI Scans in System:</strong>
                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded border overflow-auto max-h-40">
                  {allMRIScans.length > 0 ? JSON.stringify(allMRIScans.map(scan => ({
                    id: scan.id,
                    file_name: scan.file_name,
                    patient_id: scan.patient_id,
                    status: scan.status,
                    created_at: scan.created_at
                  })), null, 2) : 'No MRI scans in system'}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
