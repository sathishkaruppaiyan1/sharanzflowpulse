
import { Database } from '@/integrations/supabase/types';

export type Order = Database['public']['Tables']['orders']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'] | null;
  shipping_address: Database['public']['Tables']['addresses']['Row'] | null;
  order_items: (Database['public']['Tables']['order_items']['Row'] & {
    product: Database['public']['Tables']['products']['Row'] | null;
  })[];
};

export type OrderStage = Database['public']['Enums']['order_stage'];
export type CarrierType = Database['public']['Enums']['carrier_type'];

export type Customer = Database['public']['Tables']['customers']['Row'];
export type Address = Database['public']['Tables']['addresses']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type SystemSetting = Database['public']['Tables']['system_settings']['Row'];
