-- Default-deny baseline: tables have RLS enabled + forced.
-- Only SELECT is allowed directly; all writes go through security-definer RPCs.
-- Cross-user reads are intentionally NOT enabled here; they will arrive as dedicated
-- RPCs when listing screens are built (ciclo 7).

-- profiles: own row or admin.
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or app.is_admin());

-- players: own row or admin.
create policy "players_select_self_or_admin"
  on public.players for select
  to authenticated
  using (profile_id = (select auth.uid()) or app.is_admin());

-- approval_history: own row or admin.
create policy "approval_history_select_self_or_admin"
  on public.approval_history for select
  to authenticated
  using (profile_id = (select auth.uid()) or app.is_admin());
