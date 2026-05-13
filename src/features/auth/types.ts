import type { Database } from '@/lib/supabase/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileStatus = Database['public']['Enums']['profile_status'];
export type ProfileRole = Database['public']['Enums']['profile_role'];

export type Capability =
  | 'access_app'
  | 'approve_player'
  | 'manage_players'
  | 'manage_matches'
  | 'manage_admins'
  | 'edit_self_profile';
