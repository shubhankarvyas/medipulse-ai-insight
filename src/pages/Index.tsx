
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Brain, MessageSquare, FileText, Shield, Zap, Users, LogOut } from "lucide-react";
import { Hero } from "@/components/Hero";
import { PatientDashboard } from "@/components/PatientDashboard";
import { DoctorDashboard } from "@/components/DoctorDashboard";
import { AIChat } from "@/components/AIChat";
import { RealTimeECG } from "@/components/RealTimeECG";
import { SecureMRIUpload } from "@/components/SecureMRIUpload";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, userProfile, signOut } = useAuth();
  const [activeView, setActiveView] = useState("home");

  const handleSignOut = async () => {
    await signOut();
  };

  const renderContent = () => {
    if (!userProfile) {
      return (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-pulse text-center">
            <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case "patient":
        return userProfile.role === 'patient' ? <PatientDashboard /> : <div>Access denied</div>;
      case "doctor":
        return userProfile.role === 'doctor' ? <DoctorDashboard /> : <div>Access denied</div>;
      case "ai-chat":
        return <AIChat />;
      case "ecg-monitor":
        return <RealTimeECG />;
      case "mri-upload":
        return <SecureMRIUpload />;
      default:
        return (
          <div className="space-y-16">
            <Hero />
            <FeaturesSection />
            <StatsSection />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                MediPulse AI
              </span>
            </div>
            
            <div className="hidden md:flex space-x-8">
              <button
                onClick={() => setActiveView("home")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === "home" ? "text-teal-600 bg-teal-50" : "text-gray-600 hover:text-teal-600"
                }`}
              >
                Home
              </button>
              
              {userProfile?.role === 'patient' && (
                <>
                  <button
                    onClick={() => setActiveView("patient")}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === "patient" ? "text-teal-600 bg-teal-50" : "text-gray-600 hover:text-teal-600"
                    }`}
                  >
                    My Dashboard
                  </button>
                  <button
                    onClick={() => setActiveView("ecg-monitor")}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === "ecg-monitor" ? "text-teal-600 bg-teal-50" : "text-gray-600 hover:text-teal-600"
                    }`}
                  >
                    ECG Monitor
                  </button>
                </>
              )}
              
              {userProfile?.role === 'doctor' && (
                <button
                  onClick={() => setActiveView("doctor")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === "doctor" ? "text-teal-600 bg-teal-50" : "text-gray-600 hover:text-teal-600"
                  }`}
                >
                  Doctor Dashboard
                </button>
              )}
              
              <button
                onClick={() => setActiveView("ai-chat")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === "ai-chat" ? "text-teal-600 bg-teal-50" : "text-gray-600 hover:text-teal-600"
                }`}
              >
                AI Assistant
              </button>
              <button
                onClick={() => setActiveView("mri-upload")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === "mri-upload" ? "text-teal-600 bg-teal-50" : "text-gray-600 hover:text-teal-600"
                }`}
              >
                MRI Analysis
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {userProfile && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="capitalize">
                    {userProfile.role}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {userProfile.full_name || user?.email}
                  </span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: Activity,
      title: "Real-time ECG Monitoring",
      description: "Continuous heart rhythm monitoring with ESP32 integration and instant alerts.",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Brain,
      title: "AI-Powered MRI Analysis",
      description: "Advanced machine learning models for medical image classification and diagnosis.",
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: MessageSquare,
      title: "Gemini AI Health Assistant",
      description: "Intelligent chatbot for health questions and medical image explanations.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "Secure Patient Data",
      description: "HIPAA-compliant data storage with role-based access control.",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: FileText,
      title: "Automated Reports",
      description: "Generate comprehensive PDF reports with ECG data and MRI results.",
      color: "from-orange-500 to-yellow-500"
    },
    {
      icon: Users,
      title: "Doctor-Patient Linking",
      description: "Secure platform for doctors to monitor assigned patients remotely.",
      color: "from-teal-500 to-blue-500"
    }
  ];

  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Comprehensive Healthcare Monitoring
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Advanced AI-powered tools for real-time health monitoring, diagnosis, and patient care management.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

const StatsSection = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl text-white">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Trusted by Healthcare Professionals</h2>
        <p className="text-lg text-teal-100">
          Making healthcare more accessible and efficient with AI-powered insights.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
        <div className="space-y-2">
          <div className="text-4xl font-bold">99.7%</div>
          <div className="text-teal-100">Diagnostic Accuracy</div>
        </div>
        <div className="space-y-2">
          <div className="text-4xl font-bold">24/7</div>
          <div className="text-teal-100">Real-time Monitoring</div>
        </div>
        <div className="space-y-2">
          <div className="text-4xl font-bold">1000+</div>
          <div className="text-teal-100">Patients Monitored</div>
        </div>
        <div className="space-y-2">
          <div className="text-4xl font-bold">500+</div>
          <div className="text-teal-100">Healthcare Providers</div>
        </div>
      </div>
    </section>
  );
};

export default Index;
