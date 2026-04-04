import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const LABEL_TEMPLATE_KEY = 'default_label_template';
export const BYPASS_PACKING_KEY = 'bypass_packing_stage';
const SETTINGS_KEY = 'workflow_settings';

export interface WorkflowSettings {
  labelTemplate: string;
  bypassPacking: boolean;
}

const defaultWorkflowSettings: WorkflowSettings = {
  labelTemplate: 'thermal-4x6',
  bypassPacking: false,
};

const syncLocalStorage = (settings: WorkflowSettings) => {
  localStorage.setItem(LABEL_TEMPLATE_KEY, settings.labelTemplate);
  localStorage.setItem(BYPASS_PACKING_KEY, String(settings.bypassPacking));
};

export const useWorkflowSettings = () => {
  const [settings, setSettings] = useState<WorkflowSettings>(defaultWorkflowSettings);
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
        const dbSettings = data.value as Partial<WorkflowSettings>;
        const mergedSettings = { ...defaultWorkflowSettings, ...dbSettings };
        setSettings(mergedSettings);
        syncLocalStorage(mergedSettings);
      } else {
        const localSettings = {
          labelTemplate: localStorage.getItem(LABEL_TEMPLATE_KEY) || defaultWorkflowSettings.labelTemplate,
          bypassPacking: localStorage.getItem(BYPASS_PACKING_KEY) === 'true',
        };
        setSettings(localSettings);
        syncLocalStorage(localSettings);
      }
    } catch {
      const localSettings = {
        labelTemplate: localStorage.getItem(LABEL_TEMPLATE_KEY) || defaultWorkflowSettings.labelTemplate,
        bypassPacking: localStorage.getItem(BYPASS_PACKING_KEY) === 'true',
      };
      setSettings(localSettings);
      syncLocalStorage(localSettings);
    } finally {
      setLoading(false);
    }
  };

  const save = async (nextSettings: WorkflowSettings) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', SETTINGS_KEY)
        .single();

      const payload = {
        key: SETTINGS_KEY,
        value: nextSettings as any,
        updated_at: new Date().toISOString(),
      };

      const result = existing
        ? await supabase.from('system_settings').update(payload).eq('key', SETTINGS_KEY)
        : await supabase.from('system_settings').insert(payload);

      if (result.error) {
        throw result.error;
      }

      setSettings(nextSettings);
      syncLocalStorage(nextSettings);
      toast.success('Workflow settings saved');
    } catch (error: any) {
      toast.error(`Failed to save workflow settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return {
    settings,
    setSettings,
    save,
    loading,
    saving,
    refresh: load,
  };
};
