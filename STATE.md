# STATE.md — registro de progresso

> Arquivo de continuidade entre sessões. **Atualize ao final de cada iteração**, mantendo apenas o que NÃO é derivável do código/git. Para regras técnicas perenes, ver [`CLAUDE.md`](./CLAUDE.md).

**Última atualização:** 2026-05-13 (após entrega da iteração de aprovações admin)

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

- **UI admin — aprovações de usuários** (commit `c30e50e`, badge em `92299d5`)
  - Rota `/admin/approvals` protegida por `RequireAuth(requireAdmin)`.
  - Lista de profiles `pending` com sheets bottom-up para aprovar (role picker player/spectator) ou negar (motivo obrigatório, validado por zod).
  - Chama as RPCs `approve_user` / `deny_user`; cache invalida a lista no sucesso.
  - Atalho no header da home (ícone escudo) visível só com capability `manage_approvals`; ponto no canto do ícone quando há pendentes.
  - Componente compartilhado `EmptyState` em `components/shared/` para estados vazios reutilizáveis.

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

### 1. Tab "Negados" em /admin/approvals (em andamento)
- Reaproveita a tela atual com Tabs (Pendentes / Negados).
- Card de negado expõe `denied_reason` e 2 ações: voltar a pendente (`revoke_approval`) ou aprovar direto (`approve_user`, que já lida com `denied → approved`).
- Plano aprovado pelo usuário em 2026-05-13; implementação em curso.

### 2. Edição self do profile/player (curto)
- Tela `/me` para o jogador aprovado editar `display_name`, `avatar_url`, `nickname`, `preferred_position`, `shirt_number`.
- Usa as RPCs self (`update_my_profile`, `update_my_player`).
- Upload de avatar para o bucket `avatars` (signed URL ou policy de dono).

### 3. UI admin — gerenciamento de role + admin (médio)
- Tela de jogadores aprovados com ações: trocar role, promover/rebaixar admin (chamando `change_user_role` e `set_user_admin`).
- Atenção: prevenir admin último degradação de si mesmo (regra de negócio que pode estar no RPC; verificar antes).

### 4. Polish do fluxo de auth (médio)
- Google OAuth (Supabase já suporta, basta habilitar provider + ajustar callbacks).
- Reset de senha (link por email).
- Tela "Confirme seu email" + religar Confirm email no painel.

### 5. Domínio de partidas (grande, coração do app)
- Modelagem (matches, attendances, teams), RLS, RPCs.
- Telas: criar partida, lista, presença, sorteio.
- Decidir heurística de sorteio depois (skill ainda não está no modelo; pode usar presença + mensalismo).

### 6. Financeiro / mensalidade (grande, posterior)
- Marcar pago/atraso, histórico, eventualmente Pix/integração.

### 7. PWA (fase final)
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
