
import React from 'react';
import { Settings as SettingsIcon, Database, TestTube, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import { useCreateSampleOrders } from '@/hooks/useOrders';

const Settings = () => {
  const createSampleOrdersMutation = useCreateSampleOrders();

  const handleCreateSampleOrders = () => {
    createSampleOrdersMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <SettingsIcon className="h-8 w-8 text-gray-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                System Settings
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Configure your F3-Engine fulfillment system
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start space-x-3">
                    <Database className="h-6 w-6 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">Database Status</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Your Supabase database is connected and ready for order management.
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full w-full"></div>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">Connected</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-start space-x-3">
                    <TestTube className="h-6 w-6 text-green-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-2">Test Data</h3>
                      <p className="text-sm text-green-700 mb-3">
                        Create sample orders to test the fulfillment workflow.
                      </p>
                      <Button 
                        onClick={handleCreateSampleOrders}
                        disabled={createSampleOrdersMutation.isPending}
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {createSampleOrdersMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Sample Orders'
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
              
              <div className="text-center py-8 border-t">
                <p className="text-gray-500 mb-4">
                  Your F3-Engine system is now connected to Supabase and ready for production use. 
                  Start by creating some test orders or connecting your Shopify store.
                </p>
                <div className="flex justify-center space-x-4">
                  <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Database Connected
                  </div>
                  <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    System Ready
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
