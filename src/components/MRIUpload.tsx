
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Brain, FileImage, CheckCircle, AlertCircle, Download, Eye } from "lucide-react";

export const MRIUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleFileUpload = () => {
    setIsAnalyzing(true);
    setUploadProgress(0);

    // Simulate upload and analysis progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsAnalyzing(false);
            setAnalysisComplete(true);
          }, 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  // Mock previous analyses
  const previousAnalyses = [
    {
      id: 1,
      date: "2024-01-15",
      type: "Brain MRI",
      result: "Normal",
      confidence: 97.3,
      findings: "No abnormalities detected. Clear brain structure with good contrast."
    },
    {
      id: 2,
      date: "2024-01-10",
      type: "Cardiac MRI",
      result: "Mild abnormality",
      confidence: 89.7,
      findings: "Small area of interest in left ventricle. Recommend follow-up."
    },
    {
      id: 3,
      date: "2024-01-05",
      type: "Spine MRI",
      result: "Normal",
      confidence: 94.8,
      findings: "Healthy spinal alignment. No disc herniation or compression."
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">MRI Analysis Center</h1>
        <p className="text-gray-600">AI-powered medical image analysis using advanced machine learning</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
          <TabsTrigger value="history">Analysis History</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="border-2 border-dashed border-gray-200 hover:border-teal-300 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center">
                  <FileImage className="w-6 h-6 mr-2 text-teal-600" />
                  Upload MRI Images
                </CardTitle>
                <CardDescription>
                  Supported formats: DICOM, PNG, JPG (Max 50MB per file)
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                {!isAnalyzing && !analysisComplete && (
                  <>
                    <div className="py-12">
                      <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">Drag and drop your MRI images here</p>
                      <Button 
                        onClick={handleFileUpload}
                        className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Files
                      </Button>
                    </div>
                  </>
                )}

                {isAnalyzing && (
                  <div className="py-12">
                    <Brain className="w-16 h-16 mx-auto text-teal-600 mb-4 animate-pulse" />
                    <h3 className="text-lg font-semibold mb-2">Analyzing MRI Images</h3>
                    <p className="text-gray-600 mb-4">AI is processing your medical images...</p>
                    <Progress value={uploadProgress} className="w-full mb-2" />
                    <p className="text-sm text-gray-500">{uploadProgress}% Complete</p>
                  </div>
                )}

                {analysisComplete && (
                  <div className="py-12">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Analysis Complete!</h3>
                    <p className="text-gray-600 mb-4">Your MRI has been successfully analyzed</p>
                    <Button variant="outline" className="mr-2">
                      <Eye className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Analysis Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-600" />
                  Latest Analysis Results
                </CardTitle>
                <CardDescription>AI-generated diagnostic insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisComplete ? (
                  <>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-green-800">Analysis Status</span>
                        <Badge className="bg-green-100 text-green-700">Normal</Badge>
                      </div>
                      <p className="text-sm text-green-700">No significant abnormalities detected</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Confidence Level</p>
                        <p className="text-xl font-bold text-blue-600">96.8%</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Image Quality</p>
                        <p className="text-xl font-bold text-green-600">Excellent</p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Key Findings</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Brain structure appears normal with good contrast</li>
                        <li>• No signs of lesions or abnormal masses</li>
                        <li>• Vascular patterns within normal limits</li>
                        <li>• Recommended follow-up: Annual screening</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2">AI Explanation</h4>
                      <p className="text-sm text-purple-700">
                        The AI model analyzed 247 distinct regions of your MRI scan using advanced 
                        convolutional neural networks. The analysis indicates healthy brain tissue 
                        with appropriate signal intensity and no concerning areas requiring immediate attention.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600">Upload an MRI image to see AI analysis results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Previous MRI Analyses</CardTitle>
              <CardDescription>Your complete analysis history with AI insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {previousAnalyses.map((analysis) => (
                  <div key={analysis.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{analysis.type}</h3>
                        <p className="text-sm text-gray-600">{analysis.date}</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={
                            analysis.result === "Normal" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-yellow-100 text-yellow-700"
                          }
                        >
                          {analysis.result}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{analysis.confidence}% confidence</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{analysis.findings}</p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
              <CardHeader>
                <CardTitle className="text-purple-800">AI Model Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-700">Diagnostic Accuracy</span>
                  <span className="font-bold text-purple-800">97.3%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-700">False Positive Rate</span>
                  <span className="font-bold text-purple-800">1.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-700">Processing Speed</span>
                  <span className="font-bold text-purple-800">12.3s avg</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-800">Supported Analyses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-blue-700">Brain tumor detection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-blue-700">Cardiac abnormalities</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-blue-700">Spinal conditions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-blue-700">Joint inflammation</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How Our AI Works</CardTitle>
              <CardDescription>Understanding the technology behind MediPulse AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Image Processing</h3>
                  <p className="text-sm text-gray-600">Advanced preprocessing and enhancement of medical images</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">AI Analysis</h3>
                  <p className="text-sm text-gray-600">Deep learning models trained on millions of medical images</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileImage className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Report Generation</h3>
                  <p className="text-sm text-gray-600">Comprehensive reports with confidence scores and explanations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
