
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ApiConfigs {
  shopify: {
    enabled: boolean;
    shop_url: string;
    access_token: string;
    webhook_secret: string;
  };
  whatsapp: {
    enabled: boolean;
    phone_number_id: string;
    access_token: string;
    verify_token: string;
    app_secret: string;
  };
  delivery: {
    frenchexpress: {
      enabled: boolean;
      api_key: string;
      secret_key: string;
    };
    delhivery: {
      enabled: boolean;
      api_key: string;
      staging_mode: boolean;
    };
  };
}

const defaultConfigs: ApiConfigs = {
  shopify: {
    enabled: false,
    shop_url: '',
    access_token: '',
    webhook_secret: ''
  },
  whatsapp: {
    enabled: false,
    phone_number_id: '',
    access_token: '',
    verify_token: '',
    app_secret: ''
  },
  delivery: {
    frenchexpress: {
      enabled: false,
      api_key: '',
      secret_key: ''
    },
    delhivery: {
      enabled: false,
      api_key: '',
      staging_mode: true
    }
  }
};

export const useApiConfigs = () => {
  const [apiConfigs, setApiConfigs] = useState<ApiConfigs>(defaultConfigs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load configurations from Supabase
  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['api_configs']);

      if (error) {
        console.error('Error loading API configs:', error);
        return;
      }

      if (data && data.length > 0) {
        const configData = data[0].value as ApiConfigs;
        setApiConfigs(configData);
      }
    } catch (error) {
      console.error('Error loading API configs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save configurations to Supabase
  const saveConfigs = async (configs: ApiConfigs) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'api_configs',
          value: configs,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      setApiConfigs(configs);
      toast({
        title: "Success",
        description: "API configurations saved successfully",
      });
    } catch (error) {
      console.error('Error saving API configs:', error);
      toast({
        title: "Error",
        description: "Failed to save API configurations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  return {
    apiConfigs,
    setApiConfigs,
    saveConfigs,
    loading,
    saving,
    refreshConfigs: loadConfigs
  };
};
