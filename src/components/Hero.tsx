
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Heart, Activity, Brain, Zap } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative pt-16 pb-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-teal-500 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-blue-500 rounded-full animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-purple-500 rounded-full animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm bg-gradient-to-r from-teal-100 to-blue-100 text-teal-700 border-0">
            <Zap className="w-4 h-4 mr-2" />
            AI-Powered Healthcare Platform
          </Badge>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="block">Healthcare</span>
            <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Monitoring
            </span>
            <span className="block">Reimagined</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Real-time ECG monitoring, AI-powered MRI analysis, and intelligent health insights 
            all in one comprehensive platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 px-8 py-4 text-lg font-semibold group"
            >
              Start Monitoring
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold group"
            >
              <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              Watch Demo
            </Button>
          </div>

          {/* Feature Icons */}
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-red-500" />
              <span className="text-sm font-medium text-gray-600">ECG Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">AI Diagnosis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-6 h-6 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Real-time Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
    </section>
  );
};
