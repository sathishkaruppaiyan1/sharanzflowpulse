
import React from 'react';
import { Settings as SettingsIcon, Key, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import SystemConfiguration from '@/components/settings/SystemConfiguration';
import ApiConfiguration from '@/components/settings/ApiConfiguration';
import CourierSettings from '@/components/settings/CourierSettings';

const Settings = () => {
  const { toast } = useToast();

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Password Updated",
      description: "Your password has been successfully changed.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <SettingsIcon className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
            </div>
            <p className="text-gray-600">
              Configure your Flow Pulse OFS fulfillment system and manage integrations.
            </p>
          </div>

          <Tabs defaultValue="system" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
              <TabsTrigger value="couriers">Couriers</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="system" className="space-y-6">
              <SystemConfiguration />
            </TabsContent>
            
            <TabsContent value="api" className="space-y-6">
              <ApiConfiguration />
            </TabsContent>

            <TabsContent value="couriers" className="space-y-6">
              <CourierSettings />
            </TabsContent>

            <TabsContent value="password" className="space-y-6">
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Key className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Password Management
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    Change user passwords and manage account security
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-email">User Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        placeholder="Enter user email"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full">
                      Change Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-lg border-0 bg-white">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      System Logs
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-600">
                      View system events and application logs
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <div className="text-sm text-gray-700 space-y-2">
                        <div className="text-center text-gray-500 py-8">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No system logs available</p>
                          <p className="text-xs mt-1">Logs will appear here when events occur</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" className="w-full" disabled>
                      Download System Logs
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      Activity Logs
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-600">
                      Track user activities and system changes
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <div className="text-sm text-gray-700 space-y-2">
                        <div className="text-center text-gray-500 py-8">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No activity logs available</p>
                          <p className="text-xs mt-1">User activities will be tracked here</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" className="w-full" disabled>
                      Download Activity Logs
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
