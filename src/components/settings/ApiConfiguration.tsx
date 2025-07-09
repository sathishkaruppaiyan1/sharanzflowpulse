import React, { useState } from 'react';
import { Settings, Eye, EyeOff, Save, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useApiConfigs } from '@/hooks/useApiConfigs';

const ApiConfiguration = () => {
  const { apiConfigs, setApiConfigs, saveConfigs, loading, saving } = useApiConfigs();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleInputChange = (section: string, field: string, value: string | boolean, subsection?: string) => {
    setApiConfigs(prev => {
      const newConfig = { ...prev };
      if (subsection) {
        newConfig[section][subsection][field] = value;
      } else {
        newConfig[section][field] = value;
      }
      return newConfig;
    });
  };

  const handleSaveConfig = () => {
    saveConfigs(apiConfigs);
  };

  const isConfigured = (config: any) => {
    if (typeof config === 'object' && config !== null) {
      return Object.values(config).some(value => 
        typeof value === 'string' ? value.trim() !== '' : Boolean(value)
      );
    }
    return false;
  };

  const ConnectionStatus = ({ connected, label }: { connected: boolean; label: string }) => (
    <div className="flex items-center space-x-2">
      {connected ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Connected
          </Badge>
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4 text-red-600" />
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Not Connected
          </Badge>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading API configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shopify Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-green-600" />
              <CardTitle>Shopify Integration</CardTitle>
            </div>
            <ConnectionStatus 
              connected={isConfigured(apiConfigs.shopify)} 
              label="Shopify" 
            />
          </div>
          <CardDescription>
            Connect your Shopify store to sync orders and customer data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shopify-url">Shop URL</Label>
              <Input
                id="shopify-url"
                placeholder="your-shop.myshopify.com"
                value={apiConfigs.shopify.shop_url}
                onChange={(e) => handleInputChange('shopify', 'shop_url', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shopify-token">Access Token</Label>
              <div className="relative">
                <Input
                  id="shopify-token"
                  type={showSecrets.shopify_token ? "text" : "password"}
                  placeholder="shpat_xxxxxxxxxxxxxxxx"
                  value={apiConfigs.shopify.access_token}
                  onChange={(e) => handleInputChange('shopify', 'access_token', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('shopify_token')}
                >
                  {showSecrets.shopify_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="shopify-webhook">Webhook Secret</Label>
            <div className="relative">
              <Input
                id="shopify-webhook"
                type={showSecrets.shopify_webhook ? "text" : "password"}
                placeholder="Webhook verification secret"
                value={apiConfigs.shopify.webhook_secret}
                onChange={(e) => handleInputChange('shopify', 'webhook_secret', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleSecretVisibility('shopify_webhook')}
              >
                {showSecrets.shopify_webhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Business API */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-green-500" />
              <CardTitle>WhatsApp Business API</CardTitle>
            </div>
            <ConnectionStatus 
              connected={isConfigured(apiConfigs.whatsapp)} 
              label="WhatsApp" 
            />
          </div>
          <CardDescription>
            Send order updates and notifications via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wa-phone-id">Phone Number ID</Label>
              <Input
                id="wa-phone-id"
                placeholder="123456789012345"
                value={apiConfigs.whatsapp.phone_number_id}
                onChange={(e) => handleInputChange('whatsapp', 'phone_number_id', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="wa-access-token">Access Token</Label>
              <div className="relative">
                <Input
                  id="wa-access-token"
                  type={showSecrets.wa_token ? "text" : "password"}
                  placeholder="EAAxxxxxxxxxx"
                  value={apiConfigs.whatsapp.access_token}
                  onChange={(e) => handleInputChange('whatsapp', 'access_token', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('wa_token')}
                >
                  {showSecrets.wa_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wa-verify-token">Verify Token</Label>
              <Input
                id="wa-verify-token"
                placeholder="your-verify-token"
                value={apiConfigs.whatsapp.verify_token}
                onChange={(e) => handleInputChange('whatsapp', 'verify_token', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="wa-app-secret">App Secret</Label>
              <div className="relative">
                <Input
                  id="wa-app-secret"
                  type={showSecrets.wa_secret ? "text" : "password"}
                  placeholder="App secret for webhook verification"
                  value={apiConfigs.whatsapp.app_secret}
                  onChange={(e) => handleInputChange('whatsapp', 'app_secret', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('wa_secret')}
                >
                  {showSecrets.wa_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Partners */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <CardTitle>Delivery Partners</CardTitle>
          </div>
          <CardDescription>
            Configure delivery partner APIs for order fulfillment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* French Express */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">French Express</h4>
              <ConnectionStatus 
                connected={isConfigured(apiConfigs.delivery.frenchexpress)} 
                label="French Express" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fe-api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="fe-api-key"
                    type={showSecrets.fe_api ? "text" : "password"}
                    placeholder="French Express API Key"
                    value={apiConfigs.delivery.frenchexpress.api_key}
                    onChange={(e) => handleInputChange('delivery', 'api_key', e.target.value, 'frenchexpress')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleSecretVisibility('fe_api')}
                  >
                    {showSecrets.fe_api ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fe-secret-key">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="fe-secret-key"
                    type={showSecrets.fe_secret ? "text" : "password"}
                    placeholder="French Express Secret Key"
                    value={apiConfigs.delivery.frenchexpress.secret_key}
                    onChange={(e) => handleInputChange('delivery', 'secret_key', e.target.value, 'frenchexpress')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleSecretVisibility('fe_secret')}
                  >
                    {showSecrets.fe_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delhivery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Delhivery</h4>
              <ConnectionStatus 
                connected={isConfigured(apiConfigs.delivery.delhivery)} 
                label="Delhivery" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delhivery-api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="delhivery-api-key"
                    type={showSecrets.delhivery_api ? "text" : "password"}
                    placeholder="Delhivery API Key"
                    value={apiConfigs.delivery.delhivery.api_key}
                    onChange={(e) => handleInputChange('delivery', 'api_key', e.target.value, 'delhivery')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleSecretVisibility('delhivery_api')}
                  >
                    {showSecrets.delhivery_api ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={apiConfigs.delivery.delhivery.staging_mode}
                    onCheckedChange={(checked) => handleInputChange('delivery', 'staging_mode', checked, 'delhivery')}
                  />
                  <Label>Staging Mode</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveConfig} 
          disabled={saving}
          className="flex items-center space-x-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save All Configurations</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ApiConfiguration;
