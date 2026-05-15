# Spec 003 — Lançar presenças

> Nomenclatura no código sempre em inglês (`match_check_ins`, `record_match_check_ins`, etc.), conforme CLAUDE.md §"idioma". Exibição na UI sempre em PT-BR.

## Contexto e objetivo

Hoje a tela de detalhes da pelada (`/matches/:id`, Spec 002) mostra apenas as **respostas** dos jogadores (RSVP: vai / talvez / não vai). Resposta é **intenção**, não fato — um jogador pode dizer "não vou" e ir, ou dizer "vou" e faltar.

Esta spec adiciona o **lançamento de presença**: o admin registra, na própria tela de detalhes, **quem de fato esteve presente** no dia da pelada. Esse é o dado que vale para estatística — a base da **frequência** de cada jogador com o grupo (o cálculo da frequência fica para spec futura; aqui só se cria a fonte de dados).

A tela de detalhes também é **reorganizada em seções nomeadas**, abrindo espaço para os scouts do dia (gols, cartões) em specs futuras.

## Escopo

**Nesta spec:**
- Nova tabela `match_check_ins` relacionando pelada × jogador presente.
- RPC admin para gravar presenças em lote (`record_match_check_ins`).
- RPC admin para remover uma presença lançada por engano (`remove_match_check_in`).
- RPCs de leitura: lista de presentes lançados e lista de candidatos ainda não lançados.
- Botão **"Lançar presença"** na tela de detalhes (somente admin), abrindo um modal de multi-seleção de jogadores.
- Botão de **remover** (ícone `X`) em cada jogador já lançado como presente (somente admin).
- Reorganização da tela `/matches/:id` em **seções nomeadas**:
  - **Seção 1 — Respostas:** as três abas de RSVP da Spec 002 (Confirmados / Talvez / Não vão), agora apenas leitura.
  - **Seção 2 — Presenças:** lista de quem foi lançado como presente + botão de lançamento + botão de remoção por jogador.
- Remoção, **na tela de detalhes**, dos botões de resposta e do chip "Sua resposta" (ver decisão 6).

**Fora desta spec (próximas):**
- Cálculo e exibição da frequência do jogador (percentual, ranking) — ver §"Nota sobre frequência".
- Scouts/eventos do dia (gols, cartões, assistências) — ganharão a Seção 3 da tela.
- Qualquer mudança no card de `/matches` (listagem) — o card continua exatamente como na Spec 002, inclusive os botões de resposta.

## Decisões

1. **`match_check_ins` é uma tabela nova, distinta de `match_attendances`.** A nomenclatura foi escolhida para evitar o choque "attendance × presence": `match_attendances` (Spec 002) modela a **resposta/intenção** (RSVP) e é **meramente informativa**; `match_check_ins` modela o **fato consumado** (esteve lá) e é a base de estatística. São independentes — um jogador pode ter respondido "não vou" e ainda assim ser lançado como presente, ou vice-versa. O que conta para frequência é **sempre** o check-in.
2. **`match_check_ins` referencia `players.id`**, não `profiles.id`. Presença/frequência é conceito do domínio *jogador*; espectadores nunca entram aqui.
3. **Sem trigger de limpeza.** Presença é fato histórico imutável. Se o jogador for depois marcado `inactive` ou arquivado, suas presenças já lançadas **permanecem** — caso contrário a frequência histórica seria corrompida. (Oposto do trigger da Spec 002 sobre `match_attendances`.)
4. **Lançamento é incremental, aditivo e reversível.** O modal lista **apenas** jogadores ainda não lançados naquela pelada; o admin pode lançar em várias rodadas. Um lançamento errado pode ser **desfeito** pelo botão de remover (ícone `X`) no jogador correspondente da Seção 2 — após a remoção, o jogador volta a aparecer no modal.
5. **"Lançar presença" está disponível tanto em pelada `open` quanto `closed`** — o fluxo normal é o admin lançar tudo (presenças, scouts) no dia seguinte, com a pelada possivelmente já fechada. O candidato a presença é **sempre** um jogador `active`/`injured` **no momento do lançamento**. Consequência aceita: se um jogador deixou o elenco (`inactive`/arquivado), ele não aparece no modal e **não há como lançá-lo retroativamente**. Na prática isso é raríssimo (o lançamento acontece em ≤ 1 dia), então é um trade-off aceito de propósito.
6. **Os botões de resposta e o chip "Sua resposta" saem da tela de detalhes.** A resposta de RSVP é dada **exclusivamente** pelos botões do **card em `/matches`** (Spec 002, inalterado). A tela de detalhes passa a ser uma tela de **consulta + lançamento de presença**, não de resposta. (Isto substitui o critério da Spec 002 que pedia a área de resposta também no topo da tela de detalhes — ver §"Impacto na Spec 002".)

## Entidade

### Tabela `match_check_ins`

| Campo | Tipo | Regras |
|---|---|---|
| `match_id` | uuid | FK → `matches.id` `on delete cascade` |
| `player_id` | uuid | FK → `players.id` `on delete restrict` |
| `checked_in_at` | timestamptz | `default now()`, não muda |
| `checked_in_by` | uuid | FK → `profiles.id` `on delete restrict`; admin que lançou, gerado de `auth.uid()` |
| **PK** | composta | `(match_id, player_id)` — impede duplicidade |

- `on delete cascade` em `match_id`: excluir a pelada apaga os check-ins junto (alinhado com o hard delete da Spec 001 e o disclaimer "lançamentos serão apagados").
- `on delete restrict` em `player_id`: jogadores nunca sofrem hard delete (apenas `archived_at`), então o restrict é só uma salvaguarda.
- **Sem trigger** de limpeza por mudança de `player_status`/`archived_at` (decisão 3).
- RLS habilitada. **Policy de `select`** para qualquer profile aprovado (player ou spectator). **Sem policies** de `insert`/`update`/`delete` — toda escrita passa pelas RPCs.

### RPC `record_match_check_ins(p_match_id uuid, p_player_ids uuid[])`

`security definer`. Grava presenças em lote.

- Checa `app.is_admin()` no topo; rejeita se não-admin.
- Rejeita se `p_match_id` não existir.
- Para cada `player_id` em `p_player_ids`, insere `(match_id, player_id, checked_in_by = auth.uid())`. Usa `ON CONFLICT (match_id, player_id) DO NOTHING` — reentrância e concorrência entre admins ficam inócuas.
- Considera elegível apenas jogador com `player_status in ('active','injured')` e `archived_at is null`; jogadores inelegíveis são ignorados (não abortam o lote).
- Array vazio é no-op (a UI já desabilita "Confirmar" com zero selecionados).

### RPC `remove_match_check_in(p_match_id uuid, p_player_id uuid)`

`security definer`. Remove um check-in lançado por engano.

- Checa `app.is_admin()` no topo; rejeita se não-admin.
- `DELETE` da linha `(p_match_id, p_player_id)` de `match_check_ins`. Idempotente — remover algo que não existe não é erro.

### RPC `list_match_check_in_candidates(p_match_id uuid)`

`security definer`. Lista os jogadores que **podem** ser lançados como presentes — alimenta o modal.

- Caller precisa ser admin (a UI já gateia, mas a RPC reforça).
- Retorna jogadores com `player_status in ('active','injured')`, `archived_at is null`, **e que ainda não estão** em `match_check_ins` para `p_match_id`.
- Shape por jogador: `player_id`, `profile_id`, `nickname`, `display_name`, `avatar_url`, `preferred_position` (join `players → profiles` para os campos de identidade/avatar).
- Ordenação: alfabética PT-BR por apelido, com fallback para `display_name`.

### RPC `list_match_check_ins(p_match_id uuid)`

`security definer`. Lista os jogadores **já lançados** como presentes — alimenta a Seção 2.

- Caller precisa estar aprovado (player ou spectator) — leitura é pública para aprovados.
- Retorna os jogadores presentes em `p_match_id`.
- Shape por jogador: `player_id`, `profile_id`, `nickname`, `display_name`, `avatar_url`, `preferred_position`, `checked_in_at`.
- Ordenação: alfabética PT-BR por apelido, com fallback para `display_name`.

## Solução proposta

### Reorganização da tela `/matches/:id`

A tela passa a ter **seções nomeadas e visualmente separadas**, cada uma com um heading sutil (mesma família de heading já usada nas seções de `/team` — reaproveitar o padrão existente). Layout mobile-first:

```
┌──────────────────────────────────────────┐
│ ← 17/05/2026 · 20:00              ABERTA  │  header: voltar + data/hora/status
├──────────────────────────────────────────┤
│ RESPOSTAS                                 │  Seção 1 — heading
│ ┌ Confirmados 7 │ Talvez 2 │ Não vão 1 ┐  │  abas (Spec 002), agora só leitura
│ │ ┌──────────────────────────────────┐ │  │
│ │ │ [foto]  Apelido                  │ │  │  card enxuto: foto, apelido, posição
│ │ │         Goleiro · Você           │ │  │
│ │ └──────────────────────────────────┘ │  │
│ └──────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│ PRESENÇAS · 5            [ + Lançar ]     │  Seção 2 — heading + contagem + botão admin
│ ┌──────────────────────────────────────┐  │
│ │ [foto]  Apelido                  [X] │  │  card enxuto + botão remover (admin)
│ │         Linha                        │  │
│ └──────────────────────────────────────┘  │
│ ...                                        │
├──────────────────────────────────────────┤
│ (spec futura: scouts do dia)               │
└──────────────────────────────────────────┘
```

- **O bloco de resposta some.** Os três botões (Eu vou / Não vou / Talvez) e o chip "Sua resposta" que ficavam no topo da tela (Spec 002 §"tela de detalhes") **são removidos** desta tela (decisão 6).
- **Seção 1 — Respostas:** mantém as três abas da Spec 002 (Confirmados / Talvez / Não vão), com contagem na label, cards enxutos de jogador ordenados por `responded_at asc`, marca "Você" e os mesmos empty states. Sem mudança de conteúdo — só passa a viver dentro de uma seção nomeada.
- **Seção 2 — Presenças:**
  - Heading "Presenças" com a contagem de lançados ao lado (`Presenças · 5`).
  - Botão **"Lançar presença"** (ícone `UserCheck` / `Plus`) ao lado do heading, **visível apenas para admin**. Gate de UI por capacidade; a RPC reforça no servidor.
  - Lista de cards enxutos de jogador (foto, apelido com fallback `display_name`, posição), ordenada alfabeticamente por apelido. **Mesmo componente de card** usado na Seção 1 — ver §"Reuso de componentes".
  - Cada card, **para admin**, exibe um botão de **remover** (ícone `X`) à direita. Clicar dispara `remove_match_check_in`; a remoção é **imediata, sem `AlertDialog`** (ação reversível — basta relançar pelo modal), com toast de confirmação. Espectador e player não veem o botão.
  - **Empty state:** "Nenhuma presença lançada ainda." (`EmptyState`).
  - Estados de loading (skeleton de cards) e erro (`Alert` destructive com "Tentar novamente"), padrão do app.
- **Ordem das seções:** Respostas → Presenças. A Seção 3 (scouts) entrará depois das Presenças.

### Modal "Lançar presença"

Acionado pelo botão da Seção 2. Responsivo, seguindo o padrão do app (`useMediaQuery`): `<Dialog>` no desktop (`>= sm`), `<Sheet bottom>` no mobile — mesmo padrão dos formulários da Spec 001.

```
┌──────────────────────────────────────────┐
│ Lançar presença                       ✕  │
│ Marque quem esteve presente nesta pelada. │
├──────────────────────────────────────────┤
│ [ 🔍 Buscar jogador ]                     │  busca em memória
├──────────────────────────────────────────┤
│ ☐  [foto]  Apelido · Goleiro              │
│ ☑  [foto]  Apelido · Linha       (sel.)   │  item selecionado: destaque visual
│ ☐  [foto]  Apelido · Linha                │
│ ...                                        │
├──────────────────────────────────────────┤
│ 1 selecionado     [ Cancelar ] [Confirmar]│
└──────────────────────────────────────────┘
```

- O modal carrega de `list_match_check_in_candidates` — só jogadores `active`/`injured` que **ainda não foram lançados** nesta pelada (decisão 4).
- Cada linha tem checkbox + foto + apelido (fallback `display_name`) + posição. A **linha inteira é clicável** para alternar a seleção; estado selecionado tem feedback visual claro (fundo destacado + checkbox marcado).
- **Busca** em memória por apelido OU nome completo, normalizada NFD (ignora acentos) — mesmo helper já usado em `/team`.
- Rodapé: contagem de selecionados + botões "Cancelar" e "Confirmar".
- **"Confirmar" fica desabilitado com zero selecionados.**
- "Confirmar" dispara `record_match_check_ins(matchId, selectedPlayerIds)`. Em sucesso: fecha o modal, toast de confirmação, e invalida as queries da Seção 2 e dos candidatos.
- **Empty states do modal (dois casos distintos):**
  - **Sem candidatos** — todos os jogadores ativos já foram lançados (ou não há jogadores ativos): o modal **abre normalmente, com a lista vazia** e o botão "Confirmar" **desabilitado**. Sem mensagem especial obrigatória.
  - **Busca sem resultado** — existem candidatos, mas o termo digitado não casou: "Nenhum jogador encontrado." (mensagem distinta da anterior).
- Estados de loading (skeleton de linhas) e erro tratados.
- A lista é uma lista rolável simples.

### Reuso de componentes

O card enxuto de jogador (foto + apelido + posição) já existe na tela de detalhes da Spec 002. Esta spec o reaproveita nas três situações, variando apenas o conteúdo à direita via slot/`children`:

- **Seção 1 (abas):** marca "Você" no próprio jogador (comportamento atual).
- **Seção 2 (presenças):** botão `X` de remover, só para admin.
- **Modal (candidatos):** checkbox de seleção.

Se hoje esse card estiver acoplado dentro do componente de abas, extraí-lo para um componente reutilizável (`features/matches/components/` ou `components/shared/`) faz parte desta spec.

### Camada de dados (hooks)

Em `features/matches/api/`:

- `useMatchCheckIns(matchId)` — query da Seção 2 (`list_match_check_ins`).
- `useMatchCheckInCandidates(matchId)` — query do modal (`list_match_check_in_candidates`), com `enabled` só quando o modal abre.
- `useRecordMatchCheckIns()` — mutation (`record_match_check_ins`); em `onSuccess` invalida as keys de check-ins e de candidatos da pelada.
- `useRemoveMatchCheckIn()` — mutation (`remove_match_check_in`); em `onSuccess` invalida as mesmas keys.
- Cache keys padronizadas em `keys.ts` da feature (ex.: `['matches','checkIns',matchId]`, `['matches','checkInCandidates',matchId]`).
- **Sem optimistic update** — lançamento/remoção são ações admin pontuais; refetch após sucesso é suficiente e mais seguro.

### Autorização — nova superfície

**Em uma frase:** admin passa a poder inserir e remover linhas em `match_check_ins` (exclusivamente via RPCs `security definer` com checagem `is_admin()`); qualquer profile aprovado pode ler a lista de presentes; ninguém escreve direto na tabela.

## Nota sobre frequência (cálculo fica para spec futura)

Esta spec só cria a fonte de dados. Fica registrado o modelo de cálculo decidido, para a spec futura ancorar:

- **Denominador:** toda pelada **criada** conta, independentemente de `status` (`open` ou `closed`).
- **Numerador:** cada check-in do jogador conta como uma presença.
- **Frequência = check-ins do jogador ÷ total de peladas criadas.**
- Exemplo: 2 peladas criadas (uma fechada, uma aberta), 1 check-in do jogador → frequência 50%. Ao lançar o check-in dele na segunda pelada → 100%.

O modelo `match_check_ins` + `matches` suporta esse cálculo diretamente (`count` de check-ins por `player_id` ÷ `count` de `matches`).

## Comportamento esperado

### Fluxo feliz

1. Admin abre `/matches/:id` de uma pelada. Vê a Seção 1 (Respostas) e a Seção 2 (Presenças).
2. Na Seção 2, clica em **"Lançar presença"**. Abre o modal com a lista de jogadores `active`/`injured` ainda não lançados.
3. Admin marca, via checkbox/linha, quem esteve presente. O contador de selecionados atualiza.
4. Clica em **"Confirmar"**. As presenças são gravadas; o modal fecha; toast confirma; a Seção 2 mostra os novos presentes e a contagem do heading sobe.
5. Reabrindo o modal, os jogadores recém-lançados **não aparecem mais** — só os que faltam.
6. Se lançou alguém errado, o admin clica no `X` daquele card na Seção 2; a presença é removida na hora e o jogador volta a aparecer no modal.

### Regras de autorização

- Lançar / remover presença: **apenas admin**, garantido por RLS (sem policies de escrita) + RPCs com `is_admin()`.
- Ler presenças: qualquer profile `approved` (player ou spectator) — Seção 2 é visível a todos os aprovados.
- Botão "Lançar presença" e botão `X` são gate de UX por capacidade; a barreira real é a RPC.

### Estados de tela

- **Seção 2 — loading:** skeletons de card.
- **Seção 2 — erro:** `Alert` destructive com "Tentar novamente".
- **Seção 2 — vazia:** `EmptyState` "Nenhuma presença lançada ainda."
- **Modal — loading:** skeletons de linha.
- **Modal — erro:** `Alert` destructive com "Tentar novamente".
- **Modal — sem candidatos:** modal abre com lista vazia e "Confirmar" desabilitado.
- **Modal — busca sem resultado:** "Nenhum jogador encontrado."

### Atualização

- Sem realtime. Após lançar ou remover, a Seção 2 e a lista de candidatos atualizam por invalidação de query. Refetch on focus padrão do React Query.

## Impacto na Spec 002

A decisão 6 **substitui** o critério da Spec 002 que dizia *"a mesma área de ação de presença aparece também no topo da tela de detalhes"*. A partir desta spec, os botões de resposta e o chip "Sua resposta" existem **somente no card de `/matches`**. A Spec 002 deve ser anotada (ou seu critério marcado como superado) para não restar conflito documental.

## Critérios de aceite

- [ ] Tabela `match_check_ins` criada com PK composta `(match_id, player_id)`, FK `on delete cascade` para `matches`, FK `on delete restrict` para `players` e `profiles` (`checked_in_by`), colunas `checked_in_at` e `checked_in_by`. RLS habilitada, policy de `select` para aprovados, **sem** policies de `insert`/`update`/`delete`.
- [ ] **Sem trigger** de limpeza de `match_check_ins` por mudança de `player_status`/`archived_at` — presença é fato histórico (decisão 3).
- [ ] RPC `record_match_check_ins(p_match_id, p_player_ids[])` `security definer`: checa `is_admin()`, insere em lote com `ON CONFLICT DO NOTHING`, ignora inelegíveis, no-op em array vazio.
- [ ] RPC `remove_match_check_in(p_match_id, p_player_id)` `security definer`: checa `is_admin()`, `DELETE` idempotente.
- [ ] RPC `list_match_check_in_candidates(p_match_id)` `security definer`: só admin; retorna jogadores `active`/`injured`, não arquivados, **ainda não lançados**; shape e ordenação conforme §"Entidade".
- [ ] RPC `list_match_check_ins(p_match_id)` `security definer`: caller aprovado; retorna os jogadores já lançados; shape e ordenação conforme §"Entidade".
- [ ] Tela `/matches/:id` reorganizada em seções nomeadas: **Seção 1 — Respostas** (abas da Spec 002, agora só leitura) e **Seção 2 — Presenças**.
- [ ] Botões de resposta (Eu vou / Não vou / Talvez) e chip "Sua resposta" **removidos da tela de detalhes** (decisão 6). O card de `/matches` permanece inalterado, com seus botões.
- [ ] Seção 2 mostra heading "Presenças" com contagem, lista de cards enxutos ordenada por apelido, botão "Lançar presença" (admin) e botão `X` de remover por card (admin), com remoção imediata + toast.
- [ ] Modal "Lançar presença" responsivo (`Dialog` desktop / `Sheet` mobile), com lista de candidatos multi-selecionável (checkbox + linha clicável + feedback visual), busca em memória, contador de selecionados, "Confirmar" desabilitado com zero selecionados.
- [ ] Confirmar grava via `record_match_check_ins`, fecha o modal, mostra toast e invalida as queries de check-ins e de candidatos. Itens lançados/removidos deixam de aparecer / reaparecem no modal corretamente.
- [ ] Modal trata os dois casos de lista vazia: "sem candidatos" (abre vazio, "Confirmar" desabilitado) e "busca sem resultado" ("Nenhum jogador encontrado.").
- [ ] Card enxuto de jogador reaproveitado nas três situações (aba, presença, candidato) via slot — extração para componente reutilizável se necessário.
- [ ] Hooks de API em `features/matches/api/`; a UI não chama `supabase` direto; cache keys padronizadas.
- [ ] Estados de loading, erro e vazio tratados na Seção 2 e no modal conforme §"Estados de tela".
- [ ] FK `on delete cascade` confirmada: excluir a pelada apaga os `match_check_ins` junto.
- [ ] Layout testado em viewport 360px e em desktop ≥ `lg`.
- [ ] Código de tabela/coluna/função/variável em inglês; textos exibidos em PT-BR; cores via tokens do design system.
