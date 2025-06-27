import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, AlertTriangle, Activity, Brain, FileText, Plus, Calendar, Heart, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
          profiles(full_name, email)
        `)
        .not('profiles', 'is', null);

      if (patientsData && !patientsError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRealPatients(patientsData as any);
      }

      // Fetch appointments for this doctor
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
          patients(
            profiles(full_name, email)
          )
        `)
        .eq('doctor_id', doctor.id)
        .order('appointment_date', { ascending: true });

      if (appointmentsData && !appointmentsError) {
        setAppointments(appointmentsData);
      }

      // Fetch MRI scans shared with this doctor through appointments
      const sharedScanIds: string[] = [];
      appointmentsData?.forEach((apt: Appointment) => {
        if (apt.shared_mri_scans) {
          sharedScanIds.push(...apt.shared_mri_scans);
        }
      });

      if (sharedScanIds.length > 0) {
        const { data: mriData, error: mriError } = await supabase
          .from('mri_scans')
          .select(`
            id,
            file_name,
            scan_date,
            ai_analysis_result,
            status,
            created_at,
            patients(
              profiles(full_name)
            )
          `)
          .in('id', sharedScanIds);

        if (mriData && !mriError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSharedMRIScans(mriData as any);
        }
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
    {
      patient: "Michael Chen",
      type: "Irregular heartbeat detected",
      time: "15 minutes ago",
      severity: "high"
    },
    {
      patient: "David Thompson",
      type: "Heart rate spike",
      time: "30 minutes ago",
      severity: "medium"
    }
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
            <div className="text-2xl font-bold text-blue-600">24</div>
            <p className="text-xs text-blue-600 mt-1">+2 this week</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">3</div>
            <p className="text-xs text-red-600 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Stable Patients</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">21</div>
            <p className="text-xs text-green-600 mt-1">87.5% stable</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">AI Diagnoses</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">12</div>
            <p className="text-xs text-purple-600 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="patients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="patients">Patient List</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="reports">Shared Reports</TabsTrigger>
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
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
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
                            <Button size="sm" variant="outline">
                              <FileText className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                            {appointment.status === 'scheduled' && (
                              <Button size="sm">
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
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
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
                          <Button size="sm" variant="outline">
                            <Brain className="w-4 h-4 mr-1" />
                            View AI Analysis
                          </Button>
                          <Button size="sm">
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
              {criticalAlerts.map((alert, index) => (
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
              ))}
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
      </Tabs>
    </div>
  );
};
