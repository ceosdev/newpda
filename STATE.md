# STATE.md — registro de progresso

> Arquivo de continuidade entre sessões. **Atualize ao final de cada iteração**, mantendo apenas o que NÃO é derivável do código/git. Para regras técnicas perenes, ver [`CLAUDE.md`](./CLAUDE.md).

**Última atualização:** 2026-05-14 (após entrega da gestão admin de posição/status e abas Ativos/Inativos na /team)

---

## Status atual

### O que já está em produção (no repo + Supabase remoto)

- **Identity layer no Supabase** (commit `c01c742`)
  - 11 migrations aplicadas: schemas, enums (`profile_status`, `profile_role`, `approval_action`), tabelas (`profiles`, `players`, `approval_history`), helpers `security definer` (`is_admin()`, `is_approved_player()`), RLS policies por operação, triggers de signup, RPCs self (`update_my_profile`, `update_my_player`) e admin (`approve_user`, `deny_user`, `change_user_role`, `set_user_admin`), bucket `avatars` com policies próprias.
  - Check constraint `profiles_status_invariants` protege coerência de estado — `pending` ⇒ tudo `null`; `approved` ⇒ `role` e `approved_at` setados; `denied` ⇒ `denied_reason` setado. **Nunca editar profiles via Table Editor**, sempre via RPCs ou `pnpm promote:admin`.
  - Tooling: `pnpm db:link/push/diff`, `pnpm gen:types`, `pnpm promote:admin <email>`.

- **Camada de auth no client** (commit `e1da228`, ajustes em `8a690ac`)
  - Hooks: `useSession`, `useCurrentProfile`, `usePermissions`, `useSignIn/Up/Out`.
  - Componentes: `RequireAuth`, `RequireSession`, `RedirectIfAuthenticated`, `AuthCard`.
  - Páginas: `/login`, `/signup`, `/pending-approval`, `/access-denied`, `/` (home autenticada com header + logout).
  - Forms via React Hook Form + Zod; `mapSupabaseError` traduz códigos do Supabase para PT-BR.
  - Email/senha apenas — sem Google OAuth, sem reset de senha, sem confirmação de email.

- **UI admin — aprovações de usuários** (commit `c30e50e`, badge em `92299d5`, tab Negados em `0cb4497`)
  - Rota `/admin/approvals` protegida por `RequireAuth(requireAdmin)`, com tabs **Pendentes / Negados**.
  - Pendentes: sheets bottom-up para aprovar (role picker player/spectator) ou negar (motivo obrigatório, validado por zod).
  - Negados: cada card mostra o motivo da negação e oferece "Voltar a pendente" (`revoke_approval`) ou "Aprovar" (reusa o sheet de role picker, transição direta `denied → approved`).
  - Mutations invalidam `adminKeys.all` — abas e ponto da home se mantêm coerentes em qualquer transição.
  - Atalho no header da home (ícone escudo) visível só com capability `manage_approvals`; ponto no canto do ícone quando há pendentes (não conta negados — atenção é só para fila nova).
  - Componente compartilhado `EmptyState` em `components/shared/` para estados vazios reutilizáveis.

- **Roster `/team`** (DB em `88514bb`, UI em `0b78e51`)
  - Migration `20260513140000_team_read_rpcs`: 2 RPCs `security definer` para leitura — `list_players_public()` (lista shape) e `get_player_detail(uuid)` (detalhe com email, telefone, nascimento, etc.). Ambas exigem caller `status='approved'` (player OU spectator). **Não relaxa policy de profiles** — esse caminho privilegia campos sensíveis (`denied_reason`, `approved_by`) que ficam só para admin via RLS direta.
  - Rota `/team` dentro de `<RequireAuth />` simples (qualquer aprovado vê). Ícone `Users` na home não é mais gated por `manage_admins`.
  - `PlayerListCard` inspirado no Cartola: foto 112px à esquerda, badges no topo direito (status + admin), faixa inferior `Gols · Cartões · Frequência` com placeholders prontos para integração futura.
  - Grid responsivo: 1 col mobile, 2 col `sm`, 3 col `lg`. Container `max-w-5xl`.
  - Busca em memória por apelido OU nome completo, normalizada NFD (ignora acentos), ordenação alfabética PT-BR (apelido com fallback display_name).
  - `PlayerDetailSheet` (bottom sheet) com dados completos. **Bloco "Ações de admin"** só aparece se viewer é admin: RadioGroup role + Switch admin + botão "Voltar a pendente", com `AlertDialog` de confirmação. Self-revogação de admin redireciona para `/`.
  - Admin mutations agora invalidam `teamKeys.all` além das chaves de admin.
  - shadcn novos: `switch`, `alert-dialog`.
  - **Limitação conhecida:** UI para gerenciar **espectadores** não existe. Spectator que vira player só com SQL direto. Entra como iteração futura.

- **Gestão admin de posição + status do jogador** (DB em `bc57ebc`, UI em `62ea15b`, polish do header em `8aac9d5`)
  - Migrations `20260514100000_admin_player_position_and_status` + patch `20260514100001_admin_position_default_null`: duas novas RPCs `security definer` que aceitam `profile_id` para simetria com o resto do painel admin — `admin_update_player_position(p_target_profile, p_position default null)` e `admin_update_player_status(p_target_profile, p_status, p_note default null)`. Posição não loga em `approval_history` (rotina de dados, espelha `set_player_monthly`); status continua logando `'player_status_changed'`.
  - `PlayerAdminActions` ganhou dois controles novos no sheet de detalhe: `Select` de posição (`Sem preferência / Goleiro / Defesa / Meio / Ataque`) e `RadioGroup` 3-col de status (`Ativo / DM / Inativo`). Ambos aplicam imediatamente com toast — **sem AlertDialog**, edições reversíveis e benignas (diferente de role/admin/revoke que continuam confirmando).
  - Tela `/team` quebrada em **abas Ativos × Inativos** com contagens nas labels. Filtros de busca **independentes por aba** (`queryActive` / `queryInactive` separados). Na aba Ativos: split em **Goleiros** (preferred_position === 'goalkeeper') antes de **Linha**, cada seção com heading sutil + grid.
  - Badge de status `injured` (DM) usa `bg-destructive/10 text-destructive` (vermelho via token), não mais âmbar.
  - Header da home (desktop ≥ `sm`): nome + role do usuário agora **antes** dos ícones de ação (ShieldCheck → Time → Meu cadastro → Sair). Mobile inalterado (bloco continua `hidden`).

- **Edição self do profile/player** (DB em `42bb656`, UI em `05684ba`)
  - Migrations: `profiles.phone text` (nullable), `profiles.birth_date date` (nullable). RPC `update_my_profile` cresceu para `(text, text, text, date)`; RPC `update_my_player` ganhou `default null` em todos os args.
  - Rota `/me` protegida por `RequireAuth`, atalho no header da home (ícone User) visível para todo aprovado.
  - **Form único** (`ProfileForm`) com avatar, nome, data de nascimento, celular, e — se `role='player'` — apelido e posição preferida. Um único botão "Salvar" dispara `update_my_profile` e/ou `update_my_player` em paralelo via `Promise.allSettled`, só onde houve campo `dirty`. Falhas parciais mantêm o que salvou e mostram erro específico.
  - **Avatar cropper:** Dialog com `react-easy-crop` (nova dep, MIT, ~30KB) — crop circular, drag + zoom slider, canvas extrai 512×512 JPEG quality 0.9. Path fixo `avatars/{userId}/avatar` com cache-bust por timestamp na URL pública.
  - `mapSupabaseError` agora detecta `players_nickname_active_idx` / `players_shirt_number_active_idx` no message/details e devolve mensagem PT-BR mais específica.
  - shadcn novos: `select`, `dialog`, `slider`.

### Estado do projeto remoto (não-derivável do código)

- **Project ref Supabase:** `vtvnjogbtefyhaskhflb` (já linkado via `supabase/.temp`).
- **Auth → Providers → Email → Confirm email:** **OFF** durante dev. Religar antes de prod.
- **Primeiro admin:** `carlossantana.desenv@gmail.com` (Carlinhos) — promovido via `pnpm promote:admin`. Status `approved`, role `player`, `is_admin=true`, com row em `players`.

---

## Pendências de housekeeping (urgente)

> Itens fora do código que precisam ser feitos manualmente pelo usuário.

- [ ] **Rotacionar a `SUPABASE_SERVICE_ROLE_KEY`** — ela ficou exposta no histórico de uma sessão de chat anterior. Dashboard → Settings → API → **Generate new JWT secret** (invalida `anon` e `service_role` juntas). Atualizar `.env.local` depois.
- [ ] **Rotacionar a DB password** — Settings → Database → Reset database password (também ficou em histórico).
- [ ] (Opcional) Adicionar `paths` ao `tsconfig.json` raiz para que `pnpm dlx shadcn@latest add` resolva o alias `@` sem criar diretório literal — workaround manual hoje é mover de `@/components/ui/` para `src/components/ui/`.

---

## Próximas iterações candidatas

Cada uma exige plano formal (§15 do CLAUDE.md) antes de implementar. Ordem sugerida abaixo é por valor + dependência, não compromisso firme.

### 1. UI admin — gerenciamento de espectadores (pequeno)
- Hoje a /team mostra só `role='player'`. Promover espectador → player (e o reverso) já é coberto por `change_user_role`, mas não há tela listando espectadores.
- Decidir: adicionar uma aba/tela de espectadores reusando o sheet, ou expor via /admin/approvals com um filtro extra? Atual workaround é SQL direto.

### 2. Polish do fluxo de auth (médio)
- Google OAuth (Supabase já suporta, basta habilitar provider + ajustar callbacks).
- Reset de senha (link por email).
- Tela "Confirme seu email" + religar Confirm email no painel.

### 3. Domínio de partidas (grande, coração do app)
- Modelagem (matches, attendances, teams), RLS, RPCs.
- Telas: criar partida, lista, presença, sorteio.
- Decidir heurística de sorteio depois (skill ainda não está no modelo; pode usar presença + mensalismo).

### 4. Financeiro / mensalidade (grande, posterior)
- Marcar pago/atraso, histórico, eventualmente Pix/integração.

### 5. PWA (fase final)
- `vite-plugin-pwa`, manifesto, estratégias de cache, fila offline de mutations.
- Notificações push ficam para depois (Edge Function + Web Push).

---

## Decisões abertas (não-resolvidas)

- **Onde hospedar o build estático em prod:** Cloudflare Pages × Netlify × VPS Docker. Adiar até estar perto de prod.
- **Heurística de sorteio de times:** decidir junto com a iteração de partidas, com o problema concreto.
- **Mensalidade:** modelo (valor fixo? por temporada?) ainda não definido.
- **Notificações:** push web vs WhatsApp vs nada por enquanto.

---

## Como atualizar este arquivo

Mantenha enxuto. Critério de inclusão: **a informação tem que NÃO ser derivável do código/git/CLAUDE.md** e ser útil para retomar trabalho em outra sessão.

- ✅ Decisões pendentes, estado do projeto Supabase remoto, hash dos commits que entregaram cada bloco, próximas iterações já planejadas, housekeeping pendente.
- ❌ Detalhes de implementação (estão no código), histórico de mudanças (está no git log), regras técnicas (estão no CLAUDE.md), passos de setup (estão no README).

Ao fechar uma iteração: marcar como entregue, adicionar o hash do commit, mover para a seção "O que já está em produção", e atualizar a data no topo.
