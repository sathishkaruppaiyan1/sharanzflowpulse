import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ApiConfigs, useApiConfigs } from '@/hooks/useApiConfigs';
import { Package } from 'lucide-react';
import ParcelPanelSync from './ParcelPanelSync';

const ApiConfiguration = () => {
  const { apiConfigs, setApiConfigs, saveConfigs, loading, saving } = useApiConfigs();
  const { toast } = useToast();
  const [tempConfigs, setTempConfigs] = useState<ApiConfigs>(apiConfigs);

  useEffect(() => {
    setTempConfigs(apiConfigs);
  }, [apiConfigs]);

  const handleSave = async () => {
    try {
      await saveConfigs(tempConfigs);
      toast({
        title: "Success",
        description: "API configurations saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save API configurations",
        variant: "destructive",
      });
    }
  };

  const handleTest = async (configType: keyof ApiConfigs) => {
    if (configType === 'shopify') {
      toast({
        title: "Shopify Test",
        description: "Shopify test is not implemented yet.",
      });
    } else if (configType === 'interakt') {
      toast({
        title: "Interakt Test",
        description: "Interakt test is not implemented yet.",
      });
    } else if (configType === 'parcel_panel') {
      // Implement Parcel Panel test logic here
      toast({
        title: "Parcel Panel Test",
        description: "Parcel Panel test is not implemented yet.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Configuration</h2>
      </div>

      <div className="grid gap-6">
        {/* Shopify Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Shopify Configuration</CardTitle>
            <CardDescription>
              Configure Shopify API for order and product synchronization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="shopify-enabled"
                checked={tempConfigs.shopify.enabled}
                onCheckedChange={(checked) =>
                  setTempConfigs(prev => ({
                    ...prev,
                    shopify: { ...prev.shopify, enabled: checked }
                  }))
                }
              />
              <Label htmlFor="shopify-enabled">Enable Shopify Integration</Label>
            </div>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="shopify-shop-url">Shop URL</Label>
                <Input
                  id="shopify-shop-url"
                  placeholder="your-shop-name.myshopify.com"
                  value={tempConfigs.shopify.shop_url}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, shop_url: e.target.value }
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="shopify-access-token">Access Token</Label>
                <Input
                  id="shopify-access-token"
                  type="password"
                  placeholder="Enter your Shopify access token"
                  value={tempConfigs.shopify.access_token}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, access_token: e.target.value }
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="shopify-webhook-secret">Webhook Secret</Label>
                <Input
                  id="shopify-webhook-secret"
                  type="password"
                  placeholder="Enter your Shopify webhook secret"
                  value={tempConfigs.shopify.webhook_secret}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, webhook_secret: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parcel Panel Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Parcel Panel Configuration
            </CardTitle>
            <CardDescription>
              Configure Parcel Panel API for package tracking and delivery management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="parcel-panel-enabled"
                checked={tempConfigs.parcel_panel.enabled}
                onCheckedChange={(checked) =>
                  setTempConfigs(prev => ({
                    ...prev,
                    parcel_panel: { ...prev.parcel_panel, enabled: checked }
                  }))
                }
              />
              <Label htmlFor="parcel-panel-enabled">Enable Parcel Panel Integration</Label>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="parcel-panel-api-key">API Key</Label>
                <Input
                  id="parcel-panel-api-key"
                  type="password"
                  placeholder="Enter your Parcel Panel API key (default: 873f13e0-846d-4274-b401-8fdce3ff5e6c)"
                  value={tempConfigs.parcel_panel.api_key}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      parcel_panel: { ...prev.parcel_panel, api_key: e.target.value }
                    }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="parcel-panel-base-url">Base URL</Label>
                <Input
                  id="parcel-panel-base-url"
                  placeholder="https://open.parcelpanel.com"
                  value={tempConfigs.parcel_panel.base_url}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      parcel_panel: { ...prev.parcel_panel, base_url: e.target.value }
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Default endpoint: /api/v2/tracking/order (GET method)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NEW: Parcel Panel Data Sync */}
        <ParcelPanelSync />

        {/* Interakt Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Interakt Configuration</CardTitle>
            <CardDescription>
              Configure Interakt API for customer communication and engagement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="interakt-enabled"
                checked={tempConfigs.interakt.enabled}
                onCheckedChange={(checked) =>
                  setTempConfigs(prev => ({
                    ...prev,
                    interakt: { ...prev.interakt, enabled: checked }
                  }))
                }
              />
              <Label htmlFor="interakt-enabled">Enable Interakt Integration</Label>
            </div>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="interakt-api-key">API Key</Label>
                <Input
                  id="interakt-api-key"
                  type="password"
                  placeholder="Enter your Interakt API key"
                  value={tempConfigs.interakt.api_key}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      interakt: { ...prev.interakt, api_key: e.target.value }
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="interakt-base-url">Base URL</Label>
                <Input
                  id="interakt-base-url"
                  placeholder="https://api.interakt.ai"
                  value={tempConfigs.interakt.base_url}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      interakt: { ...prev.interakt, base_url: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="ghost">Cancel</Button>
        <Button
          disabled={loading}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default ApiConfiguration;
