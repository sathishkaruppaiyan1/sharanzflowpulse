
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Package, Truck, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginFormProps {
  onLogin: (user: { email: string; role: string; name: string }) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        // Handle forgot password
        if (!email) {
          toast({
            title: "Reset Password Failed",
            description: "Please enter your email address",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });

        if (error) {
          toast({
            title: "Reset Password Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Reset Email Sent",
            description: "Check your email for password reset instructions",
          });
          setIsForgotPassword(false);
        }
      } else if (isSignUp) {
        // Handle sign up
        if (!email || !password || !confirmPassword || !name) {
          toast({
            title: "Sign Up Failed",
            description: "Please fill in all fields",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        if (password !== confirmPassword) {
          toast({
            title: "Sign Up Failed",
            description: "Passwords do not match",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          toast({
            title: "Sign Up Failed",
            description: "Password must be at least 6 characters",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name,
            }
          }
        });

        if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Created Successfully",
            description: "Please check your email to verify your account",
          });
          // Don't auto-login, wait for email verification
        }
      } else {
        // Handle sign in
        if (!email || !password) {
          toast({
            title: "Sign In Failed",
            description: "Please fill in all fields",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Sign In Failed",
            description: error.message,
            variant: "destructive",
          });
        } else if (data.user) {
          toast({
            title: "Sign In Successful",
            description: "Welcome back to Flow Pulse!",
          });
          // The onAuthStateChange in App.tsx will handle the login
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsSignUp(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Flow Pulse
          </h1>
          <p className="text-gray-600 mt-2">Order Fulfillment System</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-center">
              {isForgotPassword 
                ? 'Enter your email to receive password reset instructions'
                : isSignUp 
                  ? 'Enter your details to create a new account' 
                  : 'Enter your credentials to access the system'
              }
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {isSignUp && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {isSignUp && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                disabled={isLoading}
              >
                {isLoading 
                  ? (isForgotPassword ? "Sending Reset Email..." : isSignUp ? "Creating Account..." : "Signing in...") 
                  : (isForgotPassword ? "Send Reset Email" : isSignUp ? "Create Account" : "Sign In")
                }
              </Button>
              
              {!isForgotPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleAuthMode}
                  className="w-full"
                >
                  {isSignUp 
                    ? "Already have an account? Sign In" 
                    : "Don't have an account? Sign Up"
                  }
                </Button>
              )}

              {!isSignUp && !isForgotPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleForgotPassword}
                  className="w-full text-sm"
                >
                  Forgot your password?
                </Button>
              )}

              {isForgotPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Order Management</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Shipping & Tracking</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
