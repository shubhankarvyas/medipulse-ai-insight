
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Activity, TrendingUp, AlertTriangle, Calendar, Download, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RealTimeECG } from "@/components/RealTimeECG";

export const PatientDashboard = () => {
  const { userProfile } = useAuth();

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

  const patientData = userProfile.patients?.[0];

  // Mock vital signs - in real app, these would come from latest ECG readings
  const vitalSigns = {
    heartRate: 72,
    bloodPressure: "120/80",
    temperature: 98.6,
    oxygenSaturation: 98
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
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-teal-600 to-blue-600">
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

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Heart Rate</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{vitalSigns.heartRate} BPM</div>
            <p className="text-xs text-red-600 mt-1">Normal range</p>
            <div className="mt-3">
              <Progress value={75} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Blood Pressure</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{vitalSigns.bloodPressure}</div>
            <p className="text-xs text-blue-600 mt-1">mmHg</p>
            <div className="mt-3">
              <Progress value={60} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Temperature</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{vitalSigns.temperature}°F</div>
            <p className="text-xs text-green-600 mt-1">Normal</p>
            <div className="mt-3">
              <Progress value={80} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Oxygen Saturation</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{vitalSigns.oxygenSaturation}%</div>
            <p className="text-xs text-purple-600 mt-1">Excellent</p>
            <div className="mt-3">
              <Progress value={98} className="h-2" />
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
