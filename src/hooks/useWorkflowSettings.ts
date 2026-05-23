import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const LABEL_TEMPLATE_KEY = 'default_label_template';
export const BYPASS_PACKING_KEY = 'bypass_packing_stage';
const SETTINGS_KEY = 'workflow_settings';
const QUERY_KEY = ['workflow-settings'] as const;

export interface WorkflowSettings {
  labelTemplate: string;
  bypassPacking: boolean;
  showProductsInThermalLabel: boolean;
}

const defaultWorkflowSettings: WorkflowSettings = {
  labelTemplate: 'thermal-4x6',
  bypassPacking: false,
  showProductsInThermalLabel: true,
};

const syncLocalStorage = (settings: WorkflowSettings) => {
  localStorage.setItem(LABEL_TEMPLATE_KEY, settings.labelTemplate);
  localStorage.setItem(BYPASS_PACKING_KEY, String(settings.bypassPacking));
};

const readFromLocalStorage = (): WorkflowSettings => ({
  labelTemplate: localStorage.getItem(LABEL_TEMPLATE_KEY) || defaultWorkflowSettings.labelTemplate,
  bypassPacking: localStorage.getItem(BYPASS_PACKING_KEY) === 'true',
  showProductsInThermalLabel: defaultWorkflowSettings.showProductsInThermalLabel,
});

const fetchSettings = async (): Promise<WorkflowSettings> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();

  if (!error && data?.value) {
    const merged = { ...defaultWorkflowSettings, ...(data.value as Partial<WorkflowSettings>) };
    syncLocalStorage(merged);
    return merged;
  }

  return readFromLocalStorage();
};

export const useWorkflowSettings = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // localStorage seed gives a synchronous first-render value — no
  // bypassPacking=default race when a dialog mounts before the DB query
  // resolves. Shared cache means every consumer sees the same value as
  // soon as the DB fetch (or a save) updates it.
  const { data: settings, isPending: loading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSettings,
    initialData: readFromLocalStorage,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Form draft — staging changes before the user clicks Save. Each consumer
  // gets its own draft (matching the previous API). Reset when the cached
  // settings change (e.g. another tab/save updated them).
  const [draft, setDraft] = useState<WorkflowSettings>(settings);
  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const save = async (nextSettings: WorkflowSettings) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', SETTINGS_KEY)
        .maybeSingle();

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

      syncLocalStorage(nextSettings);
      // Push the new value into the shared cache so every consumer
      // (Sidebar, ShippingLabelPreview, etc.) sees it immediately.
      queryClient.setQueryData(QUERY_KEY, nextSettings);
      setDraft(nextSettings);
      toast.success('Workflow settings saved');
    } catch (error: any) {
      toast.error(`Failed to save workflow settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return {
    settings: draft,
    setSettings: setDraft,
    save,
    loading,
    saving,
    refresh: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
};
