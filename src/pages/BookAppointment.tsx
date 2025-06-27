import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Stethoscope, FileText, Heart, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Doctor {
  id: string;
  user_id: string;
  license_number: string | null;
  specialization: string | null;
  years_of_experience: number | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface MRIScan {
  id: string;
  file_name: string;
  scan_date: string | null;
  ai_analysis_result: unknown;
  status: string;
  created_at: string;
}

interface Patient {
  id: string;
  user_id: string;
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mriScans, setMriScans] = useState<MRIScan[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  
  const [appointmentData, setAppointmentData] = useState({
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
    patient_notes: "",
    share_mri_reports: false,
    share_ecg_reports: false,
    selected_mri_scans: [] as string[]
  });

  const fetchDoctors = useCallback(async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        id,
        user_id,
        license_number,
        specialization,
        years_of_experience,
        profiles!inner(full_name, email)
      `)
      .eq('profiles.role', 'doctor');

    if (data && !error) {
      setDoctors(data);
    }
  }, []);

  const fetchPatientData = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('patients')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (data && !error) {
      setPatient(data);
    }
  }, [user]);

  const fetchMRIScans = useCallback(async () => {
    if (!user) return;
    
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (patientData) {
      const { data, error } = await supabase
        .from('mri_scans')
        .select('id, file_name, scan_date, ai_analysis_result, status, created_at')
        .eq('patient_id', patientData.id)
        .eq('status', 'analyzed')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setMriScans(data);
      }
    }
  }, [user]);

  useEffect(() => {
    if (userProfile?.role !== 'patient') {
      navigate('/');
      return;
    }
    
    const fetchData = async () => {
      await Promise.all([
        fetchDoctors(),
        fetchPatientData(),
        fetchMRIScans()
      ]);
    };
    
    fetchData();
  }, [userProfile, navigate, fetchDoctors, fetchPatientData, fetchMRIScans]);

  const handleMRIScanToggle = (scanId: string) => {
    setAppointmentData(prev => ({
      ...prev,
      selected_mri_scans: prev.selected_mri_scans.includes(scanId)
        ? prev.selected_mri_scans.filter(id => id !== scanId)
        : [...prev.selected_mri_scans, scanId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patient || !appointmentData.doctor_id || !appointmentData.appointment_date || !appointmentData.appointment_time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const appointmentDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('appointments')
        .insert({
          patient_id: patient.id,
          doctor_id: appointmentData.doctor_id,
          appointment_date: appointmentDateTime.toISOString(),
          notes: appointmentData.notes,
          patient_notes: appointmentData.patient_notes,
          mri_report_shared: appointmentData.share_mri_reports,
          ecg_report_shared: appointmentData.share_ecg_reports,
          shared_mri_scans: appointmentData.selected_mri_scans.length > 0 ? appointmentData.selected_mri_scans : null,
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been successfully scheduled.",
      });

      navigate('/');
    } catch (error: unknown) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedDoctor = doctors.find(d => d.id === appointmentData.doctor_id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Appointment</h1>
        <p className="text-gray-600">Schedule an appointment with one of our qualified doctors</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Doctor Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Stethoscope className="w-5 h-5 mr-2 text-blue-600" />
              Select Doctor
            </CardTitle>
            <CardDescription>
              Choose from our available doctors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={appointmentData.doctor_id}
              onValueChange={(value) => setAppointmentData(prev => ({ ...prev, doctor_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{doctor.profiles.full_name}</span>
                      <span className="text-sm text-gray-500">
                        {doctor.specialization} • {doctor.years_of_experience} years experience
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedDoctor && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900">{selectedDoctor.profiles.full_name}</h4>
                <p className="text-blue-700 text-sm">{selectedDoctor.specialization}</p>
                <p className="text-blue-600 text-sm">{selectedDoctor.years_of_experience} years of experience</p>
                <p className="text-blue-600 text-sm">License: {selectedDoctor.license_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date and Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-600" />
              Appointment Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={appointmentData.appointment_date}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, appointment_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={appointmentData.appointment_time}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, appointment_time: e.target.value }))}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-purple-600" />
              Share Medical Reports
            </CardTitle>
            <CardDescription>
              Choose which reports to share with the doctor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="share-ecg"
                checked={appointmentData.share_ecg_reports}
                onCheckedChange={(checked) => 
                  setAppointmentData(prev => ({ ...prev, share_ecg_reports: checked === true }))
                }
              />
              <Label htmlFor="share-ecg" className="flex items-center">
                <Heart className="w-4 h-4 mr-2 text-red-500" />
                Share ECG Reports
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="share-mri"
                checked={appointmentData.share_mri_reports}
                onCheckedChange={(checked) => 
                  setAppointmentData(prev => ({ ...prev, share_mri_reports: checked === true }))
                }
              />
              <Label htmlFor="share-mri">Share MRI Reports</Label>
            </div>

            {appointmentData.share_mri_reports && mriScans.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Select specific MRI scans to share:</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {mriScans.map(scan => (
                    <div key={scan.id} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        id={`mri-${scan.id}`}
                        checked={appointmentData.selected_mri_scans.includes(scan.id)}
                        onCheckedChange={() => handleMRIScanToggle(scan.id)}
                      />
                      <Label htmlFor={`mri-${scan.id}`} className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{scan.file_name}</span>
                          <div className="flex space-x-2">
                            <Badge variant="outline">
                              {new Date(scan.created_at).toLocaleDateString()}
                            </Badge>
                            <Badge variant="secondary">{scan.status}</Badge>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="patient-notes">Your Notes (Symptoms, Concerns, etc.)</Label>
              <Textarea
                id="patient-notes"
                placeholder="Describe your symptoms, concerns, or any specific questions you have..."
                value={appointmentData.patient_notes}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, patient_notes: e.target.value }))}
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any other information you'd like to share..."
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {loading ? (
              "Booking..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Book Appointment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
