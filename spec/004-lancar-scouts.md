# Spec 004 — Lançar scouts

> Nomenclatura no código sempre em inglês (`match_scouts`, `record_match_scouts`, etc.), conforme CLAUDE.md §"idioma". Exibição na UI sempre em PT-BR.

## Contexto e objetivo

A Spec 003 entregou o **lançamento de presenças** (`match_check_ins`): o admin registra quem de fato esteve na pelada. A tela `/matches/:id` ficou organizada em **Seção 1 — Respostas** e **Seção 2 — Presenças**, e reservou explicitamente uma **Seção 3** para os scouts do dia.

Esta spec preenche essa Seção 3. O admin passa a registrar, **por jogador que esteve presente**, os números do dia:

- **Gols**
- **Cartões amarelos**
- **Cartões azuis**
- **Cartões vermelhos**
- **Vitórias**
- **Empates**

Esses números são a base das estatísticas do grupo. Esta spec também conecta os scouts às telas que já existiam com placeholders: o card de jogador em `/team` passa a exibir **Gols** e **Pontos** reais (`Pontos = vitórias × 3 + empates`), substituindo os `—` atuais.

## Escopo

**Nesta spec:**
- Nova tabela `match_scouts` relacionando pelada × jogador presente, com os seis contadores inteiros.
- RPC admin para gravar/atualizar scouts em lote (`record_match_scouts`) — upsert: o último lançamento sempre prevalece.
- RPC de leitura (`list_match_scouts`) que alimenta tanto o modal de lançamento quanto a Seção 3 de visualização.
- Recriação da RPC `list_players_public` para devolver `total_goals` e `total_points` agregados.
- Botão **"Lançar scouts"** na tela de detalhes (somente admin), abrindo um modal com um formulário por jogador presente.
- **Seção 3 — Scouts** na tela `/matches/:id`: visualização dos lançamentos do dia, em abas (`Gols · Amarelos · Azuis · Vermelhos · Performance`), visível a qualquer aprovado.
- Integração do card de `/team`: campos **Gols** e **Pontos** passam a refletir dados reais.

**Fora desta spec (próximas):**
- Assistências, ou qualquer outro scout além dos seis acima.
- Ranking/estatística agregada por temporada ou tela própria de estatísticas — aqui só a visualização por pelada e os totais no card de `/team`.
- Sorteio de times, financeiro, etc.
- Qualquer mudança nas Seções 1 e 2 (Respostas e Presenças) — permanecem como na Spec 003.

## Decisões

1. **`match_scouts` referencia o check-in, não o jogador diretamente.** A PK é composta `(match_id, player_id)` e existe uma **FK composta** `(match_id, player_id)` → `match_check_ins(match_id, player_id)` `on delete cascade`. Consequências, todas desejadas:
   - Só é possível lançar scout de quem **tem presença lançada** naquela pelada (regra "o lançamento é por peladeiro que esteve presente" garantida no banco, não só na UI).
   - **Remover um check-in (Spec 003) apaga em cascata os scouts daquele jogador** naquela pelada — sem dado órfão de "scout de quem não estava lá".
   - Excluir a pelada apaga `match_check_ins` em cascata (Spec 003) e, transitivamente, `match_scouts` — alinhado ao hard delete da Spec 001.
2. **O lançamento é editável: upsert, último valor prevalece.** Não há histórico de versões. Reabrir o modal recupera os valores já gravados em cada campo; o admin corrige (apaga o 1, digita o 2) e relança. `ON CONFLICT (match_id, player_id) DO UPDATE` sobrescreve.
3. **Os seis campos são inteiros não-negativos.** `integer not null default 0`, com `check (... >= 0)` no banco e validação espelhada em Zod. Limite superior de **99** por campo no Zod, como salvaguarda contra erro de digitação (uma pelada de um dia não passa disso) — não é regra de banco, é facilmente ajustável.
4. **"Pontos" é um valor derivado, nunca armazenado.** `pontos = vitórias × 3 + empates`. Calculado na leitura (na RPC de agregação e/ou na UI). A tabela guarda apenas `wins` e `draws`.
5. **"Lançar scouts" está disponível em pelada `open` e `closed`** — mesma decisão da Spec 003 para presenças: o fluxo normal é o admin lançar tudo no dia seguinte, com a pelada possivelmente já fechada.
6. **A lista de jogadores no modal é exatamente a lista de presentes.** Vem de quem tem `match_check_ins` na pelada — **sem filtro de `player_status`**. Um jogador que esteve presente e depois saiu do elenco (`inactive`/arquivado) continua aparecendo, porque a presença é fato histórico (coerente com a Spec 003, decisão 3).
7. **Sem optimistic update e sem realtime.** Lançar scout é ação admin pontual; refetch após sucesso é suficiente e mais seguro. Concorrência entre dois admins: o último a clicar "Lançar" prevalece (upsert) — aceito.
8. **Scouts não são logados em `approval_history`.** São dado de rotina da pelada, não evento de autorização — mesmo critério de `match_check_ins` e das mudanças de posição/status do jogador.

## Entidade

### Tabela `match_scouts`

| Campo | Tipo | Regras |
|---|---|---|
| `match_id` | uuid | parte da PK |
| `player_id` | uuid | parte da PK |
| `goals` | integer | `not null default 0`, `check >= 0` |
| `yellow_cards` | integer | `not null default 0`, `check >= 0` |
| `blue_cards` | integer | `not null default 0`, `check >= 0` |
| `red_cards` | integer | `not null default 0`, `check >= 0` |
| `wins` | integer | `not null default 0`, `check >= 0` |
| `draws` | integer | `not null default 0`, `check >= 0` |
| `updated_at` | timestamptz | `not null default now()`, atualizado a cada upsert |
| `updated_by` | uuid | FK → `profiles.id` `on delete restrict`; admin que lançou, de `auth.uid()` |
| **PK** | composta | `(match_id, player_id)` |
| **FK composta** | — | `(match_id, player_id)` → `match_check_ins(match_id, player_id)` `on delete cascade` |

- Os seis `check >= 0` podem ser agrupados num único constraint nomeado (`match_scouts_non_negative`).
- A FK composta substitui FKs individuais para `matches`/`players`: o alvo `match_check_ins` já garante ambos.
- **Sem trigger** próprio — a coerência (só presente tem scout; remover presença/pelada apaga scout) vem inteiramente da FK em cascata.
- RLS habilitada. **Policy de `select`** para qualquer profile aprovado (player ou spectator). **Sem policies** de `insert`/`update`/`delete` — toda escrita passa pela RPC.

### RPC `record_match_scouts(p_match_id uuid, p_entries jsonb)`

`security definer`. Grava/atualiza scouts em lote (upsert).

- `p_entries` é um array JSON de objetos `{ player_id, goals, yellow_cards, blue_cards, red_cards, wins, draws }`.
- Checa `app.is_admin()` no topo; rejeita se não-admin.
- Rejeita se `p_match_id` não existir.
- Para cada entry, considera elegível **apenas** o jogador que tem `match_check_ins` para `p_match_id` (presente). Entries sem check-in são **ignorados** (não abortam o lote) — espelha o "ignora inelegíveis" da Spec 003.
- Campos ausentes/`null` no JSON são tratados como `0`.
- `INSERT ... ON CONFLICT (match_id, player_id) DO UPDATE SET` os seis contadores `= excluded.*`, `updated_at = now()`, `updated_by = auth.uid()`.
- Array vazio é no-op.
- Valores negativos são barrados pelo `check` do banco (a UI já impede via Zod).
- Retorna a quantidade de linhas afetadas (`integer`), como `record_match_check_ins`.

### RPC `list_match_scouts(p_match_id uuid)`

`security definer`, `stable`. Lista os jogadores presentes na pelada com seus scouts — alimenta **o modal** (recuperação dos valores) e **a Seção 3** (visualização).

- Caller precisa estar aprovado (player ou spectator).
- Faz `LEFT JOIN` de `match_check_ins` (presentes) com `match_scouts`; `coalesce` dos seis contadores para `0` quando ainda não há lançamento.
- Shape por jogador: `player_id`, `profile_id`, `nickname`, `display_name`, `avatar_url`, `preferred_position`, `goals`, `yellow_cards`, `blue_cards`, `red_cards`, `wins`, `draws`, `check_in_count`, `total_match_count` (estes dois últimos alimentam a frequência — ver §"Ajustes pós-aprovação").
- Ordenação base: alfabética PT-BR por apelido, com fallback para `display_name`. As ordenações por contador (ranking de gols, etc.) ficam na UI.

### RPC `list_players_public()` — recriada

A RPC da lista de `/team` ganha dois campos agregados. Como o shape de retorno muda, é **drop + create** (terceira recriação — Spec 003 já fez isso).

- Mantém tudo que já retorna (`profile_id`, `display_name`, `avatar_url`, `is_admin`, `nickname`, `preferred_position`, `player_status`, `check_in_count`, `total_match_count`).
- **Novos campos:**
  - `total_goals integer` — soma de `goals` de todas as linhas de `match_scouts` do jogador.
  - `total_points integer` — soma de `(wins × 3 + draws)` de todas as linhas de `match_scouts` do jogador.

## Solução proposta

### Seção 3 — Scouts (na tela `/matches/:id`)

Nova seção logo abaixo da Seção 2 (Presenças), com o mesmo padrão de `SectionHeading` já usado nas demais. Componente novo `match-scouts-section.tsx`.

```
┌──────────────────────────────────────────┐
│ (Seção 1 — Respostas)                     │
│ (Seção 2 — Presenças)                     │
├──────────────────────────────────────────┤
│ SCOUTS                    [ + Lançar ]    │  Seção 3 — heading + botão admin
│ ┌ Gols │ Amarelos │ Azuis │ Verm. │ Perf.┐ │  abas
│ │ ┌──────────────────────────────────┐  │ │
│ │ │ [foto]  Apelido            ⚽ 2  │  │ │  card enxuto + contador no slot
│ │ │         Linha                    │  │ │
│ │ └──────────────────────────────────┘  │ │
│ └────────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

- **Heading "Scouts"** + botão **"Lançar scouts"** ao lado, **visível apenas para admin** (gate de UI por capacidade `manage_matches`; a RPC reforça no servidor).
- Conteúdo em **abas**: `Gols · Amarelos · Azuis · Vermelhos · Performance · Goleiros` (mesmo componente `Tabs` da Seção 1; ver §"Ajustes pós-aprovação" para Performance e Goleiros).
  - **Abas Gols / Amarelos / Azuis / Vermelhos:** lista de `PlayerMiniCard` dos jogadores **com aquele contador > 0**, ordenada por contador decrescente e, em empate, alfabética. O número aparece no slot `trailing` do card.
  - **Aba Performance / Goleiros:** lista dos jogadores com `vitórias + empates > 0`, ordenada por **pontos** (`vitórias × 3 + empates`), depois **frequência**, depois alfabética. Performance traz jogadores de linha; Goleiros traz goleiros. O `trailing` mostra os pontos em destaque e, abaixo, `Nv · Ne · frequência`.
- **Estados:**
  - **Sem presenças lançadas** (a RPC volta vazia): `EmptyState` "Lance as presenças desta pelada antes de registrar os scouts." — as abas não aparecem.
  - **Com presenças, mas aba sem ninguém pontuado:** `EmptyState` por aba — "Nenhum gol lançado.", "Nenhum cartão amarelo.", "Nenhum cartão azul.", "Nenhum cartão vermelho.", "Nenhuma vitória ou empate lançado."
  - **Loading:** skeletons de card.
  - **Erro:** `Alert` destructive com "Tentar novamente".
- **Ordem das seções:** Respostas → Presenças → Scouts.

### Modal "Lançar scouts"

Acionado pelo botão da Seção 3. Responsivo, mesmo padrão do app (`useMediaQuery`): `<Dialog>` no desktop (`>= sm`), `<Sheet bottom>` no mobile. Componente novo `record-scouts-modal.tsx`.

```
┌──────────────────────────────────────────┐
│ Lançar scouts                         ✕  │
│ Registre os números de cada jogador.      │
├──────────────────────────────────────────┤
│ [ 🔍 Buscar jogador ]                     │
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │
│ │ [foto] Apelido · Linha               │ │  uma "ficha" por jogador presente
│ │  Gols   Amarelos  Azuis              │ │
│ │  [ 2 ]   [ 0 ]    [ 0 ]              │ │  inputs numéricos inteiros
│ │  Verm.  Vitórias  Empates            │ │
│ │  [ 0 ]   [ 3 ]    [ 1 ]              │ │
│ └──────────────────────────────────────┘ │
│ ...                                        │
├──────────────────────────────────────────┤
│              [ Cancelar ] [ Lançar ]      │
└──────────────────────────────────────────┘
```

- Ao abrir, carrega `list_match_scouts(matchId)` — todos os presentes, **já com os valores gravados** preenchidos em cada campo (zero quando ainda não lançado). É isto que satisfaz o requisito de recuperação: fechar e reabrir traz de volta o último lançamento.
- **Formulário via React Hook Form + Zod** (CLAUDE.md §9), com `useFieldArray` — um grupo de seis campos por jogador. Schema em `features/matches/schemas/match-scouts.schema.ts`.
- Cada jogador é uma **ficha**: `PlayerMiniCard` (foto + apelido + posição) no topo e, abaixo, os seis campos numéricos rotulados num grid (mobile-first: 3 colunas × 2 linhas no viewport de 360px).
- Campos são **inputs numéricos inteiros**: `inputmode="numeric"`, aceitam apagar e digitar; valor vazio é interpretado como `0`. Zod: `z.coerce.number().int().min(0).max(99)` por campo.
- **Busca** em memória por apelido OU nome completo, normalizada NFD (ignora acentos) — mesmo helper de `/team` e do modal da Spec 003. Filtra quais fichas aparecem; **não** apaga os valores digitados das fichas ocultas.
- Rodapé: "Cancelar" e "Lançar". **"Lançar" fica desabilitado** enquanto o formulário não estiver `dirty` (nada a gravar) e enquanto `isPending`.
- "Lançar" dispara `record_match_scouts(matchId, entries)` com a lista completa dos presentes. Em sucesso: fecha o modal, toast de confirmação, invalida as queries de scouts da pelada e da lista de `/team`.
- **Estados do modal:**
  - **Sem presentes** (nenhum check-in na pelada): o modal abre com `EmptyState` "Lance as presenças desta pelada antes de registrar os scouts." e **sem** botão "Lançar".
  - **Busca sem resultado:** "Nenhum jogador encontrado."
  - **Loading:** skeletons de ficha.
  - **Erro:** `Alert` destructive com "Tentar novamente".

### Integração no card de `/team`

`PlayerListCard` hoje mostra `Gols: —` e `Pontos: —` como placeholders. Com a recriação de `list_players_public`:

- **Gols** ← `total_goals` (inteiro; `0` é valor válido e exibido como `0`).
- **Pontos** ← `total_points` (inteiro).
- **Frequência** ← inalterada.

O tipo `PlayerListItem` (em `use-team-players.ts`) ganha `total_goals` e `total_points`; os tipos do banco são regerados (`pnpm gen:types`).

### Camada de dados (hooks)

Em `features/matches/api/`:

- `useMatchScouts(matchId)` — query (`list_match_scouts`). Consumida pela Seção 3 **e** pelo modal (mesma fonte; o modal preenche o formulário a partir dela).
- `useRecordMatchScouts()` — mutation (`record_match_scouts`); em `onSuccess` invalida `matchKeys.scouts(matchId)` e as keys da lista de `/team` (`teamKeys.all`).
- Cache key padronizada em `keys.ts` da feature: `matchKeys.scouts(matchId)` → `['matches','scouts',matchId]`.
- A UI não chama `supabase` direto.

### Autorização — nova superfície

**Em uma frase:** admin passa a poder inserir e atualizar linhas em `match_scouts` (exclusivamente via RPC `security definer` com checagem `is_admin()`, e só para jogadores que já têm check-in na pelada); qualquer profile aprovado pode ler os scouts; ninguém escreve direto na tabela; remover um check-in ou excluir a pelada apaga os scouts em cascata.

## Comportamento esperado

### Fluxo feliz

1. Admin abre `/matches/:id`. Abaixo das Seções 1 e 2, vê a **Seção 3 — Scouts**.
2. Clica em **"Lançar scouts"**. O modal abre com uma ficha por jogador presente, cada campo já preenchido com o que houver gravado (zeros na primeira vez).
3. Admin digita os números do dia em cada ficha. Pode buscar por nome para achar um jogador específico.
4. Clica em **"Lançar"**. Os scouts são gravados (upsert); o modal fecha; toast confirma; a Seção 3 atualiza e o card de `/team` recalcula Gols/Pontos.
5. Reabrindo o modal, todos os campos trazem de volta os últimos valores gravados.
6. Para corrigir (ex.: lançou 1 gol, foram 2), o admin apaga o `1`, digita `2` e relança — o valor anterior é sobrescrito.
7. Se o admin remover a presença de um jogador (Seção 2, Spec 003), os scouts daquele jogador naquela pelada são apagados junto.

### Regras de autorização

- Lançar scouts: **apenas admin**, garantido por RLS (sem policies de escrita) + RPC com `is_admin()`.
- Ler scouts: qualquer profile `approved` (player ou spectator) — a Seção 3 é visível a todos os aprovados.
- O botão "Lançar scouts" é gate de UX por capacidade; a barreira real é a RPC.

### Estados de tela

- **Seção 3 — loading:** skeletons de card.
- **Seção 3 — erro:** `Alert` destructive com "Tentar novamente".
- **Seção 3 — sem presenças:** `EmptyState` apontando para o lançamento de presenças.
- **Seção 3 — aba sem pontuação:** `EmptyState` específico da aba.
- **Modal — loading:** skeletons de ficha.
- **Modal — erro:** `Alert` destructive com "Tentar novamente".
- **Modal — sem presentes:** `EmptyState` apontando para presenças, sem botão "Lançar".
- **Modal — busca sem resultado:** "Nenhum jogador encontrado."

### Atualização

- Sem realtime. Após lançar, a Seção 3 e o card de `/team` atualizam por invalidação de query. Refetch on focus padrão do React Query.

## Dependências

- **Depende da Spec 003** (`match_check_ins`) — já entregue. A FK composta de `match_scouts` aponta para `match_check_ins`.
- Recria `list_players_public` (drop + create) — terceira recriação da função.

## Ajustes pós-aprovação

Refinamentos pedidos durante a implementação, já entregues:

1. **`list_match_scouts` devolve `check_in_count` e `total_match_count`** (migration extra `20260516120003`, drop + create da função). São os insumos da **frequência** geral do jogador (check-ins ÷ peladas criadas), igual ao card de `/team`. Não muda a superfície de autorização.
2. **Seção 2 — Presenças encurtada.** A lista mostra os **10 primeiros** presentes; um label clicável **"Mostrar mais (N)"** revela o restante (alterna com "Mostrar menos"). A contagem do heading segue mostrando o total. (É um ajuste na seção da Spec 003, feito no escopo desta spec.)
3. **Aba Performance — frequência como critério de desempate.** Ordenação: pontos → frequência → alfabética. A frequência aparece de forma discreta na microlinha do `trailing` (`Nv · Ne · frequência`). A aba mostra os **8 primeiros**; havendo mais, label clicável **"Ver mais (N)"**.
4. **Nova aba "Goleiros".** Os goleiros (`preferred_position = 'goalkeeper'`) saem da aba Performance e ganham aba própria, com as **mesmas regras** de ordenação. Mostra apenas o **melhor goleiro** (top 1); o label **"Ver mais (N)"** revela os demais. A aba Performance passa a listar só jogadores de linha.
5. **`TabsList` rolável só no mobile** (`overflow-x-auto sm:overflow-x-visible`) — as 6 abas cabem no desktop sem barra de rolagem.

## Critérios de aceite

- [ ] Tabela `match_scouts` criada com PK composta `(match_id, player_id)`, FK composta `(match_id, player_id)` → `match_check_ins` `on delete cascade`, `updated_by` FK → `profiles` `on delete restrict`, os seis contadores `integer not null default 0` com `check >= 0`, e `updated_at`. RLS habilitada, policy de `select` para aprovados, **sem** policies de `insert`/`update`/`delete`.
- [ ] **Sem trigger** em `match_scouts` — a coerência vem só da FK em cascata.
- [ ] Remover um `match_check_ins` (RPC da Spec 003) apaga em cascata os `match_scouts` correspondentes; excluir a pelada apaga ambos.
- [ ] RPC `record_match_scouts(p_match_id, p_entries jsonb)` `security definer`: checa `is_admin()`, faz upsert em lote (`ON CONFLICT DO UPDATE`), ignora entries de jogadores sem check-in, trata campos nulos como 0, no-op em array vazio, atualiza `updated_at`/`updated_by`.
- [ ] RPC `list_match_scouts(p_match_id)` `security definer`: caller aprovado; `LEFT JOIN` presentes × scouts com `coalesce` 0; shape e ordenação base conforme §"Entidade".
- [ ] RPC `list_players_public` recriada com `total_goals` (Σ gols) e `total_points` (Σ vitórias×3 + empates), mantendo todos os campos anteriores.
- [ ] Tipos do banco regerados (`pnpm gen:types`) e commitados.
- [ ] Tela `/matches/:id` ganha a **Seção 3 — Scouts** abaixo da Seção 2, com `SectionHeading`, botão "Lançar scouts" (admin) e abas `Gols · Amarelos · Azuis · Vermelhos · Performance`.
- [ ] Abas de cartões/gols listam jogadores com contador > 0, ordenados decrescente; aba Performance ordena por pontos (`vit×3 + emp`) e exibe pontos + vitórias/empates.
- [ ] Modal "Lançar scouts" responsivo (`Dialog` desktop / `Sheet` mobile), com uma ficha por jogador presente, seis campos numéricos inteiros por ficha, busca em memória, e recuperação dos valores já gravados ao reabrir.
- [ ] Formulário via React Hook Form + Zod; campos validados como inteiros `>= 0` (máx. 99); valor vazio interpretado como 0.
- [ ] "Lançar" grava via `record_match_scouts`, é upsert (último valor prevalece), fecha o modal, mostra toast e invalida as queries de scouts e de `/team`. "Lançar" desabilitado sem alterações ou durante o envio.
- [ ] Modal trata "sem presentes" (EmptyState apontando para presenças, sem botão) e "busca sem resultado".
- [ ] Card de `/team` exibe **Gols** e **Pontos** reais a partir de `total_goals`/`total_points`; **Frequência** inalterada.
- [ ] Hooks de API em `features/matches/api/`; a UI não chama `supabase` direto; cache keys padronizadas em `keys.ts`.
- [ ] Estados de loading, erro e vazio tratados na Seção 3 e no modal conforme §"Estados de tela".
- [ ] Layout testado em viewport 360px (com foco na grade de seis campos da ficha) e em desktop ≥ `lg`.
- [ ] Código de tabela/coluna/função/variável em inglês; textos exibidos em PT-BR; cores via tokens do design system.
