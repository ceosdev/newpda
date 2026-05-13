-- Extensions used by the application schema.
-- pgcrypto provides gen_random_uuid(); moddatetime keeps updated_at columns current.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists moddatetime with schema extensions;

-- Internal schema for RLS helpers and policy primitives.
-- Not exposed via PostgREST (Supabase only exposes 'public' by default).
create schema if not exists app;

grant usage on schema app to authenticated, service_role;
