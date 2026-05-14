import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ApiConfigs, InteraktTemplate, useApiConfigs } from '@/hooks/useApiConfigs';
import { Package, Plus, Trash2, MessageSquare, Copy } from 'lucide-react';
import ParcelPanelSync from './ParcelPanelSync';

const EXAMPLE_TEMPLATE_NAME = 'order_tracking_information';
const EXAMPLE_TEMPLATE_BODY = `Hello {{4}}!
Your order with us is on its way! Here are the tracking details:
Order ID: {{1}}
Tracking ID: {{2}}
Courier: {{3}}
Thank you for shopping with us!`;

const ApiConfiguration = () => {
  const { apiConfigs, setApiConfigs, saveConfigs, loading, saving } = useApiConfigs();
  const { toast } = useToast();
  const [tempConfigs, setTempConfigs] = useState<ApiConfigs>(apiConfigs);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');

  const handleAddTemplate = () => {
    const name = newTemplateName.trim();
    const body = newTemplateBody.trim();
    if (!name) {
      toast({
        title: "Template name required",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }
    const existing = tempConfigs.interakt.templates || [];
    if (existing.some(t => t.name === name)) {
      toast({
        title: "Duplicate template",
        description: `"${name}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    setTempConfigs(prev => ({
      ...prev,
      interakt: {
        ...prev.interakt,
        templates: [...(prev.interakt.templates || []), { name, body }]
      }
    }));
    setNewTemplateName('');
    setNewTemplateBody('');
  };

  const handleRemoveTemplate = (name: string) => {
    setTempConfigs(prev => ({
      ...prev,
      interakt: {
        ...prev.interakt,
        templates: (prev.interakt.templates || []).filter(t => t.name !== name)
      }
    }));
  };

  const handleUseExample = () => {
    setNewTemplateName(EXAMPLE_TEMPLATE_NAME);
    setNewTemplateBody(EXAMPLE_TEMPLATE_BODY);
  };

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
                <Label htmlFor="shopify-client-id">API Key (Client ID)</Label>
                <Input
                  id="shopify-client-id"
                  placeholder="Enter your Shopify API Key"
                  value={tempConfigs.shopify.client_id}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, client_id: e.target.value }
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Found in your Shopify app → API credentials → API key
                </p>
              </div>
              <div>
                <Label htmlFor="shopify-client-secret">API Secret Key (Client Secret)</Label>
                <Input
                  id="shopify-client-secret"
                  type="password"
                  placeholder="Enter your Shopify API Secret Key"
                  value={tempConfigs.shopify.client_secret}
                  onChange={(e) =>
                    setTempConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, client_secret: e.target.value }
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Found in your Shopify app → API credentials → API secret key
                </p>
              </div>
              <div>
                <Label htmlFor="shopify-access-token">Access Token (optional — leave blank to use Client Credentials)</Label>
                <Input
                  id="shopify-access-token"
                  type="password"
                  placeholder="shpat_xxxx — leave blank if using API Key + Secret"
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

              <div className="pt-4 border-t">
                <div className="flex items-center mb-2">
                  <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">WhatsApp Templates</Label>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Add the templates you have approved in Interakt. Use <code className="bg-muted px-1 rounded">{'{{1}}'}</code>, <code className="bg-muted px-1 rounded">{'{{2}}'}</code>, ... as placeholders for dynamic values (order ID, tracking ID, etc.).
                </p>

                {/* Example block */}
                <div className="rounded-md border bg-blue-50 border-blue-200 p-3 mb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs font-semibold text-blue-900">Example template</p>
                      <p className="text-xs text-blue-800 font-mono">{EXAMPLE_TEMPLATE_NAME}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-7 text-xs"
                      onClick={handleUseExample}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Use this example
                    </Button>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap text-blue-900 bg-white/60 rounded p-2 border border-blue-100">{EXAMPLE_TEMPLATE_BODY}</pre>
                  <p className="text-[11px] text-blue-800 mt-2">
                    Placeholders → <code>{'{{1}}'}</code> Order ID · <code>{'{{2}}'}</code> Tracking ID · <code>{'{{3}}'}</code> Courier · <code>{'{{4}}'}</code> Customer name
                  </p>
                </div>

                <div className="space-y-2 mb-3">
                  <div>
                    <Label htmlFor="new-template-name" className="text-sm">Template Name</Label>
                    <Input
                      id="new-template-name"
                      placeholder="e.g. order_tracking_information"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-template-body" className="text-sm">Template Body</Label>
                    <Textarea
                      id="new-template-body"
                      rows={5}
                      placeholder={EXAMPLE_TEMPLATE_BODY}
                      value={newTemplateBody}
                      onChange={(e) => setNewTemplateBody(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Must match exactly what was approved in Interakt.
                    </p>
                  </div>
                  <Button type="button" onClick={handleAddTemplate} className="w-full">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Template
                  </Button>
                </div>

                {(tempConfigs.interakt.templates || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-md p-4 text-center">
                    No templates added yet.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {(tempConfigs.interakt.templates || []).map((tpl: InteraktTemplate) => (
                      <li
                        key={tpl.name}
                        className="bg-muted/30 rounded-md px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-medium">{tpl.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTemplate(tpl.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        {tpl.body && (
                          <pre className="text-xs whitespace-pre-wrap text-muted-foreground mt-1 bg-white/60 rounded p-2 border">{tpl.body}</pre>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Don't forget to click "Save Changes" below to persist your templates.
                </p>
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
