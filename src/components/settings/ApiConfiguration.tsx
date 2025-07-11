
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { Package, MessageSquare, Truck, Loader2 } from 'lucide-react';

const ApiConfiguration = () => {
  const { apiConfigs, setApiConfigs, saveConfigs, saving, loading } = useApiConfigs();

  const handleSave = async () => {
    await saveConfigs(apiConfigs);
  };

  const handleTestConnection = (integration: string) => {
    // TODO: Implement test connection functionality
    console.log(`Testing ${integration} connection...`);
  };

  const handleFetchOrders = () => {
    // TODO: Implement fetch orders functionality
    console.log('Fetching orders...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading API configurations...</span>
      </div>
    );
  }

  const isShopifyConnected = apiConfigs.shopify?.enabled && apiConfigs.shopify?.shop_url && apiConfigs.shopify?.access_token;
  const isWatiConnected = apiConfigs.wati?.enabled && apiConfigs.wati?.api_key;
  const isTrackingMoreConnected = apiConfigs.trackingmore?.enabled && apiConfigs.trackingmore?.api_key;

  return (
    <div className="space-y-6">
      {/* Shopify Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6" />
              <div>
                <CardTitle className="text-xl">Shopify Integration</CardTitle>
                <CardDescription>
                  Configure your Shopify store connection to fetch orders automatically
                </CardDescription>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isShopifyConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isShopifyConnected ? '✓ Connected' : '✗ Not Connected'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shopify-store-name">Store Name</Label>
              <Input
                id="shopify-store-name"
                placeholder="1i7whu-b1.myshopify.com"
                value={apiConfigs.shopify?.shop_url || ''}
                onChange={(e) =>
                  setApiConfigs(prev => ({
                    ...prev,
                    shopify: { ...prev.shopify, shop_url: e.target.value, enabled: true }
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="shopify-access-token">Access Token</Label>
              <Input
                id="shopify-access-token"
                type="password"
                placeholder="••••••••••••••••••••••••••••••••••••"
                value={apiConfigs.shopify?.access_token || ''}
                onChange={(e) =>
                  setApiConfigs(prev => ({
                    ...prev,
                    shopify: { ...prev.shopify, access_token: e.target.value, enabled: true }
                  }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="shopify-api-secret">API Secret (Optional)</Label>
            <Input
              id="shopify-api-secret"
              type="password"
              placeholder="Enter your Shopify API secret"
              value={apiConfigs.shopify?.webhook_secret || ''}
              onChange={(e) =>
                setApiConfigs(prev => ({
                  ...prev,
                  shopify: { ...prev.shopify, webhook_secret: e.target.value }
                }))
              }
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleTestConnection('Shopify')}
              disabled={!isShopifyConnected}
            >
              Test Connection
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[160px]"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button
              variant="outline"
              onClick={handleFetchOrders}
              disabled={!isShopifyConnected}
            >
              Fetch Orders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WATI Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6" />
              <div>
                <CardTitle className="text-xl">WATI Integration</CardTitle>
                <CardDescription>
                  Configure WATI for sending WhatsApp notifications to customers
                </CardDescription>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isWatiConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isWatiConnected ? '✓ Connected' : '✗ Not Connected'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="wati-api-key">API Key</Label>
            <Input
              id="wati-api-key"
              type="password"
              placeholder="Enter WATI API key"
              value={apiConfigs.wati?.api_key || ''}
              onChange={(e) =>
                setApiConfigs(prev => ({
                  ...prev,
                  wati: { ...prev.wati, api_key: e.target.value, enabled: true }
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="wati-base-url">Base URL</Label>
            <Input
              id="wati-base-url"
              placeholder="https://live-server-6371.wati.io"
              value={apiConfigs.wati?.base_url || 'https://live-server-6371.wati.io'}
              onChange={(e) =>
                setApiConfigs(prev => ({
                  ...prev,
                  wati: { ...prev.wati, base_url: e.target.value }
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Find your base URL in your WATI dashboard
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleTestConnection('WATI')}
              disabled={!isWatiConnected}
            >
              Test Connection
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[160px]"
            >
              {saving ? 'Saving...' : 'Save WATI Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TrackingMore Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Truck className="h-6 w-6" />
              <div>
                <CardTitle className="text-xl">TrackingMore Integration</CardTitle>
                <CardDescription>
                  Configure TrackingMore API for shipment tracking and delivery monitoring
                </CardDescription>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isTrackingMoreConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isTrackingMoreConnected ? '✓ Connected' : '✗ Not Connected'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="trackingmore-api-key">API Key</Label>
            <Input
              id="trackingmore-api-key"
              type="password"
              placeholder="Enter your TrackingMore API key"
              value={apiConfigs.trackingmore?.api_key || ''}
              onChange={(e) =>
                setApiConfigs(prev => ({
                  ...prev,
                  trackingmore: { ...prev.trackingmore, api_key: e.target.value, enabled: true }
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="trackingmore-base-url">Base URL</Label>
            <Input
              id="trackingmore-base-url"
              placeholder="https://api.trackingmore.com"
              value={apiConfigs.trackingmore?.base_url || 'https://api.trackingmore.com'}
              onChange={(e) =>
                setApiConfigs(prev => ({
                  ...prev,
                  trackingmore: { ...prev.trackingmore, base_url: e.target.value }
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Default TrackingMore API endpoint
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleTestConnection('TrackingMore')}
              disabled={!isTrackingMoreConnected}
            >
              Test Connection
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[160px]"
            >
              {saving ? 'Saving...' : 'Save TrackingMore Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiConfiguration;
