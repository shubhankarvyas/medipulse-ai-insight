
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Brain, Heart, Activity } from "lucide-react";

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  category?: string;
}

export const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Health Assistant powered by Gemini Pro Vision. I can help you understand your ECG readings, explain MRI results, and answer health-related questions. How can I assist you today?",
      timestamp: "14:30",
      category: "greeting"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const quickActions = [
    {
      text: "Explain my latest ECG reading",
      icon: Activity,
      category: "ecg"
    },
    {
      text: "Analyze my MRI scan results",
      icon: Brain,
      category: "mri"
    },
    {
      text: "What does my heart rate trend mean?",
      icon: Heart,
      category: "trends"
    },
    {
      text: "General health advice",
      icon: MessageSquare,
      category: "general"
    }
  ];

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        type: 'ai',
        content: generateAIResponse(message),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: "response"
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const generateAIResponse = (userMessage: string): string => {
    if (userMessage.toLowerCase().includes("ecg")) {
      return "Based on your recent ECG readings, I can see your heart rhythm has been mostly normal with an average rate of 72 BPM. There was a slight elevation around 2:00 PM (75 BPM), which could be related to physical activity or stress. Your overall heart rhythm pattern shows good variability, which is a positive indicator of heart health. I recommend continuing your current lifestyle and monitoring any symptoms you might experience during elevated readings.";
    } else if (userMessage.toLowerCase().includes("mri")) {
      return "I'd be happy to help explain MRI results! However, I don't see any recent MRI scans in your profile. If you have a new MRI scan to upload, please use the MRI Analysis section to upload your images. I can then provide detailed explanations of the findings, highlight any areas of concern, and explain what the results mean in simple terms. Would you like me to guide you through the upload process?";
    } else if (userMessage.toLowerCase().includes("heart rate")) {
      return "Your heart rate trends over the past week show excellent patterns! Your resting heart rate averages around 68-72 BPM, which is within the normal range for adults. I notice your heart rate responds appropriately to activity and returns to baseline efficiently. This suggests good cardiovascular fitness. The slight variations throughout the day are completely normal and reflect your body's natural circadian rhythms.";
    } else {
      return "I'm here to help with any health-related questions you have! I can analyze your medical data, explain test results, provide general health guidance, and help you understand your body's signals. Feel free to ask about specific symptoms, medication questions, or lifestyle recommendations. Remember, while I can provide helpful information, always consult with your healthcare provider for medical decisions.";
    }
  };

  const handleQuickAction = (action: string) => {
    handleSendMessage(action);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Health Assistant</h1>
        <p className="text-gray-600">Powered by Gemini Pro Vision for intelligent health insights</p>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common health questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto p-3 hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50"
                  onClick={() => handleQuickAction(action.text)}
                >
                  <IconComponent className="w-4 h-4 mr-2 text-teal-600" />
                  <span className="text-sm">{action.text}</span>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Gemini AI Assistant</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600">Online</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && (
                          <Bot className="w-4 h-4 mt-1 text-teal-600" />
                        )}
                        {message.type === 'user' && (
                          <User className="w-4 h-4 mt-1 text-white" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-teal-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-lg max-w-xs">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-teal-600" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse animation-delay-200"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse animation-delay-400"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Ask about your health data, symptoms, or get medical advice..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  <Brain className="w-3 h-3 mr-1" />
                  AI-Powered
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  HIPAA Compliant
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Real-time Analysis
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-800">
              <Brain className="w-5 h-5 mr-2" />
              Image Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-700">
              Upload medical images for AI-powered analysis and detailed explanations of findings.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Activity className="w-5 h-5 mr-2" />
              Data Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">
              Get clear explanations of your ECG readings, vital signs, and health trends.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <MessageSquare className="w-5 h-5 mr-2" />
              Health Guidance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700">
              Receive personalized health advice and recommendations based on your medical data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
