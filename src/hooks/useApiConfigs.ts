

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
  interakt: {
    enabled: boolean;
    api_key: string;
    base_url: string;
  };
  parcel_panel: {
    enabled: boolean;
    api_key: string;
    base_url: string;
  };
}

const defaultConfigs: ApiConfigs = {
  shopify: {
    enabled: false,
    shop_url: '',
    access_token: '',
    webhook_secret: ''
  },
  interakt: {
    enabled: false,
    api_key: '',
    base_url: 'https://api.interakt.ai'
  },
  parcel_panel: {
    enabled: false,
    api_key: '',
    base_url: 'https://open.parcelpanel.com'
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
        .eq('key', 'api_configs')
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error loading API configs:', error);
        }
        // Use default configs if not found
        setApiConfigs(defaultConfigs);
      } else if (data && data.value) {
        // Merge with defaults to ensure all properties exist
        const configData = data.value as unknown as Partial<ApiConfigs>;
        
        // Fix incorrect base URL if it exists
        let parcelPanelBaseUrl = configData.parcel_panel?.base_url || 'https://open.parcelpanel.com';
        console.log('Original Parcel Panel base URL from database:', parcelPanelBaseUrl);
        
        if (parcelPanelBaseUrl.includes('/api/v2/tracking/order')) {
          console.log('Fixing incorrect Parcel Panel base URL from:', parcelPanelBaseUrl);
          parcelPanelBaseUrl = 'https://open.parcelpanel.com';
          console.log('Fixed Parcel Panel base URL to:', parcelPanelBaseUrl);
        }
        
        const mergedConfigs: ApiConfigs = {
          shopify: { ...defaultConfigs.shopify, ...configData.shopify },
          interakt: { ...defaultConfigs.interakt, ...configData.interakt },
          parcel_panel: { 
            ...defaultConfigs.parcel_panel, 
            ...configData.parcel_panel,
            // Use the corrected base URL
            base_url: parcelPanelBaseUrl
          }
        };
        console.log('Loaded API configs from database:', mergedConfigs);
        setApiConfigs(mergedConfigs);
        
        // If we fixed the base URL, save it back to the database
        if (parcelPanelBaseUrl !== configData.parcel_panel?.base_url) {
          console.log('Auto-saving corrected Parcel Panel base URL to database');
          // Use setTimeout to avoid blocking the initial load
          setTimeout(() => {
            saveConfigs(mergedConfigs);
          }, 100);
        }
      } else {
        setApiConfigs(defaultConfigs);
      }
    } catch (error) {
      console.error('Error loading API configs:', error);
      setApiConfigs(defaultConfigs);
    } finally {
      setLoading(false);
    }
  };

  // Save configurations to Supabase
  const saveConfigs = async (configs: ApiConfigs) => {
    setSaving(true);
    try {
      // First check if record exists
      const { data: existingData } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'api_configs')
        .single();

      let result;
      if (existingData) {
        // Update existing record
        result = await supabase
          .from('system_settings')
          .update({
            value: configs as any,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'api_configs');
      } else {
        // Insert new record
        result = await supabase
          .from('system_settings')
          .insert({
            key: 'api_configs',
            value: configs as any,
            updated_at: new Date().toISOString()
          });
      }

      if (result.error) {
        throw result.error;
      }

      setApiConfigs(configs);
      console.log('Saved API configs:', configs);
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

