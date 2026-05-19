# Spec 006 — Tela de financeiro (lançamentos)

> Nomenclatura no código sempre em inglês (`transactions`, `create_transaction`, etc.), conforme CLAUDE.md §"idioma". Exibição na UI sempre em PT-BR.

## Contexto e objetivo

A Spec 005 entregou a configuração de **tipos de lançamento** (`transaction_types`) — a peça de preparação do módulo financeiro. Esta spec entrega o módulo em si: a **tela de financeiro**, onde o admin registra os lançamentos da pelada (mensalidades recebidas, pagamento do campo, do juiz, etc.) e qualquer membro aprovado consulta o que está acontecendo.

Um **lançamento** (`transaction`) é uma movimentação financeira: uma data, um tipo, uma operação (receita ou despesa), um valor, opcionalmente um jogador, e o controle de pagamento (data e valor pago, com suporte a pagamento parcial).

A tela tem duas partes:

1. **Pesquisa** — lista de todos os lançamentos, agrupada por mês/ano, com scroll infinito e filtros.
2. **Cadastro** — criar/editar lançamentos (admin), e visualizar o detalhe de um lançamento (qualquer membro aprovado).

## Escopo

**Nesta spec:**
- Nova tabela `transactions` (lançamentos financeiros) com RLS, mais os enums `transaction_operation` e `transaction_status`.
- RPCs `security definer`: `create_transaction`, `update_transaction`, `delete_transaction` (admin), `list_transactions` (leitura paginada + filtros) e `list_player_options` (jogadores do elenco para o picker), ambas para qualquer aprovado.
- Recriação de `delete_transaction_type` para recusar — com mensagem amigável em PT-BR — a exclusão de um tipo de lançamento **em uso** por algum lançamento (resolve a pendência registrada na Spec 005).
- Nova rota `/finance`: lista com agrupamento por mês, scroll infinito (20 por página), filtros de operação e status (server-side), filtro de apelido (client-side) e ação "Limpar filtros".
- Modal de criar/editar lançamento (admin) e sheet de detalhe (qualquer aprovado).
- Nova capacidade `manage_finance`; atalho no header da home para qualquer aprovado.
- Extração de helpers compartilhados para `lib/` (ver §"Decisões de implementação").

**Fora desta spec (próximas):**
- Saldo, totais, relatórios, gráficos, fechamento de mês.
- **Geração de mensalidades em lote** a partir de um tipo de lançamento.
- Histórico de múltiplos pagamentos por lançamento (ver Decisão 3 — o pagamento é um par único de campos).
- Marcação de pago em massa, exportação, integração Pix.
- Edição dos `transaction_types` — permanece em `/admin/settings` (Spec 005).
- Notificações de cobrança.

## Decisões

1. **Leitura para qualquer aprovado; escrita só admin.** Qualquer profile `approved` (player ou spectator) vê **todos** os lançamentos e abre o detalhe de qualquer um — sem filtrar por "os meus". Criar, editar e excluir é exclusivo do admin. RLS: `select` para `app.is_approved()`, **sem** policies de escrita; escrita via RPCs `security definer` com `app.is_admin()`.

2. **Status é coluna gerada, nunca armazenada à mão.** `status` é uma coluna `generated always as (...) stored`, derivada de `amount_cents` e `paid_amount_cents` — três estados (mesmo critério de "Pontos" derivado da Spec 004):
   - `paid_amount_cents` nulo → **`open`** (aberto): nenhum pagamento informado.
   - `0 < paid_amount_cents < amount_cents` → **`partial`** (parcial): pagamento adiantado/parcial.
   - `paid_amount_cents = amount_cents` → **`paid`** (pago): quitado integralmente.

3. **O pagamento é um par único de campos, sem histórico.** `paid_amount_cents` + `paid_on` são **um** par — o valor pago acumulado e a data do último pagamento. Não há tabela de parcelas/recebimentos. Registrar um adiantamento (ex.: jogador pagou R$ 50 de R$ 100) é **editar** o lançamento, pondo `paid_amount_cents = 50`. Os dois campos viajam juntos: **ambos preenchidos ou ambos vazios** (check no banco).

4. **`paid_amount_cents` não pode exceder `amount_cents`.** Check no banco (`paid_amount_cents <= amount_cents`) e validação espelhada no Zod. `amount_cents` é sempre `> 0`. Consequência: `status = 'paid'` só quando `paid_amount_cents` for exatamente igual a `amount_cents`.

5. **Lançamento `paid` é imutável — só pode ser excluído.** Uma vez quitado (`status = 'paid'`), o lançamento **não pode ser editado**: para corrigir, o admin exclui e lança de novo. `update_transaction` rejeita a edição quando o status atual é `paid`; a UI não oferece "Editar" para lançamentos pagos. Lançamentos `open` e `partial` continuam editáveis (é assim que se registra o adiantamento). Decisão do usuário.

6. **A data do lançamento é `date` (sem hora).** O usuário disse que "pode guardar data/hora"; modelamos como `date` — a hora não tem uso funcional, o agrupamento da lista é por mês/ano, e `date` evita atrito de fuso (mesmo critério do `match_date` das peladas). `occurred_on` tem **default hoje** (data local do cliente) e é **livremente editável**. `paid_on` também é `date`.

7. **Operação (receita/despesa) é por lançamento.** `transaction_types` não tem direção (Spec 005, Decisão 2). Cada lançamento carrega sua `operation` (`income`/`expense`). Despesas também têm controle de pagamento — o modelo é simétrico.

8. **Vínculo com jogador é opcional e aponta para o elenco.** `transactions.player_id` referencia `players(id)` (`on delete restrict`, nullable) — é um lançamento **no jogador do elenco**, sem qualquer relação com presença/escalação numa pelada específica. O picker do formulário lista jogadores com `player_status` `active` ou `injured` (DM), via a RPC `list_player_options`. (Em modo edição, se o jogador do lançamento estiver fora dessa lista — virou inativo —, o formulário ainda exibe a seleção atual.)

9. **`transaction_type_id` é `on delete restrict`; `delete_transaction_type` ganha guarda.** A FK impede o banco de apagar um tipo em uso. `delete_transaction_type` (Spec 005) é **recriada** para checar `exists` em `transactions` antes do `delete` e levantar um erro com mensagem em PT-BR — **`errcode 'P0001'`** (genérico, **não** mapeado por `mapSupabaseError`, para que a mensagem específica da RPC chegue ao usuário; usar `23503` faria o `mapSupabaseError` sobrescrever com texto genérico). Resolve a pendência registrada na Spec 005.

10. **Filtros de operação e status são server-side; apelido é client-side; há "Limpar filtros".** Operação e status entram na RPC `list_transactions` e na `queryKey` — mudá-los reseta a paginação. O filtro de **apelido** é em memória, sobre os lançamentos já carregados (o usuário pediu "filtrar em objeto na tela"). Uma ação **"Limpar filtros"** reseta os três para o padrão (operação e status em "Todos", apelido vazio). **Limitação assumida:** o filtro de apelido só alcança o que já foi carregado.

11. **Scroll infinito de 20, sempre os mais recentes.** A lista vem ordenada por `occurred_on desc` (depois `created_at desc`, `id desc` — desempate estável); a primeira página são os **20 lançamentos mais recentes**, e rolar carrega os próximos 20. O **agrupamento por mês** é visual, por adjacência (igual à tela `/matches`): um cabeçalho de mês (`maio/2026 ───`) é inserido quando a data muda de mês na sequência ordenada — o usuário sempre sabe de que mês cada bloco é.

12. **Escolher um tipo com valor sugerido pré-preenche o Valor, confirmando a sobreposição.** Ao selecionar um `transaction_type` que tem `suggested_amount_cents`: se o campo Valor estiver **vazio**, é preenchido silenciosamente; se **já tiver um valor**, abre um diálogo de confirmação com disclaimer ("o valor atual será substituído pelo valor sugerido do tipo") — só sobrescreve se o admin confirmar. A troca do tipo em si sempre acontece; só a sobreposição do valor é confirmada.

13. **O seletor de tipo lista só tipos ativos; tipo é obrigatório.** O picker mostra apenas `transaction_types` com `is_active = true`. Sem tipo não há lançamento. Um lançamento já existente **mantém** seu tipo mesmo que ele seja inativado depois (a leitura traz a descrição via join). Se não houver **nenhum** tipo ativo, o formulário mostra um aviso apontando para `/admin/settings` e desabilita "Salvar".

14. **Sem realtime, sem optimistic update, sem `approval_history`.** Lançamentos são dado de rotina; refetch/invalidação após mutation basta.

## Entidade

### Campos do lançamento

- **Obrigatórios:** data do lançamento, tipo, operação (receita/despesa), valor.
- **Opcionais:** jogador, data de pagamento, valor pago, observação. (Data de pagamento e valor pago são opcionais, mas presos entre si — Decisão 3.)

### Enums

- `transaction_operation`: `'income'` | `'expense'` (receita | despesa).
- `transaction_status`: `'open'` | `'partial'` | `'paid'` (aberto | parcial | pago).

### Tabela `transactions`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid | PK, `default gen_random_uuid()` |
| `occurred_on` | date | `not null`, `default current_date` — data do lançamento (editável) |
| `transaction_type_id` | uuid | `not null`, FK → `transaction_types(id)` `on delete restrict` |
| `player_id` | uuid | `nullable`, FK → `players(id)` `on delete restrict` |
| `operation` | transaction_operation | `not null` |
| `amount_cents` | integer | `not null`, `check (amount_cents > 0)` |
| `paid_amount_cents` | integer | `nullable`, `check (paid_amount_cents is null or (paid_amount_cents > 0 and paid_amount_cents <= amount_cents))` |
| `paid_on` | date | `nullable` |
| `notes` | text | `nullable`, `check (notes is null or char_length(notes) <= 500)` |
| `status` | transaction_status | **coluna gerada** `generated always as (case when paid_amount_cents is null then 'open' when paid_amount_cents >= amount_cents then 'paid' else 'partial' end) stored` |
| `created_at` | timestamptz | `not null default now()` |
| `updated_at` | timestamptz | `not null default now()` |
| `created_by` | uuid | `not null`, FK → `profiles(id)` `on delete restrict` |

- **Check** `transactions_payment_pair`: `(paid_amount_cents is null) = (paid_on is null)` — valor pago e data de pagamento ambos preenchidos ou ambos vazios.
- **Índice** `transactions_order_idx` sobre `(occurred_on desc, created_at desc, id desc)`.
- Índices auxiliares em `transaction_type_id` e `player_id`.
- RLS habilitada e forçada. **Policy de `select`** para `app.is_approved()`. **Sem** policies de escrita.
- `updated_at` é setado explicitamente na RPC de update (sem trigger).

### RPC `create_transaction(...)`

`security definer`. Cria um lançamento. Args: `p_occurred_on date`, `p_transaction_type_id uuid`, `p_operation transaction_operation`, `p_amount_cents integer`, `p_player_id uuid default null`, `p_paid_amount_cents integer default null`, `p_paid_on date default null`, `p_notes text default null`.

- Checa `app.is_admin()`; rejeita se não-admin (`42501`).
- Valida: `p_amount_cents > 0`; `p_paid_amount_cents` (quando informado) `> 0` e `<= p_amount_cents`; par `paid_amount`/`paid_on` ambos preenchidos ou ambos nulos; `p_occurred_on`/`p_transaction_type_id`/`p_operation` não nulos. Erros de negócio com `errcode 22023`.
- `INSERT` com `created_by = auth.uid()`. Retorna a linha criada (`public.transactions`, inclui `status`).

### RPC `update_transaction(...)`

`security definer`. Atualiza um lançamento (full-replace dos campos editáveis). **Sem argumentos com `default`** — mesma decisão da Spec 005: full-replace exige chamada explícita. Args: `p_id` + os mesmos oito campos do create.

- Checa `app.is_admin()`; rejeita se não-admin.
- Carrega o lançamento; rejeita se `p_id` não existir (`errcode P0002`, "lançamento não encontrado").
- **Rejeita se o status atual for `paid`** (`errcode 22023`, "lançamentos pagos não podem ser editados; exclua e lance um novo") — Decisão 5.
- Mesmas validações de valor do create.
- `UPDATE` dos campos + `updated_at = now()`. Retorna a linha atualizada.

### RPC `delete_transaction(p_id uuid)`

`security definer`. Hard delete.

- Checa `app.is_admin()`; rejeita se não-admin.
- Rejeita se `p_id` não existir (`errcode P0002`, "lançamento não encontrado").
- `DELETE` da linha. Retorna `void`.

### RPC `list_transactions(p_limit integer, p_offset integer, p_operation transaction_operation default null, p_status transaction_status default null)`

`security definer`, `stable`. Lista paginada — alimenta o scroll infinito.

- Caller precisa estar aprovado (`app.is_approved()`); rejeita senão.
- `JOIN` com `transaction_types` (descrição), `LEFT JOIN` com `players`/`profiles` (apelido/nome do jogador), `JOIN` com `profiles` do criador (nome).
- Filtra por `operation`/`status` quando os parâmetros não forem nulos.
- Ordena por `occurred_on desc, created_at desc, id desc`. Aplica `limit p_limit offset p_offset`.
- Shape por linha: `id`, `occurred_on`, `transaction_type_id`, `type_description`, `player_id`, `player_nickname`, `player_display_name`, `operation`, `amount_cents`, `paid_amount_cents`, `paid_on`, `status`, `notes`, `created_at`, `created_by`, `created_by_name`.

### RPC `list_player_options()`

`security definer`, `stable`. Jogadores do elenco para o picker do formulário.

- Caller aprovado (`app.is_approved()`).
- Retorna jogadores com `player_status` em `('active','injured')`. Shape: `id` (`players.id`), `nickname`, `display_name`, `player_status`.
- Ordenado por `coalesce(lower(nickname), lower(display_name))`.

### RPC `delete_transaction_type(p_id uuid)` — recriada

A RPC da Spec 005 é recriada (`create or replace`):

- Mantém a checagem `app.is_admin()` e a de `id` inexistente.
- **Novo:** antes do `delete`, se `exists (select 1 from public.transactions where transaction_type_id = p_id)`, levanta `raise exception 'Este tipo de lançamento está em uso por lançamentos e não pode ser excluído.'` com `errcode 'P0001'` — código **não** mapeado por `mapSupabaseError`, de forma que a mensagem em PT-BR chegue ao usuário.

## Solução proposta

### Rota `/finance`

Nova rota dentro de `<RequireAuth />` (qualquer aprovado — leitura é liberada). Página composta em `pages/finance/`.

```
┌──────────────────────────────────────────┐
│ ← Financeiro              [ + Novo ]      │  back + ação (admin)
├──────────────────────────────────────────┤
│ [ Operação ▾ ] [ Status ▾ ]   Limpar      │  filtros + limpar (clicável)
│ [ 🔍 Filtrar por apelido ]                 │
├──────────────────────────────────────────┤
│ maio/2026 ───────────────────────────────  │  cabeçalho de mês
│ ┌──────────────────────────────────────┐ │
│ │ Mensalidade            ▸ Receita      │ │
│ │ Carlinhos · 12/05      + R$ 80,00     │ │
│ │ ● Pago                                │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Pagamento do campo     ▸ Despesa      │ │
│ │ Sem jogador · 10/05    − R$ 120,00    │ │
│ │ ● Aberto                              │ │
│ └──────────────────────────────────────┘ │
│ abril/2026 ──────────────────────────────  │
│ ...                                        │
│         (carregando mais lançamentos)      │
└──────────────────────────────────────────┘
```

- **Header:** voltar (`←`) para a home, título "Financeiro", e botão **"Novo lançamento"** — visível só para admin (`manage_finance`), no header em desktop e como **FAB** no mobile (padrão de `/matches`).
- **Filtros:**
  - **Operação:** `Select` — Todas · Receitas · Despesas (default Todas).
  - **Status:** `Select` — Todos · Aberto · Parcial · Pago (default Todos).
  - **Apelido:** `Input` de busca — filtra em memória, por apelido OU nome do jogador, normalizado NFD (helper compartilhado). Lançamentos sem jogador somem quando há texto digitado.
  - **Limpar filtros:** label clicável; aparece quando algum filtro não está no padrão; reseta operação/status para "Todos" e o campo de apelido para vazio.
- **Lista:** scroll infinito via `useInfiniteQuery` + `IntersectionObserver` (igual `/matches`), 20 por página. Cabeçalhos de mês por adjacência. Cada lançamento é um **card** clicável (`role="button"` + Enter/Space) que abre o sheet de detalhe.
- **Card:** descrição do tipo; chip de **operação** (Receita / Despesa); jogador (apelido, ou "Sem jogador") + data `occurred_on`; **valor** com sinal e cor (`+ R$ x` receita / `− R$ x` despesa); badge de **status** (Aberto / Parcial / Pago).
- **Estados:**
  - **Loading:** skeletons de card.
  - **Erro:** `Alert` destructive com "Tentar novamente".
  - **Vazio real** (nenhum lançamento na base): `EmptyState` — admin vê CTA "Novo lançamento"; não-admin vê texto neutro.
  - **Vazio por filtro** (operação/status sem resultado, ou apelido sem casar na tela): `EmptyState` "Nenhum lançamento para os filtros aplicados." com a ação **"Limpar filtros"** — sem CTA de criar.

### Modal de criar/editar lançamento

Botão "Novo lançamento" e a ação "Editar" (no detalhe, só para `open`/`partial`) abrem o **mesmo** formulário, responsivo (`useMediaQuery`): `<Dialog>` desktop / `<Sheet bottom>` mobile. Componente `transaction-form-modal.tsx`.

```
┌──────────────────────────────────────────┐
│ Novo lançamento                       ✕  │
├──────────────────────────────────────────┤
│ Data do lançamento  [ 18/05/2026       ] │  default hoje, editável
│ Tipo                [ - Selecione -  ▾ ] │  só tipos ativos, obrigatório
│ Operação            [ - Selecione -  ▾ ] │  Receita/Despesa, obrigatório
│ Valor               [ R$ 80,00         ] │  CurrencyInput, obrigatório
│ Jogador (opcional)  [ Sem jogador     ▾ ] │
│ ── Pagamento (opcional) ───────────────── │
│ Valor pago          [ R$ 50,00         ] │  CurrencyInput
│ Data de pagamento   [ 18/05/2026       ] │
│ Observação          [ ...               ]│  textarea, opcional
├──────────────────────────────────────────┤
│              [ Cancelar ] [ Salvar ]      │
└──────────────────────────────────────────┘
```

- **React Hook Form + Zod.** Schema em `features/finance/schemas/transaction.schema.ts`.
- Campos:
  - **Data do lançamento** — `input[type=date]`, default = hoje (data local), editável.
  - **Tipo** — `Select` com tipos ativos (`useTransactionTypes`, filtrando `is_active`), placeholder "- Selecione -", obrigatório.
  - **Operação** — `Select` Receita/Despesa, placeholder "- Selecione -", obrigatório.
  - **Valor** — `CurrencyInput` (compartilhado, Spec 005). Obrigatório, `> 0`, máx. R$ 999.999,99. Pré-preenchido pelo valor sugerido do tipo conforme Decisão 12.
  - **Jogador** — `Select` com "Sem jogador" (default) + jogadores de `list_player_options`.
  - **Valor pago** — `CurrencyInput`, opcional. Quando informado: `> 0` e `<= Valor`.
  - **Data de pagamento** — `input[type=date]`, opcional.
  - **Observação** — `Textarea`, opcional, máx. 500 caracteres.
- **Pré-preenchimento do Valor:** ao escolher/trocar o Tipo — se Valor vazio, preenche silenciosamente com o valor sugerido do tipo (se houver); se Valor já preenchido e o novo tipo tem valor sugerido, abre `AlertDialog` "O valor atual (R$ X) será substituído pelo valor sugerido de «Tipo» (R$ Y)." → "Substituir" sobrescreve, "Cancelar" mantém. A troca do tipo sempre se aplica.
- **Par de pagamento:** Zod `refine` — "valor pago" e "data de pagamento" ambos preenchidos ou ambos vazios.
- **Sem tipos ativos:** se `useTransactionTypes` não retorna nenhum ativo, o corpo do formulário mostra um `Alert` "Cadastre um tipo de lançamento em Configurações antes de criar um lançamento." (com link para `/admin/settings`) e "Salvar" fica desabilitado.
- O formulário **não** edita o status — derivado; mostrado como texto auxiliar ("Este lançamento ficará como: Parcial").
- Rodapé: "Cancelar" e "Salvar" (desabilitado sem alterações `dirty` e durante `isPending`).
- Sucesso: fecha, toast, invalida as queries de lançamentos.
- Erro "lançamento não encontrado" ou "pago não editável": toast + fecha + invalida a lista.

### Sheet de detalhe

Clicar num card abre `transaction-detail-sheet.tsx` (bottom sheet) com tudo em leitura: data, tipo, operação, jogador, valor, valor pago, data de pagamento, status, observação, e quem/quando criou (`created_by_name` + `created_at`). **Bloco de ações de admin** (só se viewer é admin):
- **"Excluir"** sempre disponível (abre `AlertDialog`).
- **"Editar"** disponível só para `open`/`partial`. Para um lançamento `paid`, em vez do botão aparece o texto "Lançamentos pagos não podem ser editados — exclua e lance novamente."

Não-admin vê só a leitura.

### Camada de dados (hooks)

Em `features/finance/api/`:

- `keys.ts` ganha `transactionKeys`: `all = ['finance','transactions']`, `list(filters) = [...all,'list',filters]` (filters = operação + status).
- `useTransactionsInfinite(filters)` — `useInfiniteQuery` sobre `list_transactions`; `getNextPageParam` avança o offset; última página quando vier menos de 20.
- `usePlayerOptions()` — query sobre `list_player_options` (para o picker).
- `useCreateTransaction()` / `useUpdateTransaction()` / `useDeleteTransaction()` — mutations; em `onSettled` invalidam `transactionKeys.all`.
- A UI não chama `supabase` direto. O picker de tipo reusa `useTransactionTypes` (Spec 005).

### Permissões

Nova capacidade `manage_finance` (admin) no union `Capability` (`features/auth/types.ts`) e em `usePermissions()`. Gate de UX para "Novo lançamento", "Editar" e "Excluir". A rota `/finance` fica sob `<RequireAuth />` simples. Atalho no header da home (ícone `Wallet`) visível para **qualquer aprovado**.

### Autorização — nova superfície

**Em uma frase:** admin passa a poder criar, editar (exceto lançamentos `paid`) e excluir linhas de `transactions` exclusivamente via RPCs `security definer` com `app.is_admin()`; qualquer profile aprovado lê todos os lançamentos e os jogadores do elenco via `list_transactions`/`list_player_options` (`app.is_approved()`); `transactions.transaction_type_id` referencia `transaction_types` e `transactions.player_id` referencia `players`, ambos `on delete restrict`, e `delete_transaction_type` é recriada para recusar, com mensagem em PT-BR, a exclusão de um tipo em uso.

## Comportamento esperado

### Fluxo feliz

1. Admin abre a home, clica no ícone de financeiro → `/finance`.
2. Vê os 20 lançamentos mais recentes, agrupados por mês; rola e mais 20 carregam.
3. Clica em **"Novo lançamento"**. A data vem como hoje. Escolhe o tipo "Mensalidade" — o campo Valor (vazio) é pré-preenchido com R$ 80,00. Escolhe Receita, o jogador, salva.
4. O lançamento aparece com status **Aberto** (sem valor pago).
5. O jogador adianta R$ 50: admin abre o detalhe → "Editar", põe Valor pago = R$ 50,00 + a data, salva → status **Parcial**.
6. O jogador quita: admin edita Valor pago para R$ 80,00 → status **Pago**. A partir daí o detalhe não oferece mais "Editar" — só "Excluir".
7. Um espectador abre `/finance`, vê todos os lançamentos, clica num card e lê o detalhe — sem botões de ação.
8. O admin filtra por "Despesas" + "Aberto", digita um apelido; depois clica em **"Limpar filtros"** e a lista volta ao padrão.
9. Em `/admin/settings`, excluir um tipo de lançamento já usado mostra "Este tipo de lançamento está em uso por lançamentos e não pode ser excluído."

### Regras de autorização

- Criar/editar/excluir lançamento: **apenas admin** (RLS sem write policy + RPC com `is_admin()`). Editar exige status `open`/`partial`.
- Ler lançamentos e abrir detalhe: qualquer profile `approved`.
- Botões de ação são gate de UX por `manage_finance`; a barreira real é a RPC.

### Estados de tela

- **Lista — loading / erro / vazio real / vazio por filtro:** skeletons / `Alert` "Tentar novamente" / `EmptyState` com CTA / `EmptyState` com "Limpar filtros".
- **Modal — validação:** erros inline (valor `<= 0`, valor pago `>` valor, par de pagamento incompleto, observação `> 500`, tipo/operação não selecionados).
- **Modal — sem tipos ativos:** `Alert` apontando para `/admin/settings`, "Salvar" desabilitado.
- **Modal / detalhe — lançamento inexistente ou pago não editável:** toast + fecha + invalida a lista.
- **Exclusão:** `AlertDialog` de confirmação antes da RPC.

### Atualização

- Sem realtime, sem optimistic update. Após cada mutation, a lista é invalidada e refaz o fetch. Trocar filtro de operação/status reseta a paginação.

## Dependências

- **Depende da Spec 005** (`transaction_types`) — entregue. `transactions.transaction_type_id` aponta para lá; o valor sugerido do tipo alimenta o pré-preenchimento.
- Reusa: `CurrencyInput` + `formatBRL` (Spec 005), `useTransactionTypes` (Spec 005), `SectionHeading`, `EmptyState`, `RequireAuth`, `useMediaQuery`, padrão de scroll infinito de `/matches`, primitivos shadcn (`Dialog`, `Sheet`, `Select`, `Textarea`, `AlertDialog`, `Form*`, `Input`).
- **Recria** `delete_transaction_type` — resolve a pendência da Spec 005 ([[finance-transaction-type-delete-guard]]).
- Sem dependência nova de npm.

## Decisões de implementação

- **Migrations:** três — `<ts>_transactions` (enums + tabela + coluna gerada + índices + RLS + policy de `select`), `<ts>_transactions_rpcs` (as RPCs `create/update/delete/list_transactions` + `list_player_options`) e `<ts>_transaction_types_delete_guard` (recria `delete_transaction_type`). Timestamps posteriores a `20260518120001`.
- **Extração de helpers compartilhados** (decisão do usuário — preservar reutilização):
  - `formatMonthLabel`, `monthKey`, `todayLocalIso` migram de `features/matches/lib/labels.ts` para um novo `src/lib/date.ts`; os imports em `features/matches` são atualizados. (`labels.ts` mantém o que é específico de peladas.)
  - A função `normalize` (NFD) — hoje duplicada em `pages/team` e nos modais de scout/presença — é extraída para `src/lib/utils.ts` e os três call sites passam a importá-la.
  - É refactor deliberado e mínimo, restrito a mover funções e ajustar imports.
- **Status como coluna gerada** (`generated always as ... stored`).
- **RPCs de update sem `default`:** os argumentos nullable de `update_transaction` virão tipados como não-nulos pelos tipos gerados do Supabase; o hook usa `as` cast nesses campos (mesmo padrão de `use-update-transaction-type` da Spec 005). `create_transaction` usa `default null` nos opcionais — o hook passa `undefined`.
- **Picker de jogador:** `Select` simples com "Sem jogador" + jogadores ativos/DM. Busca dedicada no picker fica como melhoria futura.
- **Indicador de operação/status:** `<span>` estilizado com tokens (mesma escolha da Spec 005 — sem shadcn `badge`). Receita usa tom `success`, Despesa tom `destructive`, discretos.
- **Paginação por `offset`:** simples e alinhada ao app; inserção/exclusão concorrente pode pular/duplicar uma linha entre páginas, mas a invalidação pós-mutation recarrega todas as páginas e cura. Limitação aceita.
- **Tipos do banco** regerados (`pnpm gen:types`) e commitados; policies documentadas em `supabase/policies/transactions.md`.
- **Testes:** o repo ainda não tem Vitest/RTL configurados (mesma situação das Specs 003–005); bootstrapar a infra fica fora do escopo.
- Sem `select('*')`, código de tabela/coluna/função em inglês, textos PT-BR, valores em formato pt-BR, cores via tokens.

## Ajustes pós-aprovação

Refinamentos pedidos durante a implementação, já entregues:

1. **Valor pago 0/vazio = lançamento aberto.** `0` deixou de ser erro de validação ("valor pago deve ser maior que zero"). `create_transaction`/`update_transaction` normalizam: valor pago `0` ou nulo → `paid_amount_cents` e `paid_on` viram `NULL`. Regra final: pago `0`/vazio → aberto; `0 < pago < valor` → parcial; `pago = valor` → pago.
2. **Lançamento pago voltou a ser editável** — a Decisão 5 (pago imutável) foi **revertida** a pedido do usuário. `update_transaction` recriada sem a trava; o disclaimer "pagos não podem ser editados" saiu da UI.
3. **Botão "Baixar"** — nova RPC `settle_transaction(p_id)` (admin) que quita um lançamento aberto (valor pago = valor, data = hoje) sem abrir o formulário. Botão verde **no card da listagem** e no sheet de detalhe, visível só para admin e só com status `open`, com `AlertDialog` de confirmação.
4. **Filtro de mês.** `list_transactions` recriada com `p_month` (1-12). Novo `Select` "Mês" antes de "Operação"; server-side, mantém a regra dos 20 por página. Os filtros de operação/status ganharam label e a opção passou a ser só "Todos"; uma ação "Limpar filtros" reseta tudo.
5. **Detalhe em modal no desktop** — `transaction-detail-sheet` virou responsivo (`Dialog` no desktop, `Sheet` no mobile). Regra versionada em `.claude/rules/ui-conventions.md` (importada pelo CLAUDE.md §18).
6. **Cards 2 por linha no desktop** — a listagem usa grid (`grid-cols-1` mobile, `sm:grid-cols-2`); container alargado para `max-w-4xl`.
7. **Formulário em linhas duplas** para evitar rolagem no modal: Operação+Tipo, Valor+Jogador, Valor pago+Data de pagamento.
8. **Menu principal da home colapsa no mobile** — abaixo de `sm` a fileira de ícones vira um botão "Menu" que abre uma gaveta com lista nome+ícone (`pages/home/main-menu.tsx`).
9. **Filtro de apelido** — lançamento sem jogador passa a ser filtrado pela descrição do tipo.

## Critérios de aceite

- [ ] Enums `transaction_operation` e `transaction_status` criados.
- [ ] Tabela `transactions` criada com `occurred_on date` (default hoje), `transaction_type_id` FK `on delete restrict`, `player_id` FK nullable `on delete restrict`, `operation`, `amount_cents > 0`, `paid_amount_cents` nullable com check `> 0 and <= amount_cents`, `paid_on`, `notes` (máx. 500), `created_by`, timestamps.
- [ ] Coluna `status` é `generated always as ... stored` com os três estados conforme Decisão 2; check `transactions_payment_pair` garante valor pago e data de pagamento ambos preenchidos ou ambos vazios.
- [ ] Índice de ordenação `(occurred_on desc, created_at desc, id desc)`.
- [ ] RLS habilitada; policy de `select` para `app.is_approved()`; **sem** policies de escrita.
- [ ] RPCs `create_transaction` / `update_transaction` / `delete_transaction` `security definer` com `app.is_admin()`; `create` com `default null` nos opcionais; `update` **sem args com `default`**, rejeita `id` inexistente e rejeita edição de lançamento `paid`; validações de valor e do par de pagamento no servidor.
- [ ] RPC `list_transactions` `security definer` `stable`: caller aprovado, joins de tipo/jogador/criador, filtros de operação/status, ordenação e paginação `limit/offset`, shape incluindo `created_by`/`created_by_name`.
- [ ] RPC `list_player_options` `security definer` `stable`: caller aprovado, jogadores `active`/`injured` com `players.id`, apelido e nome.
- [ ] `delete_transaction_type` recriada: recusa, com mensagem PT-BR (`errcode P0001`, não mapeado), a exclusão de um tipo em uso.
- [ ] Tipos do banco regerados (`pnpm gen:types`) e commitados; `supabase/policies/transactions.md` criado.
- [ ] Helpers `formatMonthLabel`/`monthKey`/`todayLocalIso` extraídos para `lib/date.ts` e `normalize` para `lib/utils.ts`, com os call sites existentes atualizados.
- [ ] Rota `/finance` sob `RequireAuth` simples; atalho no header da home para qualquer aprovado.
- [ ] Lista com scroll infinito (20/página) ordenada por data decrescente, agrupada por mês/ano por adjacência; card mostra tipo, operação, jogador, data, valor com sinal e status.
- [ ] Filtros de operação e status server-side (resetam a paginação); filtro de apelido client-side; ação "Limpar filtros" reseta os três ao padrão.
- [ ] Modal criar/editar via React Hook Form + Zod: data (default hoje), tipo (só ativos, obrigatório, "- Selecione -"), operação (Select obrigatório), valor obrigatório, jogador opcional, valor pago/data de pagamento opcionais (par completo), observação; pré-preenchimento do valor com confirmação de sobreposição; aviso quando não há tipos ativos; "Salvar" desabilitado sem alterações ou durante envio.
- [ ] Sheet de detalhe acessível a qualquer aprovado, mostrando inclusive quem/quando criou; bloco de ações só para admin; "Editar" só para `open`/`partial`; exclusão via `AlertDialog`.
- [ ] Capacidade `manage_finance` no union `Capability` e em `usePermissions()`; ações gated por ela.
- [ ] Hooks de API em `features/finance/api/`; a UI não chama `supabase` direto; cache keys padronizadas em `keys.ts`.
- [ ] Estados de loading, erro, vazio real e vazio por filtro tratados na lista; validação tratada no modal.
- [ ] Layout testado em viewport 360px e em desktop.
- [ ] Código de tabela/coluna/função/variável em inglês; textos em PT-BR; valores monetários e datas em formato pt-BR; cores via tokens do design system.
