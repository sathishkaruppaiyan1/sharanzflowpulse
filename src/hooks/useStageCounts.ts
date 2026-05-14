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

export const useStageCounts = () => {
  return useQuery({
    queryKey: ['orders', 'stage-counts'],
    queryFn: async (): Promise<StageCounts> => {
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

      const counts = Object.fromEntries(results) as Record<OrderStage, number>;
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
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
};
