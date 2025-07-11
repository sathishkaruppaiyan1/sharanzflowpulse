
import React from 'react';
import { Users as UsersIcon, Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';

const Users = () => {
  return (
    <div className="flex flex-col h-full">
      <Header title="Access Denied" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Access Restricted
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                This section is not available for general access
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  User management features have been restricted. Please contact your system administrator for access.
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                  <Shield className="h-4 w-4 mr-2" />
                  Access Denied
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Users;
