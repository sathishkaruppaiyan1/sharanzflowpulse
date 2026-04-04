import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FromAddress {
  store_name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
}

export const defaultFromAddress: FromAddress = {
  store_name: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: 'India',
  phone: '',
  email: '',
};

const SETTINGS_KEY = 'from_address';

export const useFromAddress = () => {
  const [fromAddress, setFromAddress] = useState<FromAddress>(defaultFromAddress);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTINGS_KEY)
        .single();

      if (!error && data?.value) {
        setFromAddress({ ...defaultFromAddress, ...(data.value as Partial<FromAddress>) });
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  const save = async (addr: FromAddress) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', SETTINGS_KEY)
        .single();

      const payload = { key: SETTINGS_KEY, value: addr as any, updated_at: new Date().toISOString() };

      const result = existing
        ? await supabase.from('system_settings').update(payload).eq('key', SETTINGS_KEY)
        : await supabase.from('system_settings').insert(payload);

      if (result.error) throw result.error;

      setFromAddress(addr);
      toast.success('Store address saved');
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { fromAddress, setFromAddress, save, saving, loading };
};
