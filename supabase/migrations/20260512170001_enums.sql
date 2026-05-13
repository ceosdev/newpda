-- Identity / domain enums. Values are stored in English; UI maps to Portuguese labels.

create type public.profile_status as enum ('pending', 'approved', 'denied');

create type public.profile_role as enum ('player', 'spectator');

create type public.player_status as enum ('active', 'inactive', 'injured');

create type public.approval_action as enum (
  'approved',
  'denied',
  'revoked',
  'role_changed',
  'admin_granted',
  'admin_revoked',
  'player_status_changed'
);
