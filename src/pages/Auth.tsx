import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Heart, UserPlus, LogIn, Stethoscope, User } from 'lucide-react';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'patient',
    phoneNumber: '',
    // Patient specific
    dateOfBirth: '',
    gender: '',
    // Doctor specific
    licenseNumber: '',
    specialization: '',
    hospitalAffiliation: '',
    yearsOfExperience: ''
  });

  const isSignupFormValid =
    signupData.email &&
    signupData.password &&
    signupData.confirmPassword &&
    signupData.fullName &&
    (signupData.role === 'patient'
      ? signupData.dateOfBirth && signupData.gender
      : signupData.licenseNumber && signupData.specialization);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginData.email, loginData.password);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in.'
      });
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive'
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive'
      });
      return;
    }

    // Validate required fields based on role
    if (!signupData.fullName || !signupData.role) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    if (signupData.role === 'doctor' && (!signupData.licenseNumber || !signupData.specialization)) {
      toast({
        title: 'Missing Doctor Information',
        description: 'License number and specialization are required for doctors.',
        variant: 'destructive'
      });
      return;
    }

    if (signupData.role === 'patient' && !signupData.dateOfBirth) {
      toast({
        title: 'Missing Patient Information',
        description: 'Date of birth is required for patients.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const userData = {
      full_name: signupData.fullName.trim(),
      role: signupData.role,
      phone_number: signupData.phoneNumber?.trim(),
      ...(signupData.role === 'patient' 
        ? {
            date_of_birth: signupData.dateOfBirth || null,
            gender: signupData.gender || null
          } 
        : {
            license_number: signupData.licenseNumber?.trim(),
            specialization: signupData.specialization?.trim(),
            years_of_experience: signupData.yearsOfExperience || null
          }
      )
    };

    console.log('Attempting signup with data:', { email: signupData.email, userData });

    try {
      const { error } = await signUp(signupData.email, signupData.password, userData);

      if (error) {
        console.error('Signup error:', error);
        toast({
          title: 'Signup Failed',
          description: error.message || 'An error occurred during signup. Please try again.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success!',
          description: 'Your account has been created. Please check your email for verification.',
        });
      }
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      toast({
        title: 'Signup Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              MediPulse AI
            </span>
          </div>
          <p className="text-gray-600">Access your healthcare monitoring platform</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login" className="flex items-center space-x-2">
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>Sign Up</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Logging in...' : 'Log In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Join MediPulse AI as a patient or healthcare provider</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup}>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="full-name">Full name</Label>
                        <Input
                          id="full-name"
                          placeholder="John Doe"
                          required
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          required
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          required
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={signupData.role}
                        onValueChange={(value) => setSignupData({ ...signupData, role: value })}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4" />
                              <span>Patient</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="doctor">
                            <div className="flex items-center">
                              <Stethoscope className="mr-2 h-4 w-4" />
                              <span>Doctor</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {signupData.role === 'patient' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            required
                            value={signupData.dateOfBirth}
                            onChange={(e) => setSignupData({ ...signupData, dateOfBirth: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Select
                            value={signupData.gender}
                            onValueChange={(value) => setSignupData({ ...signupData, gender: value })}
                            required
                          >
                            <SelectTrigger id="gender">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="license">License Number</Label>
                          <Input
                            id="license"
                            placeholder="12345ABC"
                            required
                            value={signupData.licenseNumber}
                            onChange={(e) => setSignupData({ ...signupData, licenseNumber: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="specialization">Specialization</Label>
                          <Input
                            id="specialization"
                            placeholder="Cardiology"
                            required
                            value={signupData.specialization}
                            onChange={(e) => setSignupData({ ...signupData, specialization: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    <Button type="submit" className="w-full" disabled={loading || !isSignupFormValid}>
                      {loading ? 'Creating Account...' : 'Create an account'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
