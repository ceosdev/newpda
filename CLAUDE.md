# CLAUDE.md

Documento de governança técnica do projeto. Toda decisão de arquitetura, implementação e revisão deve obedecer a este arquivo. Em caso de conflito entre uma instrução pontual do usuário e este documento, **pergunte antes de divergir**.

> **Idioma do documento:** português.
> **Idioma do código, comentários técnicos, nomes de pastas/arquivos/tabelas/colunas/variáveis:** inglês — sempre. Sem exceções.

---

## 1. Visão geral do produto

Aplicação web para gerenciamento de uma **pelada de futebol** (partidas recorrentes entre amigos): cadastro de jogadores, organização de partidas, sorteio de times, controle de presença, financeiro da mensalidade, histórico, estatísticas, etc.

- **Público:** organizador (admin), jogadores recorrentes, eventuais espectadores.
- **Plataforma alvo:** web responsiva **mobile-first**, com **PWA** planejado em fase posterior.
- **Hospedagem:** **fora da Vercel** (alvo provável: Cloudflare Pages, Netlify, ou self-host em VPS via Docker — a decisão final será do usuário). Evitar qualquer recurso exclusivo Vercel (Vercel Functions, Vercel KV, `@vercel/*`).

---

## 2. Convenções arquiteturais

### 2.1 Princípios não-negociáveis

1. **Segurança no banco, não no cliente.** Toda regra de autorização vive em **RLS + policies do Supabase**. A UI apenas reflete o que o backend permite — nunca é fonte de verdade.
2. **Autenticação ≠ identidade de domínio.** `auth.users` é só prova de quem está logado. O domínio (jogador, espectador, admin) é modelado em tabelas separadas.
3. **Server-state separado de client-state.** Dados do Supabase nunca entram em store global de UI.
4. **Componentes burros, hooks espertos.** Componentes recebem props/dados prontos; lógica de dado/efeito mora em hooks.
5. **Mobile-first sempre.** Cada tela é desenhada primeiro no viewport de ~360px e só então recebe breakpoints maiores.
6. **Falhar em voz alta no dev, silenciosamente no usuário.** Erros aparecem em toasts e logs estruturados; nunca em `alert()` nem em telas brancas.
7. **Nenhum lock-in de plataforma.** Sem APIs proprietárias da Vercel, sem assumir Edge Runtime específico, sem `next/*` se não for usado um framework Next.

### 2.2 Camadas

```
UI (components/pages)
   └── hooks de feature (useCreateMatch, useApprovePlayer, ...)
        └── data layer (queries/mutations React Query → supabase client)
             └── Supabase (Postgres + RLS + Auth + Storage)
```

Regra: **a UI nunca importa o cliente Supabase diretamente**. Sempre passa por um hook da data layer.

---

## 3. Stack recomendada

| Camada | Escolha | Observação |
|---|---|---|
| Bundler/dev server | **Vite** | Não Next.js (lock-in de Vercel-friendly mesmo em outras plataformas, e SSR não é necessário aqui). |
| Linguagem | **TypeScript estrito** | `strict: true`, `noUncheckedIndexedAccess: true`. |
| UI lib | **React 18+** | Function components apenas. |
| Roteamento | **React Router v6+** | Rotas tipadas via helpers próprios. |
| Estilização | **TailwindCSS** + **shadcn/ui** | shadcn é colado no repo (não é dependência), customizado. |
| Ícones | **lucide-react** | Padrão do shadcn. |
| Server state | **TanStack Query (React Query) v5** | Cache, invalidação, mutations. |
| Client state global | **Zustand** (apenas se necessário) | Default: useState/useReducer local. |
| Forms | **React Hook Form** + **Zod** | Schemas compartilhados com validações server-side espelhadas em RLS/checks. |
| Backend | **Supabase** | Postgres, Auth, Storage, Realtime (quando justificado). |
| Tipos do banco | **`supabase gen types typescript`** | Gerados, versionados, nunca editados à mão. |
| Testes unitários | **Vitest** + **React Testing Library** | Foco em lógica de hooks e componentes críticos. |
| Testes E2E | **Playwright** | Apenas fluxos críticos (login, aprovação, criar partida). |
| Lint/format | **ESLint** + **Prettier** | Config compartilhada, sem regras silenciosamente desabilitadas. |
| CI | **GitHub Actions** | Lint + typecheck + test em todo PR. |
| Deploy | A definir (não-Vercel) | Build é estático puro. |

> Qualquer adição de dependência precisa de justificativa registrada no PR. Bibliotecas que duplicam função existente (ex.: outro form lib além de RHF) são **proibidas**.

---

## 4. Estrutura de pastas

```
/
├── public/                       # assets estáticos servidos como estão
├── src/
│   ├── app/                      # bootstrap: providers, router, layout raiz
│   │   ├── providers.tsx
│   │   ├── router.tsx
│   │   └── root-layout.tsx
│   ├── pages/                    # uma pasta por rota; só composição
│   │   ├── auth/
│   │   ├── pending-approval/
│   │   ├── players/
│   │   ├── matches/
│   │   └── admin/
│   ├── features/                 # lógica de domínio agrupada por bounded context
│   │   ├── auth/
│   │   │   ├── api/              # hooks de query/mutation (React Query)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schemas/          # zod
│   │   │   └── types.ts
│   │   ├── approvals/
│   │   ├── players/
│   │   ├── matches/
│   │   └── admin/
│   ├── components/               # componentes genéricos compartilhados (não de feature)
│   │   ├── ui/                   # shadcn gerado aqui
│   │   └── shared/               # wrappers próprios (EmptyState, PageHeader, ...)
│   ├── hooks/                    # hooks utilitários genéricos
│   ├── lib/
│   │   ├── supabase/             # client, types gerados, helpers
│   │   ├── query-client.ts
│   │   ├── utils.ts              # cn(), formatadores, etc.
│   │   └── env.ts                # parsing tipado de import.meta.env via zod
│   ├── styles/
│   │   ├── globals.css
│   │   └── tokens.css            # CSS vars do design system
│   └── types/                    # tipos cross-feature
├── supabase/
│   ├── migrations/               # SQL versionado
│   ├── seed.sql
│   └── policies/                 # documentação das RLS (espelho dos arquivos SQL)
├── tests/                        # E2E playwright
├── CLAUDE.md
├── README.md
└── ...config files
```

Regras:
- **Páginas não contêm regra de negócio.** Apenas compõem componentes da feature correspondente.
- **`features/*` não importa de `pages/*`.** Dependência sempre flui de fora para dentro: pages → features → lib.
- **Componentes em `components/ui` são intocáveis sem motivo claro** (são shadcn). Customizações vão para `components/shared`.

---

## 5. Convenções de componentes

- **Sempre function component + TypeScript.** Sem `React.FC`.
- Um componente público por arquivo. Nome do arquivo em **kebab-case**, nome do componente em **PascalCase**.
  - `player-card.tsx` exporta `PlayerCard`.
- **Props tipadas via `type`**, sufixo `Props`: `type PlayerCardProps = { ... }`.
- Sem `default export`, exceto quando exigido por roteador/lazy load.
- **Composição > configuração.** Prefira slots/children a 10 props booleanas. Quando passar de ~6 props, considere split.
- **Estado local fica local.** Só sobe quando dois ou mais componentes precisam compartilhar.
- **Side effects em hooks dedicados** (`useXxx`), nunca soltos dentro de `useEffect` no componente.
- **Classes Tailwind via helper `cn()`** (clsx + tailwind-merge), sempre. Sem strings concatenadas.
- **Acessibilidade obrigatória:** todo controle interativo tem foco visível, role correto, e `aria-*` quando necessário. shadcn já cobre boa parte — não desligar.

---

## 6. Estratégia de autenticação

### 6.1 Princípios

- **Autenticação é provida pelo Supabase Auth.** Email/senha + provedores sociais (mínimo: Google; outros sob demanda).
- **`auth.users` nunca é referenciado diretamente pela UI** para representar "o jogador". A UI olha o **perfil de aplicação**.
- **Toda sessão é validada server-side via RLS.** Token JWT do Supabase chega em toda request; policies decidem o que retornar.

### 6.2 Modelo de dados (visão lógica, não definitivo)

```
auth.users                       (gerido pelo Supabase, não tocar)
  └─ profiles                    (1:1 com auth.users; criado por trigger no signup)
       - id (= auth.users.id, PK, FK)
       - status:   'pending' | 'approved' | 'denied'
       - role:     'player'  | 'spectator' | null     (papel funcional na pelada)
       - is_admin: boolean                            (capability ortogonal — admin pode jogar)
       - display_name
       - created_at, updated_at

players                          (existe SOMENTE se profile.role = 'player' e status = 'approved')
  - id (PK)
  - profile_id (FK → profiles.id, unique)
  - ...campos de domínio (posição, apelido, mensalista, status do jogador, etc.)
```

Pontos-chave:
- `profiles` é **a tabela de identidade de aplicação**. Toda autorização parte daí.
- `players` é **uma entidade de domínio** que só nasce quando o admin aprova alguém como jogador.
- Promover/rebaixar role **nunca** apaga `profiles`; só altera `role` e cria/arquiva `players`.
- Negar (`denied`) impede acesso a qualquer rota protegida, mas mantém o registro para auditoria/anti-reentrada.

### 6.3 Fluxo de signup → aprovação

1. Usuário se cadastra (email/senha ou social).
2. Trigger no Supabase cria `profiles` com `status = 'pending'` e `role = null`.
3. App, ao detectar sessão, busca `profiles` do usuário:
   - `pending` → redireciona para `/pending-approval` (tela de "aguardando aprovação").
   - `denied` → redireciona para `/access-denied` e força signout.
   - `approved + role = 'spectator'` → acesso somente leitura às áreas públicas internas.
   - `approved + role = 'player'` → acesso completo de jogador. Deve existir um `players` correspondente.
   - `is_admin = true` (combinado com qualquer role acima) → adiciona acesso à área administrativa.
4. Apenas admin pode mudar `status`/`role`/`is_admin` de outros usuários (garantido por RLS + RPC, não por UI).

### 6.4 Sessão no cliente

- Single source of truth: hook `useSession()` que envolve `supabase.auth.getSession()` + `onAuthStateChange`.
- Hook `useCurrentProfile()` busca `profiles` via React Query e revalida em foco.
- **Rotas protegidas** envolvem o conteúdo num `<RequireAuth />` que conhece `status` e `role` exigidos.
- Logout invalida **todas** as queries do React Query.

---

## 7. Estratégia de roles e permissions

### 7.1 Modelo

Dois papéis funcionais mutuamente exclusivos + uma capability ortogonal:

- **`role`**: `player | spectator` (ou `null` enquanto pending/denied) — define o papel funcional na pelada.
- **`is_admin`**: `boolean` — capability ortogonal. Um admin pode também ter `role = 'player'` e aparecer nas escalações; ou ser admin-organizador-only com `role = 'spectator'`.

| Combinação | Pode ler | Pode escrever |
|---|---|---|
| `spectator` (não-admin) | dados públicos da pelada (próxima partida, escalação publicada, ranking) | próprio `profiles.display_name` apenas |
| `player` (não-admin) | tudo de `spectator` + seu `players` + dados de partidas em que participa | campos editáveis do próprio `players` (definidos abaixo); confirmar presença em partidas |
| `is_admin = true` (qualquer role) | tudo | tudo, incluindo CRUD de jogadores, partidas, aprovações, configurações |

A combinação `player + is_admin` é o caso típico do organizador que também joga — totalmente suportada e esperada.

### 7.2 Campos editáveis pelo próprio jogador

Definição inicial (ajustável via migration):
- `profiles.display_name`
- `profiles.avatar_url`
- `players.nickname`
- `players.preferred_position`
- `players.shirt_number`

**Tudo o mais é exclusivo do admin** — em particular: `profiles.status`, `profiles.role`, `profiles.is_admin`, `profiles.approved_*`, `profiles.denied_reason`, `players.is_monthly`, `players.player_status` (e `player_status_note` / `player_status_changed_at`), `players.archived_at`, `players.joined_at`. RLS garante isso por coluna (policies + `WITH CHECK` específicos) ou via funções `security definer` quando a granularidade exigir.

### 7.3 Autorização na UI

- **A UI consulta capacidades, não roles.** Ex.: `can('approve_player')`, não `if (is_admin)` ou `if (role === 'player')`.
- Capacidades são derivadas de `profile` (incluindo `role`, `status` e `is_admin`) em um hook `usePermissions()`. Centralizar a lógica.
- **Esconder/desabilitar botão é UX, não segurança.** Toda ação correspondente é, em paralelo, barrada pela RLS. Se a UI mostrar um botão de admin para um jogador comum, isso é um bug de UX; a RLS continua impedindo o efeito real.

### 7.4 RLS — diretrizes

- Toda tabela de domínio tem **`enable row level security`** ligado.
- Policies separadas por operação (`select`, `insert`, `update`, `delete`).
- Helper SQL `is_admin()`, `is_approved_player()` em `security definer` para reuso em policies.
- Updates com colunas restritas usam policy + `with check` validando que o usuário **não está alterando** colunas fora da whitelist (via `OLD.* IS NOT DISTINCT FROM NEW.*` por coluna). Quando esse padrão fica pesado, usar uma **RPC `security definer`** dedicada (ex.: `update_my_player(payload jsonb)`, `update_my_profile(...)`).
- Toda policy é versionada em `supabase/migrations/`. Mudanças passam por revisão.

---

## 8. Estratégia de estado

| Tipo de estado | Onde mora |
|---|---|
| **Server state** (qualquer dado do Supabase) | **React Query** exclusivamente. Sem cópia em store. |
| **UI state local** (open/close, hover, input) | `useState` no componente |
| **UI state compartilhado entre poucos componentes** | lift up ou `Context` específico da feature |
| **UI state global raro** (tema, sidebar mobile aberta) | **Zustand**, apenas se não houver alternativa local |
| **Form state** | **React Hook Form**, sempre |
| **URL state** (filtros, paginação, aba) | **search params** via React Router — não duplicar em estado React |

Regras:
- Nunca usar `useEffect` para sincronizar server-state com state local. Quem precisa dos dados chama o hook de query.
- **Cache keys do React Query são padronizados** por feature: `['players', 'list', filters]`, `['players', 'detail', id]`. Existe um arquivo `keys.ts` por feature.
- **Invalidations explícitas** após mutations. Não confiar em `staleTime` para refresh pós-escrita.

---

## 9. Estratégia de formulários

- **React Hook Form + Zod** em **todo** formulário, mesmo com 1 campo.
- Schema Zod fica em `features/<feat>/schemas/`. Tipos derivados via `z.infer<typeof schema>`.
- **Validações de servidor são autoridade.** Toda regra de negócio crítica (ex.: "apelido único entre jogadores") tem `check`/`unique` no Postgres além do Zod.
- Erros do Supabase são mapeados para mensagens amigáveis num helper `mapSupabaseError(error)`.
- Submissão usa mutation do React Query; estado de loading vem do `isPending`.
- Componentes de formulário usam os primitivos `Form*` do shadcn (RHF integrado).
- **Nunca** desabilitar o botão de submit como única forma de evitar duplo submit — usar `isPending` e idempotência onde possível.

---

## 10. Estratégia de consumo do Supabase

### 10.1 Cliente

- Um único `supabaseClient` em `lib/supabase/client.ts`, criado com `createClient<Database>` usando os types gerados.
- Chaves vêm de `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, validadas em `lib/env.ts` via Zod no boot — se faltar, app falha rápido.
- **Service role key nunca toca o frontend.** Operações que a exigem ficam em Supabase Edge Functions (ver 10.4).

### 10.2 Queries e mutations

- **Toda query/mutation vive em `features/<feat>/api/`** como hook (`usePlayersList`, `useApprovePlayer`).
- Hooks não retornam o client; retornam `{ data, isLoading, error }` ou `mutate`.
- **Sem `select('*')`** em queries de UI — sempre listar as colunas necessárias. Reduz payload e evita vazar campos sensíveis no futuro.
- Tipos retornados são derivados de `Database['public']['Tables']['x']['Row']` ou de tipos compostos definidos por feature.

### 10.3 Tratamento de erro

- Toda chamada checa `error` do Supabase e o joga com `throw` para o React Query tratar.
- Erros são logados estruturadamente (mensagem + code + contexto) e exibidos via toast (`sonner` ou shadcn `useToast`).
- 401/expired → forçar refresh de sessão; se falhar, signout.

### 10.4 Operações privilegiadas

- Aprovação/rejeição, criação manual de jogador, mudanças de role, etc.: ou via **RPC `security definer`** com checagem `is_admin()` interna, ou via **Edge Function**. Nunca via update direto na tabela do client.

### 10.5 Realtime e Storage

- **Realtime:** usar **apenas** quando o ganho é claro (placar ao vivo, presença de jogadores na partida do dia). Não substituir polling barato sem motivo.
- **Storage:** avatares e mídias da pelada. Buckets têm RLS própria. Upload sempre via signed URL ou policy específica do dono.

---

## 11. Padrões visuais

Inspiração explícita: **Linear.app** — denso, calmo, alto contraste tipográfico, baixa saturação cromática, microinterações curtas.

### 11.1 Princípios

- **Dark mode é primeiro cidadão.** Light mode é opcional mas desejado.
- **Tipografia faz o trabalho pesado.** Espaçamento e hierarquia tipográfica antes de cor.
- **Cor é semântica, não decorativa.** Acento único para ação primária; cores de estado (success/warning/danger) reservadas a feedback.
- **Sombras discretas, bordas finas.** Profundidade vem de blur sutil + 1px de borda, não de drop shadow pesada.
- **Cantos:** raio médio consistente (8–12px). Sem variações ad-hoc.
- **Movimento:** transições de 120–200ms, easing suave (`ease-out`/`cubic-bezier(0.16, 1, 0.3, 1)`). Sem animações longas ou ornamentais.

### 11.2 Tokens

- Todos os valores estéticos (cor, raio, espaçamento, sombras) vivem como **CSS variables** em `styles/tokens.css` e são consumidos via `tailwind.config` (`theme.extend.colors: { brand: 'hsl(var(--brand))' }`).
- Cores em **HSL**, para permitir variações por canal.
- Nada de hex cru em componente.

### 11.3 Componentes

- Base obrigatória: shadcn/ui. Customizações via classes Tailwind, não via fork descontrolado.
- Componentes próprios herdam variantes via `class-variance-authority`.
- Estados (hover/focus/active/disabled/loading) são **explícitos** em cada componente interativo.

---

## 12. Princípios de responsividade

- **Mobile-first absoluto.** Layout base é o de telefone; breakpoints **adicionam**, nunca substituem o design móvel.
- Breakpoints Tailwind: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Usar com parcimônia — preferir layout fluido (`flex`, `grid`, `clamp()`).
- **Touch targets ≥ 44×44px.**
- **Sem hover como único canal de informação.** Tudo que aparece em hover precisa de equivalente em focus/tap.
- **Navegação mobile** preferencialmente via **bottom tab bar** para áreas principais + sheet/drawer para menus secundários. Desktop pode expandir para sidebar.
- Listas longas no mobile: **virtualizar** (`@tanstack/react-virtual`) quando > ~50 itens.
- Inputs em mobile usam `inputmode`/`type` corretos (`tel`, `email`, `numeric`) para teclado adequado.
- Testar em viewport de **360×640** antes de declarar uma tela pronta.

---

## 13. Estratégia futura para PWA

PWA **não entra no MVP**, mas o código é preparado para adoção sem reescrita:

1. **Não usar APIs incompatíveis com service worker** (ex.: assumir que `fetch` interceptável é uma surpresa).
2. **Assets versionados** — Vite já faz hash em build; manter.
3. Quando o momento chegar:
   - Adicionar **`vite-plugin-pwa`** com `registerType: 'autoUpdate'`.
   - **Manifesto** com ícones (192, 512, maskable), `display: standalone`, `theme_color`/`background_color` puxando dos tokens.
   - **Estratégia de cache:** `network-first` para chamadas Supabase autenticadas (com fallback offline mínimo); `stale-while-revalidate` para assets estáticos.
   - **Offline**: identificar fluxos críticos (ver próxima partida, confirmar presença) e oferecer leitura offline + fila de mutations com retry (via `@tanstack/query-async-storage-persister`).
   - **Install prompt** controlado, exibido só após engajamento mínimo.
4. **Notificações push** ficam para fase separada, já que exigem backend de envio (Edge Function + Web Push) e ainda têm suporte irregular no iOS.

---

## 14. Regras obrigatórias para novas features

Toda nova feature deve, **sem exceção**:

1. **Modelar dados primeiro.** Migration SQL + policies RLS antes da UI.
2. **Gerar tipos** (`supabase gen types`) e commitar.
3. **Definir schemas Zod** para inputs.
4. **Criar hooks de API** em `features/<feat>/api/`. UI **não** chama `supabase` direto.
5. **Centralizar permissões** em `usePermissions()` se introduzir nova capacidade.
6. **UI mobile-first**, com estados de loading, erro e vazio (`EmptyState`) tratados explicitamente.
7. **Acessibilidade:** foco, labels, contraste verificados.
8. **Testes mínimos:**
   - Hook de mutation crítico: teste unitário.
   - Fluxo crítico de usuário: teste E2E (se o fluxo for parte do "caminho dourado").
9. **Documentar policies** afetadas em `supabase/policies/<feature>.md` (mesmo que como espelho do SQL).
10. **Sem flag morta no fim.** Se feature flag foi usada para rollout, planejar remoção.

---

## 15. Workflow obrigatório: planejamento → aprovação → implementação

Aplica-se a **qualquer mudança não-trivial** (qualquer coisa além de fix óbvio de 1 linha, ajuste de cópia, ou correção de typo).

### 15.1 Fase 1 — Planejamento (Claude propõe)

Antes de escrever **qualquer linha de código**, Claude entrega um plano contendo:

1. **Objetivo** em 1–2 frases.
2. **Impacto no modelo de dados:** novas tabelas/colunas/policies, migrations necessárias.
3. **Impacto em autorização:** roles afetadas, novas capacidades, mudanças em RLS.
4. **Mudanças de UI:** telas/componentes novos ou alterados, com pequeno esboço textual do layout mobile.
5. **APIs/hooks** a criar ou modificar.
6. **Riscos** e pontos de incerteza.
7. **Plano de testes**: o que será coberto e o que não será.
8. **Estimativa de escopo** em "pequeno / médio / grande".

### 15.2 Fase 2 — Aprovação (usuário decide)

- Claude **não passa para implementação sem aprovação explícita** do usuário.
- Se o usuário pedir ajustes no plano, Claude revisa o plano e devolve — **sem começar a codar**.
- Aprovação vale **somente para o escopo descrito**. Ampliações exigem novo ciclo.

### 15.3 Fase 3 — Implementação

- Implementar **estritamente o que foi aprovado**. Achou problema fora do escopo? **Reportar, não consertar silenciosamente.**
- Commits pequenos e descritivos.
- Ao final: resumo das mudanças, comandos para rodar/testar localmente, e lista de itens que ficaram **fora** do escopo intencionalmente.
- Mudanças que tocam RLS exigem **uma seção explícita** no resumo final descrevendo a nova superfície de autorização.

### 15.4 Exceções permitidas (sem plano formal)

- Correção de typo em string visível.
- Ajuste de classe Tailwind puramente cosmético em componente isolado.
- Bump de dependência patch sem breaking change.
- Hotfix de bug isolado e reproduzível em ≤ 20 linhas — ainda assim **descrever antes**, mesmo que curto.

---

## 16. Anti-patterns proibidos

Os itens abaixo são **proibidos** no projeto. Se aparecerem num PR, devem ser removidos.

### 16.1 Segurança

- ❌ Confiar em `if (role === 'admin')` no frontend como única barreira.
- ❌ Tabela sensível sem RLS habilitada.
- ❌ Policy `using (true)` em tabela de domínio.
- ❌ Service role key exposta ou usada no client.
- ❌ Apagar `auth.users` ou `profiles` para "desaprovar" alguém (usar status).
- ❌ Operação privilegiada feita por update direto em tabela em vez de RPC `security definer` com checagem.

### 16.2 Dados

- ❌ `select('*')` em query de UI.
- ❌ Tipos de banco escritos à mão em vez de gerados.
- ❌ Cópia de server state em store global.
- ❌ Mutation sem invalidação correspondente.
- ❌ Nomes de tabela/coluna em português.
- ❌ Strings mágicas para roles/status espalhadas pelo código (usar union types e constantes).

### 16.3 Código

- ❌ `any` sem comentário justificando.
- ❌ `// @ts-ignore` / `// @ts-expect-error` sem motivo no comentário.
- ❌ `eslint-disable` por arquivo inteiro.
- ❌ `useEffect` para buscar dados (usar React Query).
- ❌ Lógica de negócio dentro de componente de página.
- ❌ Componentes com mais de ~200 linhas — sinal de que precisa ser dividido.
- ❌ Default export, exceto onde lazy load exige.
- ❌ Importar `@/components/ui/*` e sobrescrever comportamento direto no arquivo — duplicar em `components/shared/` se precisar variar.

### 16.4 UI/UX

- ❌ Desenhar primeiro em desktop e adaptar para mobile.
- ❌ Hover como único canal de revelação de informação.
- ❌ Botão de submit que vira spinner sem feedback textual.
- ❌ Mensagem de erro genérica ("algo deu errado") quando o erro é diagnosticável.
- ❌ Estado vazio implícito (tela em branco em vez de `EmptyState`).
- ❌ Animações longas (>300ms) ou ornamentais.
- ❌ Cores hardcoded fora dos tokens.

### 16.5 Processo

- ❌ Implementar sem plano aprovado (ver §15).
- ❌ Escopo crescer dentro do PR ("já que estou aqui...").
- ❌ Adicionar dependência nova sem justificativa no PR.
- ❌ Misturar refatoração não relacionada com feature no mesmo commit.
- ❌ Comentários explicando **o que** o código faz; só **por que** quando não-óbvio.
- ❌ Criar arquivo de documentação (.md) sem o usuário pedir.

---

## 17. Lembretes para o Claude

- **Sempre leia [`STATE.md`](./STATE.md) no início de uma sessão** — é onde fica registrado o que já foi entregue, o que está pendente, e as próximas iterações candidatas. Esse documento aqui (CLAUDE.md) é governança; `STATE.md` é o ponteiro para continuar de onde a sessão anterior parou.
- **Atualizar `STATE.md` ao fechar cada iteração** — marcar como entregue (com hash do commit), atualizar a data, mover itens entre seções conforme o estado real.
- Quando em dúvida entre uma instrução pontual e este documento: **pergunte**.
- Antes de propor mudança em RLS: explique **a nova superfície de autorização em uma frase**.
- Antes de adicionar lib: explique **por que o que já temos não resolve**.
- Antes de criar abstração: mostre **três usos reais** que ela já tem.
- Antes de declarar feature pronta: confirme que **mobile 360px**, **estados de loading/erro/vazio**, e **policy correspondente** foram tratados.

---

## 18. Regras de UI versionadas

Regras de UI vivem em `.claude/rules/` e fazem parte da governança — são importadas abaixo e valem como este documento.

@.claude/rules/ui-conventions.md
