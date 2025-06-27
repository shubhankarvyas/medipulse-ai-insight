
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, AlertTriangle, Activity, Brain, FileText, Plus } from "lucide-react";

export const DoctorDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock patient data
  const patients = [
    {
      id: 1,
      name: "Sarah Johnson",
      age: 34,
      condition: "Hypertension",
      lastReading: "2 hours ago",
      status: "stable",
      heartRate: 78,
      alerts: 0
    },
    {
      id: 2,
      name: "Michael Chen",
      age: 45,
      condition: "Arrhythmia",
      lastReading: "15 minutes ago",
      status: "attention",
      heartRate: 95,
      alerts: 2
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      age: 28,
      condition: "Post-surgery monitoring",
      lastReading: "1 hour ago",
      status: "stable",
      heartRate: 72,
      alerts: 0
    },
    {
      id: 4,
      name: "David Thompson",
      age: 52,
      condition: "Cardiac rehabilitation",
      lastReading: "30 minutes ago",
      status: "improving",
      heartRate: 68,
      alerts: 1
    }
  ];

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
      case "attention": return "bg-red-100 text-red-700 border-red-200";
      case "improving": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-green-100 text-green-700 border-green-200");
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients">Patient List</TabsTrigger>
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
            {patients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{patient.name}</CardTitle>
                      <CardDescription>Age: {patient.age} | {patient.condition}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(patient.status)}>
                      {patient.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Heart Rate:</span>
                    <span className="font-semibold">{patient.heartRate} BPM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Reading:</span>
                    <span className="text-sm">{patient.lastReading}</span>
                  </div>
                  {patient.alerts > 0 && (
                    <div className="flex items-center space-x-2 p-2 background-red-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">{patient.alerts} active alert(s)</span>
                    </div>
                  )}
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
