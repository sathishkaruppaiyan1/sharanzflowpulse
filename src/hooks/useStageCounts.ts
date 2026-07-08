import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrderStage } from '@/types/database';

export interface StageCounts {
  printing: number;
  packing: number;
  tracking: number;
  shipped: number;
  hold: number;
  pending: number;
  delivered: number;
  active: number; // everything except delivered
}

const STAGES: OrderStage[] = ['pending', 'hold', 'printing', 'packing', 'tracking', 'shipped', 'delivered'];

// Fallback: one head-count request per stage. Used only if the aggregate RPC
// is unavailable (e.g. migration not yet deployed).
const fetchCountsPerStage = async (): Promise<Record<OrderStage, number>> => {
  const results = await Promise.all(
    STAGES.map(async (stage) => {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('stage', stage);
      if (error) {
        console.error(`Failed to count stage=${stage}:`, error);
        return [stage, 0] as const;
      }
      return [stage, count ?? 0] as const;
    })
  );
  return Object.fromEntries(results) as Record<OrderStage, number>;
};

export const useStageCounts = () => {
  return useQuery({
    queryKey: ['orders', 'stage-counts'],
    queryFn: async (): Promise<StageCounts> => {
      // Preferred: a single server-side aggregate (one round-trip, tiny payload).
      let counts: Record<OrderStage, number>;
      const { data, error } = await (supabase as any).rpc('get_stage_counts');

      if (error || !Array.isArray(data)) {
        // RPC missing/failed — fall back to per-stage head counts so the UI
        // keeps working until the get_stage_counts migration is deployed.
        if (error) console.warn('get_stage_counts RPC unavailable, falling back:', error.message);
        counts = await fetchCountsPerStage();
      } else {
        counts = STAGES.reduce((acc, s) => {
          acc[s] = 0;
          return acc;
        }, {} as Record<OrderStage, number>);
        for (const row of data as Array<{ stage: OrderStage; count: number }>) {
          if (row.stage) counts[row.stage] = Number(row.count) || 0;
        }
      }

      const active = STAGES
        .filter((s) => s !== 'delivered')
        .reduce((sum, s) => sum + (counts[s] || 0), 0);

      return {
        pending: counts.pending || 0,
        hold: counts.hold || 0,
        printing: counts.printing || 0,
        packing: counts.packing || 0,
        tracking: counts.tracking || 0,
        shipped: counts.shipped || 0,
        delivered: counts.delivered || 0,
        active,
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};
