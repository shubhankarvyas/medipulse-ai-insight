import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MRIScan {
  id: string;
  file_name: string;
  file_path: string;
  scan_type: string;
  scan_date: string;
  ai_analysis_result: {
    medical_diagnosis?: string;
    medical_confidence?: number;
    primary_diagnosis?: string;
    confidence_score?: number;
    hf_analysis?: string;
    hf_confidence?: number;
    gemini_analysis?: string;
    comprehensive_report?: string;
    model_used?: string;
    error?: string;
  } | null;
  ai_confidence_score: number;
  status: 'pending' | 'analyzed' | 'reviewed';
  created_at: string;
  patient_id?: string;
  doctor_notes?: string;
  file_size: number;
  uploaded_by: string;
}

export const SecureMRIUpload = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scans, setScans] = useState<MRIScan[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanData, setScanData] = useState({
    scanType: '',
    scanDate: '',
    notes: ''
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/dicom', 'application/dicom'];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.dcm')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload DICOM (.dcm), JPEG, or PNG files only.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload files smaller than 50MB.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !userProfile) {
      toast({
        title: 'Upload Error',
        description: 'Please select a file and ensure you are logged in.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('mri-scans')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(50);

      // Get patient ID
      let patientId = null;
      if (userProfile.role === 'patient') {
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (patientError || !patientData) {
          // If patient record doesn't exist, create one
          const { data: newPatient, error: createError } = await supabase
            .from('patients')
            .insert({
              user_id: user.id,
            })
            .select('id')
            .single();

          if (createError) {
            throw new Error('Failed to create patient profile');
          }
          patientId = newPatient.id;
        } else {
          patientId = patientData.id;
        }
      }

      // Save scan metadata to database
      const { data: scanRecord, error: dbError } = await supabase
        .from('mri_scans')
        .insert({
          patient_id: patientId,
          uploaded_by: user.id,
          file_path: filePath,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          scan_type: scanData.scanType,
          scan_date: scanData.scanDate || null,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      setUploadProgress(75);

      // Send to FastAPI backend for AI analysis
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('patient_id', patientId || '');
        formData.append('uploaded_by', user.id);

        const response = await fetch('http://localhost:8000/upload-mri', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Backend analysis failed: ${response.statusText}`);
        }

        const analysisResult = await response.json();
        
        // Update scan record with AI analysis results
        await supabase
          .from('mri_scans')
          .update({
            ai_analysis_result: {
              medical_diagnosis: analysisResult.diagnosis,
              medical_confidence: analysisResult.medical_confidence,
              primary_diagnosis: analysisResult.primary_diagnosis,
              confidence_score: analysisResult.confidence,
              gemini_analysis: analysisResult.gemini_analysis,
              comprehensive_report: analysisResult.comprehensive_report,
              model_used: analysisResult.model_used
            },
            ai_confidence_score: analysisResult.confidence,
            status: 'analyzed'
          })
          .eq('id', scanRecord.id);

        toast({
          title: 'Analysis Complete',
          description: 'Your MRI scan has been analyzed by AI. Check the results below.',
        });

      } catch (aiError) {
        console.error('AI Analysis error:', aiError);
        // Update status to indicate AI analysis failed but file was uploaded
        await supabase
          .from('mri_scans')
          .update({
            status: 'pending',
            ai_analysis_result: { error: `AI analysis failed: ${aiError}` }
          })
          .eq('id', scanRecord.id);
          
        toast({
          title: 'Upload Successful, Analysis Pending',
          description: 'File uploaded but AI analysis encountered an issue. Please try again.',
          variant: 'destructive'
        });
      }

      setUploadProgress(100);

      toast({
        title: 'Upload Successful',
        description: 'Your MRI scan has been uploaded and queued for AI analysis.',
      });

      // Reset form
      setSelectedFile(null);
      setScanData({ scanType: '', scanDate: '', notes: '' });
      
      // Refresh scans list
      fetchScans();

    } catch (error: Error | unknown) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload MRI scan.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const fetchScans = React.useCallback(async () => {
    if (!userProfile) return;

    const { data, error } = await supabase
      .from('mri_scans')
      .select('*')
      .eq('uploaded_by', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scans:', error);
      return;
    }

    setScans(data as MRIScan[]);
  }, [userProfile, user?.id]);

  useEffect(() => {
    if (userProfile) {
      fetchScans();
    }
  }, [userProfile, fetchScans]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please log in to upload MRI scans.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'analyzed': return 'bg-blue-100 text-blue-700';
      case 'reviewed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-3 h-3" />;
      case 'analyzed': return <Brain className="w-3 h-3" />;
      case 'reviewed': return <CheckCircle className="w-3 h-3" />;
      default: return <File className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload MRI Scan
          </CardTitle>
          <CardDescription>
            Upload DICOM, JPEG, or PNG files for AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scanType">Scan Type</Label>
            <Select value={scanData.scanType} onValueChange={(value) => setScanData(prev => ({ ...prev, scanType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select scan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brain">Brain MRI</SelectItem>
                <SelectItem value="spine">Spine MRI</SelectItem>
                <SelectItem value="chest">Chest MRI</SelectItem>
                <SelectItem value="abdomen">Abdominal MRI</SelectItem>
                <SelectItem value="musculoskeletal">Musculoskeletal MRI</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scanDate">Scan Date</Label>
            <Input
              id="scanDate"
              type="date"
              value={scanData.scanDate}
              onChange={(e) => setScanData(prev => ({ ...prev, scanDate: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">MRI File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-2">
                  <File className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop your MRI file here or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports DICOM (.dcm), JPEG, and PNG files up to 50MB
                  </p>
                </div>
              )}
              <Input
                id="file"
                type="file"
                accept=".dcm,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Label htmlFor="file" className="cursor-pointer">
                <Button variant="outline" className="mt-2" asChild>
                  <span>Choose File</span>
                </Button>
              </Label>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload MRI Scan'}
          </Button>
        </CardContent>
      </Card>

      {/* Uploaded Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Your MRI Scans</CardTitle>
          <CardDescription>View and track your uploaded MRI scans</CardDescription>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No MRI scans uploaded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {scans.map((scan) => (
                <div key={scan.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{scan.file_name}</h4>
                    <Badge className={getStatusColor(scan.status)}>
                      {getStatusIcon(scan.status)}
                      <span className="ml-1 capitalize">{scan.status}</span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Type:</span> {scan.scan_type || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-medium">Scan Date:</span> {scan.scan_date || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-medium">Uploaded:</span> {new Date(scan.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {scan.ai_analysis_result && (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-blue-700 font-semibold">
                          <Brain className="w-5 h-5 mr-2" />
                          AI Medical Analysis
                        </div>
                        {(scan.ai_confidence_score || scan.ai_analysis_result.confidence_score || scan.ai_analysis_result.medical_confidence) && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            Overall: {Math.round((scan.ai_confidence_score || scan.ai_analysis_result.confidence_score || scan.ai_analysis_result.medical_confidence) * 100)}% Confidence
                          </Badge>
                        )}
                      </div>
                      
                      {/* Medical Diagnosis Card */}
                      {(scan.ai_analysis_result.medical_diagnosis || scan.ai_analysis_result.primary_diagnosis || scan.ai_analysis_result.hf_analysis) && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                              <h4 className="font-semibold text-green-800">Medical AI Diagnosis</h4>
                            </div>
                            {scan.ai_analysis_result.medical_confidence && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Medical AI: {Math.round(scan.ai_analysis_result.medical_confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-green-700 font-medium mb-2">
                            {scan.ai_analysis_result.medical_diagnosis || scan.ai_analysis_result.primary_diagnosis || scan.ai_analysis_result.hf_analysis}
                          </p>
                          {scan.ai_analysis_result.model_used && (
                            <p className="text-xs text-green-600">
                              Model: {scan.ai_analysis_result.model_used.split('/').pop()}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Comprehensive Medical Report */}
                      {scan.ai_analysis_result.comprehensive_report && (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h4 className="font-semibold text-gray-800 flex items-center">
                              <File className="w-4 h-4 mr-2" />
                              Detailed Medical Report
                            </h4>
                          </div>
                          <div className="p-4">
                            <div className="prose prose-sm max-w-none">
                              {scan.ai_analysis_result.comprehensive_report.split('\n').map((line, index) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return (
                                    <h4 key={index} className="font-semibold text-gray-800 mt-4 mb-2 first:mt-0">
                                      {line.replace(/\*\*/g, '')}
                                    </h4>
                                  );
                                }
                                if (line.startsWith('- ')) {
                                  return (
                                    <li key={index} className="text-gray-700 ml-4">
                                      {line.substring(2)}
                                    </li>
                                  );
                                }
                                if (line.trim()) {
                                  return (
                                    <p key={index} className="text-gray-700 mb-2">
                                      {line}
                                    </p>
                                  );
                                }
                                return <br key={index} />;
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Gemini AI Analysis */}
                      {scan.ai_analysis_result.gemini_analysis && (
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                          <div className="p-4 border-b border-purple-100">
                            <h4 className="font-semibold text-purple-800 flex items-center">
                              <Brain className="w-4 h-4 mr-2" />
                              AI Clinical Insights
                            </h4>
                          </div>
                          <div className="p-4">
                            <div className="prose prose-sm max-w-none text-purple-700">
                              {scan.ai_analysis_result.gemini_analysis.split('\n').map((line, index) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return (
                                    <h5 key={index} className="font-semibold text-purple-800 mt-3 mb-1 first:mt-0">
                                      {line.replace(/\*\*/g, '')}
                                    </h5>
                                  );
                                }
                                if (line.startsWith('- ')) {
                                  return (
                                    <li key={index} className="text-purple-700 ml-4 mb-1">
                                      {line.substring(2)}
                                    </li>
                                  );
                                }
                                if (line.trim()) {
                                  return (
                                    <p key={index} className="text-purple-700 mb-2 leading-relaxed">
                                      {line}
                                    </p>
                                  );
                                }
                                return <br key={index} />;
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Error Display */}
                      {scan.ai_analysis_result.error && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <div className="flex items-center text-red-700 mb-2">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Analysis Error</span>
                          </div>
                          <p className="text-sm text-red-600">{scan.ai_analysis_result.error}</p>
                        </div>
                      )}
                      
                      {/* Medical Disclaimer */}
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <div className="flex items-start">
                          <AlertCircle className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-amber-700">
                            <p className="font-medium mb-1">Medical Disclaimer</p>
                            <p>This AI analysis is for educational and research purposes only. Please consult with a qualified medical professional for clinical diagnosis and treatment decisions.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
