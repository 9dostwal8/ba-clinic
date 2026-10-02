// @ts-nocheck
import { supabase as typedSupabase } from '@/integrations/supabase/client';

// Legacy modules query many tables with hand-written types; use an untyped client.
export const supabase = typedSupabase as unknown as import('@supabase/supabase-js').SupabaseClient<any, any, any>;

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface StaffPermissions {
  can_view_appointments: boolean;
  can_edit_appointments: boolean;
  can_view_patients: boolean;
  can_edit_patients: boolean;
  can_view_treatments: boolean;
  can_edit_treatments: boolean;
  can_view_invoices: boolean;
  can_edit_invoices: boolean;
  can_view_inventory: boolean;
  can_edit_inventory: boolean;
  can_view_accounting: boolean;
  can_view_staff: boolean;
  can_edit_staff: boolean;
  can_view_settings: boolean;
  view_all_patients: boolean;
  view_all_appointments: boolean;
}

export interface UserProfile {
  id: string;
  clinic_id: string | null;
  role: UserRole;
  full_name: string;
  full_name_ar: string | null;
  phone: string | null;
  specialization: string | null;
  is_active: boolean;
  created_at: string;
  permissions?: StaffPermissions;
}

export interface Clinic {
  id: string;
  name: string;
  name_ar: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  subscription_status: 'active' | 'suspended' | 'expired';
  subscription_start: string;
  subscription_end: string | null;
  max_staff: number;
  max_patients: number;
  created_at: string;
}
