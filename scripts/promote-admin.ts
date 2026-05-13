/**
 * Bootstrap (or promote) an admin via the Supabase service role key.
 *
 * Usage:
 *   pnpm promote:admin <email>
 *
 * Requirements (in .env.local — never commit these):
 *   VITE_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Settings → API → service_role, secret)
 *
 * The target user must have signed up through the app first (so an auth.users
 * row and the corresponding pending profile already exist).
 *
 * SECURITY: the service role key bypasses RLS. Never expose it to the frontend.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('VITE_SUPABASE_URL não definida em .env.local');
  process.exit(1);
}
if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY não definida em .env.local');
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Uso: pnpm promote:admin <email>');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(target: string) {
  let page = 1;
  const perPage = 200;
  // listUsers is paginated; in practice users < 200 for this app, but iterate to be safe.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`Nenhum usuário com email ${email}. Faça signup pelo app primeiro.`);
    process.exit(1);
  }

  // Promote to approved + admin + player. Service role bypasses RLS and the
  // status_invariants check is honored because all the required columns are set.
  const now = new Date().toISOString();
  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      status: 'approved',
      role: 'player',
      is_admin: true,
      approved_at: now,
      approved_by: user.id,
      denied_reason: null,
      onboarded_at: now,
    })
    .eq('id', user.id);
  if (profileErr) throw profileErr;

  // Ensure a players row exists (and is not archived).
  const { error: playerErr } = await admin
    .from('players')
    .upsert(
      { profile_id: user.id, joined_at: now, archived_at: null },
      { onConflict: 'profile_id' },
    );
  if (playerErr) throw playerErr;

  console.log(`OK — ${email} promovido a admin (status=approved, role=player, is_admin=true).`);
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
