
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Activity, TrendingUp, AlertTriangle, Calendar, Download } from "lucide-react";

export const PatientDashboard = () => {
  // Mock data for demonstration
  const vitalSigns = {
    heartRate: 72,
    bloodPressure: "120/80",
    temperature: 98.6,
    oxygenSaturation: 98
  };

  const recentECGData = [
    { time: "14:30", bpm: 68, status: "normal" },
    { time: "14:15", bpm: 72, status: "normal" },
    { time: "14:00", bpm: 75, status: "elevated" },
    { time: "13:45", bpm: 70, status: "normal" },
    { time: "13:30", bpm: 69, status: "normal" }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor your health metrics in real-time</p>
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

      {/* ECG Monitoring and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Real-time ECG */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Real-time ECG Monitoring
            </CardTitle>
            <CardDescription>Live heart rhythm data from your wearable device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ECG Wave Simulation */}
            <div className="h-32 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg flex items-center justify-center border">
              <div className="flex items-center space-x-2">
                <Activity className="w-6 h-6 text-blue-500 animate-pulse" />
                <span className="text-blue-600 font-medium">ECG Waveform Active</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <p className="font-semibold text-green-600">Normal Rhythm</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent ECG Data */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent ECG Readings</CardTitle>
            <CardDescription>Your heart rate data over the past 2 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentECGData.map((reading, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-600">{reading.time}</div>
                    <div className="font-semibold">{reading.bpm} BPM</div>
                  </div>
                  <Badge 
                    variant={reading.status === "normal" ? "secondary" : "destructive"}
                    className={reading.status === "normal" ? "bg-green-100 text-green-700" : ""}
                  >
                    {reading.status}
                  </Badge>
                </div>
              ))}
            </div>
            
            <Button variant="outline" className="w-full mt-4">
              View Full History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Recommendations */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-800">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Health Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-white rounded-lg border border-orange-200">
            <p className="font-medium text-orange-800">Mild Elevation Detected</p>
            <p className="text-sm text-orange-600 mt-1">
              Your heart rate was slightly elevated around 2:00 PM. Consider taking a short break and practicing deep breathing.
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-green-200">
            <p className="font-medium text-green-800">Great Progress!</p>
            <p className="text-sm text-green-600 mt-1">
              Your overall heart rate trend shows improvement over the past week. Keep up the healthy lifestyle!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
