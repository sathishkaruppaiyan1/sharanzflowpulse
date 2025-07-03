
import React from 'react';
import { Truck, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';

const Tracking = () => {
  return (
    <div className="flex flex-col h-full">
      <Header title="Tracking Stage" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Truck className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Tracking Stage
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Order tracking and delivery monitoring coming soon
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Real-time Tracking</h3>
                    <p className="text-sm text-gray-600">Live shipment location updates</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Truck className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Carrier Integration</h3>
                    <p className="text-sm text-gray-600">FrenchExpress & Delhivery APIs</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  This feature will include real-time tracking, delivery notifications, and carrier management.
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                  <Clock className="h-4 w-4 mr-2" />
                  Coming Soon
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
