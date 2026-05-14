import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ApiConfigs, InteraktTemplate, useApiConfigs } from '@/hooks/useApiConfigs';
import { Package, Plus, Trash2, MessageSquare, Send, Loader2 } from 'lucide-react';
import ParcelPanelSync from './ParcelPanelSync';
import { sendWhatsAppMessage } from '@/services/interakt/interaktApiClient';

const EXAMPLE_TEMPLATE_BODY = `Hello {{4}}!
Your order with us is on its way! Here are the tracking details:
Order ID: {{1}}
Tracking ID: {{2}}
Courier: {{3}}
Thank you for shopping with us!`;

// Extract distinct {{N}} placeholders from a template body, sorted ascending.
const extractPlaceholders = (body: string): number[] => {
  const matches = body.matchAll(/\{\{\s*(\d+)\s*\}\}/g);
  const nums = new Set<number>();
  for (const m of matches) nums.add(parseInt(m[1], 10));
  return Array.from(nums).sort((a, b) => a - b);
};

const ApiConfiguration = () => {
  const { apiConfigs, setApiConfigs, saveConfigs, loading, saving } = useApiConfigs();
  const { toast } = useToast();
  const [tempConfigs, setTempConfigs] = useState<ApiConfigs>(apiConfigs);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');

  // Test-send state
  const [testPhone, setTestPhone] = useState('');
  const [testTemplateName, setTestTemplateName] = useState('');
  const [testValues, setTestValues] = useState<string[]>([]);
  const [sendingTest, setSendingTest] = useState(false);

  // When the user picks a different template, prime test values from
  // placeholders detected in the body. If no placeholders are detected, start
  // empty — the user can add the parameter count manually below.
  useEffect(() => {
    if (!testTemplateName) {
      setTestValues([]);
      return;
    }
    const tpl = (tempConfigs.interakt.templates || []).find(t => t.name === testTemplateName);
    const placeholders = tpl ? extractPlaceholders(tpl.body) : [];
    if (placeholders.length > 0) {
      const maxN = Math.max(...placeholders);
      setTestValues(Array.from({ length: maxN }, (_, i) => `Test${i + 1}`));
    } else {
      setTestValues([]);
    }
  }, [testTemplateName, tempConfigs.interakt.templates]);

  const setTestValueAt = (idx: number, value: string) => {
    setTestValues(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const setTestParamCount = (count: number) => {
    setTestValues(prev => {
      const safe = Math.max(0, Math.min(20, count));
      const next = Array.from({ length: safe }, (_, i) => prev[i] ?? `Test${i + 1}`);
      return next;
    });
  };

  // Templates persist immediately so users don't have to click "Save Changes"
  // separately. saveConfigs handles its own success / error toasts.
  const handleAddTemplate = async () => {
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

    const nextConfigs: ApiConfigs = {
      ...tempConfigs,
      interakt: {
        ...tempConfigs.interakt,
        templates: [...existing, { name, body }],
      },
    };
    setTempConfigs(nextConfigs);
    setNewTemplateName('');
    setNewTemplateBody('');
    await saveConfigs(nextConfigs);
  };

  const handleRemoveTemplate = async (name: string) => {
    const nextConfigs: ApiConfigs = {
      ...tempConfigs,
      interakt: {
        ...tempConfigs.interakt,
        templates: (tempConfigs.interakt.templates || []).filter(t => t.name !== name),
      },
    };
    setTempConfigs(nextConfigs);
    await saveConfigs(nextConfigs);
  };

  const handleSendTest = async () => {
    const phone = testPhone.trim();
    const tplName = testTemplateName.trim();
    const apiKey = tempConfigs.interakt.api_key;
    const baseUrl = tempConfigs.interakt.base_url;

    if (!phone) {
      toast({ title: 'Phone number required', description: 'Enter the recipient phone (with country code).', variant: 'destructive' });
      return;
    }
    if (!tplName) {
      toast({ title: 'Template required', description: 'Pick or enter a template name to test.', variant: 'destructive' });
      return;
    }
    if (!apiKey || !baseUrl) {
      toast({ title: 'Interakt not configured', description: 'Save API key and Base URL before testing.', variant: 'destructive' });
      return;
    }

    // Build parameter list from the editable test values. Position N maps to
    // Interakt placeholder {{N+1}} (the API uses positional bodyValues).
    const parameters = testValues.map((value, i) => ({ name: String(i + 1), value }));

    setSendingTest(true);
    try {
      const ok = await sendWhatsAppMessage(phone, { templateName: tplName, parameters }, apiKey, baseUrl);
      if (ok) {
        toast({
          title: 'Test sent',
          description: `WhatsApp template "${tplName}" delivered to ${phone}. Check the device.`,
        });
      } else {
        toast({
          title: 'Test failed',
          description: 'Interakt rejected the request. Check the console for details (template approval status, parameter count, phone format).',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Test error',
        description: err?.message || 'Unexpected error sending test message.',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
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
              </div>

              {/* Test send */}
              <div className="pt-4 border-t">
                <div className="flex items-center mb-2">
                  <Send className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">Test WhatsApp Send</Label>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Send a real WhatsApp message to verify your Interakt setup. Placeholder values are filled with <code className="bg-muted px-1 rounded">Test1</code>, <code className="bg-muted px-1 rounded">Test2</code>... automatically.
                </p>

                <div className="grid gap-2">
                  <div>
                    <Label htmlFor="test-phone" className="text-sm">Phone Number</Label>
                    <Input
                      id="test-phone"
                      placeholder="91XXXXXXXXXX (include country code, no + or spaces)"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-template" className="text-sm">Template</Label>
                    {(tempConfigs.interakt.templates || []).length > 0 ? (
                      <select
                        id="test-template"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={testTemplateName}
                        onChange={(e) => setTestTemplateName(e.target.value)}
                      >
                        <option value="">— Pick a saved template —</option>
                        {(tempConfigs.interakt.templates || []).map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="test-template"
                        placeholder="Enter approved template name"
                        value={testTemplateName}
                        onChange={(e) => setTestTemplateName(e.target.value)}
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="test-param-count" className="text-sm">Number of parameters</Label>
                      <Input
                        id="test-param-count"
                        type="number"
                        min={0}
                        max={20}
                        value={testValues.length}
                        onChange={(e) => setTestParamCount(parseInt(e.target.value || '0', 10))}
                        className="w-20 h-8 text-right"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Match this to how many <code>{'{{N}}'}</code> placeholders your Interakt template was approved with. The error "expected number of values are 4" means set this to 4.
                    </p>
                  </div>

                  {testValues.length > 0 && (
                    <div className="grid gap-2 bg-muted/30 rounded-md p-3">
                      {testValues.map((value, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{`{{${i + 1}}}`}</span>
                          <Input
                            value={value}
                            onChange={(e) => setTestValueAt(i, e.target.value)}
                            placeholder={`Value for {{${i + 1}}}`}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleSendTest}
                    disabled={sendingTest}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {sendingTest ? (
                      <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Sending...</>
                    ) : (
                      <><Send className="mr-1 h-4 w-4" />Send Test Message</>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Uses the current API Key & Base URL above (no need to save first).
                  </p>
                </div>
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
