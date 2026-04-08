import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CourierPartner {
  id: string;
  name: string;
  code: string;
  tracking_url: string | null;
  tracking_prefix: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export const useCourierPartners = (activeOnly = true) => {
  return useQuery<CourierPartner[]>({
    queryKey: ['courier_partners', activeOnly],
    queryFn: async () => {
      let q = (supabase as any)
        .from('courier_partners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as CourierPartner[]) || [];
    },
  });
};

// ── Add ──────────────────────────────────────────────────────────────────────

export const useAddCourierPartner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<CourierPartner, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await (supabase as any)
        .from('courier_partners')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier_partners'] });
      toast.success('Courier added successfully');
    },
    onError: (e: any) => toast.error(`Failed to add courier: ${e.message}`),
  });
};

// ── Update ───────────────────────────────────────────────────────────────────

export const useUpdateCourierPartner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<CourierPartner> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('courier_partners')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier_partners'] });
      toast.success('Courier updated');
    },
    onError: (e: any) => toast.error(`Failed to update: ${e.message}`),
  });
};

// ── Delete (soft) ────────────────────────────────────────────────────────────

export const useDeleteCourierPartner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('courier_partners')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier_partners'] });
      toast.success('Courier removed');
    },
    onError: (e: any) => toast.error(`Failed to remove: ${e.message}`),
  });
};

// ── Helper ───────────────────────────────────────────────────────────────────

/** Auto-detect courier by matching tracking number prefix against the list.
 *  Comparison is case-insensitive. Longest prefix wins. */
export const detectCourierByPrefix = (
  trackingNumber: string,
  couriers: CourierPartner[]
): CourierPartner | null => {
  const tn = trackingNumber.trim().toUpperCase();
  return (
    couriers
      .filter((c) => c.tracking_prefix && c.is_active)
      .sort((a, b) => (b.tracking_prefix?.length ?? 0) - (a.tracking_prefix?.length ?? 0))
      .find((c) => tn.startsWith(c.tracking_prefix!.toUpperCase())) ?? null
  );
};

/** Build the tracking URL for a given courier and tracking number */
export const buildTrackingUrl = (
  trackingNumber: string,
  trackingUrl: string | null
): string => {
  if (!trackingUrl) return '';
  return trackingUrl.replace('{number}', trackingNumber);
};
