
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { useToast } from '@/hooks/use-toast';

const ApiConfiguration = () => {
  const { apiConfigs, setApiConfigs, saveConfigs, loading, saving } = useApiConfigs();
  const { toast } = useToast();

  const handleConfigChange = (service: string, field: string, value: string | boolean) => {
    setApiConfigs(prev => ({
      ...prev,
      [service]: {
        ...prev[service as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    await saveConfigs(apiConfigs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shopify Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Shopify Integration
            <Switch
              checked={apiConfigs.shopify.enabled}
              onCheckedChange={(checked) => handleConfigChange('shopify', 'enabled', checked)}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shopify-shop-url">Shop URL</Label>
            <Input
              id="shopify-shop-url"
              placeholder="your-shop.myshopify.com"
              value={apiConfigs.shopify.shop_url}
              onChange={(e) => handleConfigChange('shopify', 'shop_url', e.target.value)}
              disabled={!apiConfigs.shopify.enabled}
            />
          </div>
          <div>
            <Label htmlFor="shopify-access-token">Access Token</Label>
            <Input
              id="shopify-access-token"
              type="password"
              placeholder="shpat_..."
              value={apiConfigs.shopify.access_token}
              onChange={(e) => handleConfigChange('shopify', 'access_token', e.target.value)}
              disabled={!apiConfigs.shopify.enabled}
            />
          </div>
          <div>
            <Label htmlFor="shopify-webhook-secret">Webhook Secret</Label>
            <Input
              id="shopify-webhook-secret"
              type="password"
              placeholder="Webhook secret"
              value={apiConfigs.shopify.webhook_secret}
              onChange={(e) => handleConfigChange('shopify', 'webhook_secret', e.target.value)}
              disabled={!apiConfigs.shopify.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interakt Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Interakt Integration
            <Switch
              checked={apiConfigs.interakt.enabled}
              onCheckedChange={(checked) => handleConfigChange('interakt', 'enabled', checked)}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="interakt-api-key">API Key</Label>
            <Input
              id="interakt-api-key"
              type="password"
              placeholder="Your Interakt API key"
              value={apiConfigs.interakt.api_key}
              onChange={(e) => handleConfigChange('interakt', 'api_key', e.target.value)}
              disabled={!apiConfigs.interakt.enabled}
            />
          </div>
          <div>
            <Label htmlFor="interakt-base-url">Base URL</Label>
            <Input
              id="interakt-base-url"
              placeholder="https://api.interakt.ai"
              value={apiConfigs.interakt.base_url}
              onChange={(e) => handleConfigChange('interakt', 'base_url', e.target.value)}
              disabled={!apiConfigs.interakt.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Parcel Panel Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Parcel Panel Integration
            <Switch
              checked={apiConfigs.parcel_panel.enabled}
              onCheckedChange={(checked) => handleConfigChange('parcel_panel', 'enabled', checked)}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="parcel-panel-api-key">API Key</Label>
            <Input
              id="parcel-panel-api-key"
              type="password"
              placeholder="Your Parcel Panel API key"
              value={apiConfigs.parcel_panel.api_key}
              onChange={(e) => handleConfigChange('parcel_panel', 'api_key', e.target.value)}
              disabled={!apiConfigs.parcel_panel.enabled}
            />
          </div>
          <div>
            <Label htmlFor="parcel-panel-base-url">Base URL</Label>
            <Input
              id="parcel-panel-base-url"
              placeholder="https://open.parcelpanel.com/api/v2/tracking/order"
              value={apiConfigs.parcel_panel.base_url}
              onChange={(e) => handleConfigChange('parcel_panel', 'base_url', e.target.value)}
              disabled={!apiConfigs.parcel_panel.enabled}
            />
          </div>
          <p className="text-sm text-gray-600">
            Parcel Panel provides comprehensive tracking for shipments and delivery monitoring.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Configurations
          </>
        )}
      </Button>
    </div>
  );
};

export default ApiConfiguration;

