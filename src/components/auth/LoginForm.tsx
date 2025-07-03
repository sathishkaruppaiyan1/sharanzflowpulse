
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Package, Truck, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: (user: { email: string; role: string; name: string }) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      if (isSignUp) {
        // Sign up validation
        if (!email || !password || !confirmPassword || !name || !role) {
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

        // Simulate successful signup
        onLogin({ email, role, name });
        toast({
          title: "Account Created Successfully",
          description: `Welcome to F3-Engine, ${name}!`,
        });
      } else {
        // Sign in validation
        if (email && password && role) {
          const userName = name || email.split('@')[0];
          onLogin({ 
            email, 
            role, 
            name: userName.charAt(0).toUpperCase() + userName.slice(1) 
          });
          toast({
            title: "Login Successful",
            description: `Welcome back to F3-Engine!`,
          });
        } else {
          toast({
            title: "Login Failed",
            description: "Please fill in all fields",
            variant: "destructive",
          });
        }
      }
      setIsLoading(false);
    }, 1000);
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setRole('');
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
            F3-Engine
          </h1>
          <p className="text-gray-600 mt-2">Order Fulfillment Management System</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignUp 
                ? 'Enter your details to create a new account' 
                : 'Enter your credentials to access the system'
              }
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {isSignUp && (
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

              {isSignUp && (
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

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="packing_staff">Packing Staff</SelectItem>
                    <SelectItem value="print_operator">Print Operator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                disabled={isLoading}
              >
                {isLoading 
                  ? (isSignUp ? "Creating Account..." : "Signing in...") 
                  : (isSignUp ? "Create Account" : "Sign In")
                }
              </Button>
              
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
