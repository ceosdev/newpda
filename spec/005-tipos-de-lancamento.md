# Spec 005 — Tipos de lançamento (preparação do módulo financeiro)

> Nomenclatura no código sempre em inglês (`transaction_types`, `create_transaction_type`, etc.), conforme CLAUDE.md §"idioma". Exibição na UI sempre em PT-BR.

## Contexto e objetivo

O módulo financeiro (controlar mensalidade, pagamentos do campo, do juiz, etc.) é uma iteração grande que ainda não começou. Antes dele, esta spec entrega uma **peça de configuração** que ele vai consumir: o cadastro de **tipos de lançamento**.

Um tipo de lançamento é um rótulo reutilizável para movimentações financeiras da pelada — por exemplo "Mensalidade", "Pagamento do campo", "Pagamento do juiz". Cada tipo guarda:

- uma **descrição** (o nome do tipo);
- um **status ativo/inativo**;
- um **valor sugerido** (opcional).

Quando o módulo financeiro existir, uma futura funcionalidade de **gerar mensalidades** vai partir de um tipo de lançamento (ex.: tipo "Mensalidade", ativo, valor sugerido R$ 80,00) para criar os lançamentos do mês de uma vez. Esta spec **não** entrega nada disso — entrega só o cadastro dos tipos, numa nova **área de configurações do admin**.

## Escopo

**Nesta spec:**
- Nova tabela `transaction_types` (descrição, status ativo, valor sugerido) com RLS.
- RPCs `security definer` admin para escrita: `create_transaction_type`, `update_transaction_type`, `delete_transaction_type`.
- Leitura via `select` direto na tabela (RLS restringe a admin) — sem RPC de listagem.
- Nova rota **`/admin/settings`** — hub de configurações do admin, tendo "Tipos de lançamento" como primeira (e por ora única) seção.
- CRUD de tipos de lançamento na UI: listar, criar, editar (a ativação/inativação acontece **dentro da edição**), excluir.
- Atalho para `/admin/settings` no header da home, visível só para admin.
- Nova capacidade `manage_settings` em `usePermissions()`.
- Componente compartilhado `CurrencyInput` (campo de moeda BRL mascarado) e helper `formatBRL`.

**Fora desta spec (próximas):**
- A tabela de lançamentos financeiros (`transactions`/lançamentos em si) e qualquer tela financeira.
- A funcionalidade de **gerar mensalidades**.
- Saldo, relatórios, marcação de pago/atraso, Pix/integração.
- **Direção entrada/saída** no tipo de lançamento — decidido fora do escopo (ver Decisão 2).
- **Trava de exclusão** de tipo com lançamentos vinculados — só possível quando a tabela de lançamentos existir (ver Decisão 6).
- **Toggle inline** de ativo/inativo na lista — a ativação/inativação é feita pela tela de edição (ver Decisão 5).
- Demais seções do hub `/admin/settings` (ex.: horário padrão da pelada) — a página é desenhada para recebê-las depois, mas nenhuma outra entra agora.

## Decisões

1. **Tipo de lançamento é entidade de configuração, não de domínio da pelada.** Vive numa área de admin (`/admin/settings`), não nas telas de jogador. Por isso a leitura também é restrita a admin nesta spec (ver Decisão 7); quando o financeiro precisar exibir o nome do tipo a jogadores, a policy de `select` é revisitada.

2. **Sem campo de direção (entrada/saída).** Os tipos são genéricos — `transaction_types` guarda apenas descrição, status e valor sugerido. Se o módulo financeiro precisar distinguir entrada de saída, isso será modelado no lançamento, não no tipo. Decisão do usuário.

3. **Valor sugerido é opcional, e `R$ 0,00` é um valor legítimo distinto de "sem valor".**
   - **Campo vazio → `null`** (`suggested_amount_cents` é `nullable`): o tipo não tem valor sugerido (ex.: "Pagamento do juiz", que muda a cada dia).
   - **`R$ 0,00` → `0`**: é um valor sugerido válido e intencional. Caso real: a mensalidade de alguns membros pode ser zero por dificuldade financeira.
   - Os dois estados são distintos na UI: `null` exibe `—`; `0` exibe `R$ 0,00`.
   - A futura geração de mensalidades exigirá valor preenchido apenas no tipo que ela for usar; não é regra desta tabela.

4. **Dinheiro é armazenado em centavos, como inteiro.** A coluna é `suggested_amount_cents integer` (`check >= 0`). Nada de `float`/`numeric` com casas decimais para evitar erro de arredondamento. A UI exibe e edita via o componente `CurrencyInput` (ver §"Solução proposta → Campo de moeda").

5. **Status ativo é um booleano simples; a ativação/inativação é feita pela edição.** `is_active` controla se o tipo aparece como opção utilizável no futuro módulo financeiro. Um tipo inativo continua existindo, visível e editável na área de configuração — é só uma marcação de "não usar mais por enquanto"; inativar **não** é excluir. **Não há toggle inline na lista** — para ativar ou inativar, o admin abre o modal de edição e altera o `Switch`. Mantém uma única porta de escrita por registro e evita a RPC parcial.

6. **Exclusão é CRUD normal (hard delete) nesta spec.** Como a tabela de lançamentos ainda não existe, não há vínculo a proteger e `delete_transaction_type` apaga a linha. **Pendência futura assumida:** quando o módulo financeiro tiver lançamentos, esta RPC deve passar a recusar a exclusão de um tipo que tenha lançamentos vinculados (só permitir delete sem vínculo). Isso é dívida explícita, não esquecimento.

7. **RLS: leitura e escrita restritas a admin.** A tabela tem RLS habilitada com policy de `select` para `app.is_admin()` e **sem** policies de `insert`/`update`/`delete` — toda escrita passa pelas três RPCs `security definer`. A leitura é `select` direto na tabela (a RLS já barra não-admin), sem RPC de listagem dedicada — diferente das tabelas de domínio da pelada, aqui não há agregação a montar.

8. **Descrição é única, sem diferenciar maiúsculas/acentos triviais.** Índice único sobre `lower(btrim(description))`, abrangendo ativos **e** inativos — não se cadastram dois tipos "Mensalidade" ainda que um esteja inativo. Tentativa de duplicar resulta em erro amigável via `mapSupabaseError`.

9. **Sem `approval_history`, sem realtime, sem optimistic update.** É CRUD de configuração, ação admin pontual e de baixa frequência; refetch após sucesso basta. Não é evento de autorização — não loga em `approval_history` (mesmo critério de posição/status do jogador e dos scouts).

10. **RPC de update não tem argumentos com `default`.** `update_transaction_type` reescreve os três campos de uma vez (full-replace); todos os args são obrigatórios. Defaults numa função de update permitiriam apagar dado por omissão (omitir `is_active` reativaria o tipo; omitir o valor o zeraria para `null`) sem a função distinguir "não enviei" de "quero este valor". Para limpar o valor sugerido, o caller envia `null` explicitamente. (No `create`, `default` é legítimo — ali significa o valor inicial.)

## Entidade

### Tabela `transaction_types`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid | PK, `default gen_random_uuid()` |
| `description` | text | `not null`; gravada já com `btrim`; `check (char_length(description) between 1 and 80)` |
| `suggested_amount_cents` | integer | `nullable`; `check (suggested_amount_cents is null or suggested_amount_cents >= 0)` |
| `is_active` | boolean | `not null default true` |
| `created_at` | timestamptz | `not null default now()` |
| `updated_at` | timestamptz | `not null default now()`; atualizado em cada `update` |

- **Índice único** `transaction_types_description_unique_idx` sobre `lower(btrim(description))` — garante descrição única ignorando caixa e espaços nas pontas.
- **Check** `transaction_types_description_length` garante descrição entre 1 e 80 caracteres no banco (espelhado no Zod). Como a RPC grava a descrição já com `btrim`, o limite vale sobre o texto sem espaços nas pontas.
- RLS habilitada. **Policy de `select`** para `app.is_admin()`. **Sem** policies de `insert`/`update`/`delete`.
- Sem trigger. `updated_at` é setado explicitamente dentro da RPC de update.

### RPC `create_transaction_type(p_description text, p_suggested_amount_cents integer default null, p_is_active boolean default true)`

`security definer`. Cria um tipo de lançamento.

- Checa `app.is_admin()` no topo; rejeita se não-admin (`errcode 42501`).
- Faz `btrim` em `p_description`; rejeita (`errcode 22023`) se ficar vazia ou exceder 80 caracteres.
- Rejeita se `p_suggested_amount_cents` for negativo (o `check` do banco também barra).
- `INSERT` e retorna a linha criada (`id, description, suggested_amount_cents, is_active, created_at, updated_at`).
- Violação do índice único de descrição sobe como erro (mapeado para PT-BR na UI).

### RPC `update_transaction_type(p_id uuid, p_description text, p_suggested_amount_cents integer, p_is_active boolean)`

`security definer`. Atualiza um tipo existente (inclui ativar/inativar). **Sem argumentos com `default`** — ver Decisão 10. Full-replace dos três campos.

- Checa `app.is_admin()`; rejeita se não-admin (`errcode 42501`).
- Rejeita se `p_id` não existir (`errcode P0002`, mensagem "tipo de lançamento não encontrado").
- `btrim` em `p_description`; rejeita se vazia ou > 80 caracteres. Rejeita valor negativo.
- Para limpar o valor sugerido, o caller envia `p_suggested_amount_cents = null`.
- `UPDATE` dos três campos + `updated_at = now()`. Retorna a linha atualizada.
- Violação do índice único de descrição sobe como erro.

### RPC `delete_transaction_type(p_id uuid)`

`security definer`. Exclui um tipo (hard delete — ver Decisão 6).

- Checa `app.is_admin()`; rejeita se não-admin (`errcode 42501`).
- Rejeita se `p_id` não existir (`errcode P0002`, mensagem "tipo de lançamento não encontrado").
- `DELETE` da linha. Retorna `void`.
- **Futuro:** passará a recusar exclusão de tipo com lançamentos vinculados quando a tabela de lançamentos existir.

## Solução proposta

### Campo de moeda — `CurrencyInput`

Componente compartilhado novo em `components/shared/currency-input.tsx`, reutilizável pelo futuro módulo financeiro. Estratégia de máscara **acumulador de centavos** — a mais usada em SaaS financeiro (Stripe, Nubank, etc.) por ser imune a ambiguidade de locale e não exigir biblioteca externa:

- O valor interno do campo é sempre **um inteiro em centavos** (`number`) ou `null`.
- O usuário digita **apenas dígitos**; cada dígito desloca o número uma casa à esquerda (`12` → `R$ 0,12`; `1234` → `R$ 12,34`; `8000` → `R$ 80,00`). `Backspace` remove o último dígito.
- O texto exibido é sempre o valor formatado por `formatBRL` (ex.: `R$ 80,00`).
- **Campo vazio → `null`** (sem valor sugerido). Digitar e manter `0` → `0` (`R$ 0,00`), valor válido — ver Decisão 3.
- Como o usuário só digita dígitos (a vírgula e o `R$` são da máscara), `inputmode="numeric"` é o teclado correto no mobile.
- Sem ponto flutuante: o valor já é inteiro de centavos do início ao fim — nenhuma multiplicação por 100.
- Integra com React Hook Form via `Controller` (`value: number | null`, `onChange`).

`formatBRL(cents: number): string` vive em `lib/utils.ts` — formata centavos via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Recebe `number`; o caller trata `null` (exibe `—`) antes de chamar.

### Rota `/admin/settings` — hub de configurações

Nova rota protegida por `<RequireAuth requireAdmin />`, composta na pasta `pages/admin/settings/`. A página é um hub: um cabeçalho ("Configurações") e seções empilhadas. Nesta spec há **uma** seção — "Tipos de lançamento" — desenhada para que futuras seções (ex.: horário padrão da pelada) sejam só mais um bloco abaixo.

```
┌──────────────────────────────────────────┐
│ ← Configurações                          │
├──────────────────────────────────────────┤
│ TIPOS DE LANÇAMENTO          [ + Novo ]   │  SectionHeading + botão
│ ┌──────────────────────────────────────┐ │
│ │ Mensalidade                  R$ 80,00│ │  ativos primeiro, alfabético
│ │ Ativo                    [edit][del] │ │
│ ├──────────────────────────────────────┤ │
│ │ Pagamento do campo          R$ 120,00│ │
│ │ Ativo                    [edit][del] │ │
│ ├──────────────────────────────────────┤ │
│ │ Pagamento do juiz                   —│ │  valor ausente → "—"
│ │ Inativo                  [edit][del] │ │  inativos depois
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- Cabeçalho com voltar (`←`) para a home (`/`).
- **Seção "Tipos de lançamento":** `SectionHeading` (componente compartilhado já existente) + botão **"Novo tipo"**.
- **Lista** de tipos, ordenada **ativos primeiro, depois inativos**, e dentro de cada grupo em **ordem alfabética** pela descrição. A ordenação é feita no cliente, com normalização NFD (ignora acentos), mesmo critério de `/team`.
- Cada item mostra: descrição, valor sugerido formatado (`R$ 80,00`) ou `—` quando `null`, um **indicador de status** inline (texto "Ativo" / "Inativo" — não um componente shadcn novo; ver §"Decisões de implementação"), e ações de **editar** e **excluir**.
- **Mobile-first:** lista em coluna única; cada item é um card/linha com toque mínimo de 44px nos botões de ação. Container `max-w-2xl` centralizado.
- **Estados:**
  - **Loading:** skeletons de linha.
  - **Erro:** `Alert` destructive com "Tentar novamente".
  - **Vazio** (nenhum tipo cadastrado): `EmptyState` — "Nenhum tipo de lançamento cadastrado. Crie o primeiro para preparar o financeiro." com call-to-action para "Novo tipo".

### Modal de criar/editar tipo

Botão "Novo tipo" e ação de editar abrem o **mesmo** componente de formulário, responsivo no padrão do app (`useMediaQuery`): `<Dialog>` no desktop (`>= sm`), `<Sheet bottom>` no mobile.

```
┌──────────────────────────────────────────┐
│ Novo tipo de lançamento               ✕  │
├──────────────────────────────────────────┤
│ Descrição                                 │
│ [ Mensalidade                           ] │
│                                            │
│ Valor sugerido (opcional)                  │
│ [ R$ 80,00                              ] │  CurrencyInput
│                                            │
│ [✓] Ativo                                  │  Switch
├──────────────────────────────────────────┤
│              [ Cancelar ] [ Salvar ]      │
└──────────────────────────────────────────┘
```

- **Formulário via React Hook Form + Zod** (CLAUDE.md §9). Schema em `features/finance/schemas/transaction-type.schema.ts`.
- Campos:
  - **Descrição** — `text`, obrigatória. Zod: `.trim()` e depois `.min(1)` / `.max(80)` (o `.trim()` garante que descrição só com espaços seja rejeitada no cliente).
  - **Valor sugerido** — opcional, via `CurrencyInput`. Zod: `z.number().int().min(0).max(99_999_999).nullable()` (máx. R$ 999.999,99 como salvaguarda contra erro de digitação). Campo vazio → `null`.
  - **Ativo** — `Switch` do shadcn; default `true` ao criar. **É aqui que se ativa/inativa um tipo** (Decisão 5).
- Em modo edição, os campos vêm pré-preenchidos com o tipo selecionado.
- Rodapé: "Cancelar" e "Salvar". "Salvar" desabilitado enquanto o formulário não estiver `dirty` e enquanto `isPending`.
- Sucesso: fecha o modal, toast de confirmação, invalida a query da lista.
- Erro de descrição duplicada → mensagem PT-BR específica (via `mapSupabaseError`, detectando `transaction_types_description_unique_idx`).
- Erro de "registro inexistente" (outro admin excluiu o tipo enquanto o modal estava aberto): toast "Tipo de lançamento não encontrado." e a lista é invalidada para refletir o estado real.

### Exclusão

Ação de excluir abre um `AlertDialog` de confirmação ("Excluir o tipo «X»? Esta ação não pode ser desfeita."). Confirmar dispara `delete_transaction_type`; sucesso → toast + invalidação da lista. Se o tipo já não existir (excluído por outro admin), toast "Tipo de lançamento não encontrado." + invalidação da lista.

### Atalho no header da home

O header da home tem hoje ícones de ação gated por capacidade (escudo para aprovações, etc.). Adiciona-se um ícone de **engrenagem** (`Settings` do lucide) apontando para `/admin/settings`, visível apenas com a capacidade `manage_settings`.

### Camada de dados (hooks)

Nova feature `features/finance/`:

- `features/finance/api/keys.ts` — `transactionTypeKeys.all = ['finance','transaction-types']`, `transactionTypeKeys.list()`.
- `useTransactionTypes()` — query; `select` direto na tabela com colunas explícitas (`id, description, suggested_amount_cents, is_active, created_at, updated_at`), sem `select('*')`. A ordenação (ativos primeiro, alfabética) é aplicada no cliente.
- `useCreateTransactionType()` / `useUpdateTransactionType()` / `useDeleteTransactionType()` — mutations sobre as RPCs; em `onSuccess` (e em `onError` de "registro inexistente") invalidam `transactionTypeKeys.all`.
- A UI não chama `supabase` direto — tudo via hooks.
- `features/finance/schemas/transaction-type.schema.ts` — schema Zod do formulário.
- `features/finance/components/` — `transaction-type-list.tsx`, `transaction-type-form-modal.tsx` e afins. `features/finance/types.ts` para tipos compostos.

### Permissões

Nova capacidade `manage_settings`. A mudança toca **dois** arquivos:
- `features/auth/types.ts` — adicionar `'manage_settings'` ao union type `Capability`.
- `features/auth/hooks/use-permissions.ts` — `caps.add('manage_settings')` dentro do bloco `if (profile.is_admin)`.

Usada para o gate do atalho no header (`can('manage_settings')`) e a rota usa `RequireAuth requireAdmin`. A UI consulta `can('manage_settings')`, não `is_admin` direto (CLAUDE.md §7.3).

### Autorização — nova superfície

**Em uma frase:** admin passa a poder criar, editar e excluir linhas de `transaction_types` (exclusivamente via RPCs `security definer` com checagem `app.is_admin()`) e a lê-las via `select` direto barrado por RLS a admin; nenhum não-admin lê ou escreve a tabela; não há referência a `auth.users` nem vínculo com outras tabelas de domínio.

## Comportamento esperado

### Fluxo feliz

1. Admin abre a home, clica no ícone de engrenagem → `/admin/settings`.
2. Vê a seção "Tipos de lançamento". Na primeira vez, `EmptyState`.
3. Clica em **"Novo tipo"**, preenche "Mensalidade", digita o valor sugerido (a máscara monta `R$ 80,00`), deixa "Ativo" marcado, salva.
4. O tipo aparece na lista, no grupo dos ativos, com o status "Ativo" e o valor formatado.
5. Cadastra "Pagamento do juiz" sem valor sugerido — aparece com `—` na coluna de valor.
6. Cadastra um tipo com valor `R$ 0,00` — é gravado como `0` e exibido como `R$ 0,00` (não como `—`).
7. Edita um tipo: muda o valor, ou desmarca "Ativo" para inativá-lo — ao salvar, o tipo migra para o grupo dos inativos na lista.
8. Exclui um tipo via `AlertDialog`; ele some da lista.
9. Um não-admin nunca vê o ícone de engrenagem e, se acessar `/admin/settings` por URL, é barrado pelo `RequireAuth`.

### Regras de autorização

- Criar/editar/excluir/listar tipos de lançamento: **apenas admin**, garantido por RLS (`select` só admin, sem write policies) + RPCs com `app.is_admin()`.
- O atalho no header e a rota são gates de UX por capacidade; a barreira real é a RLS/RPC.

### Estados de tela

- **Lista — loading:** skeletons de linha.
- **Lista — erro:** `Alert` destructive com "Tentar novamente".
- **Lista — vazia:** `EmptyState` com call-to-action.
- **Modal — validação:** erros de campo inline (descrição vazia ou > 80 caracteres, valor negativo).
- **Modal — descrição duplicada:** mensagem PT-BR específica vinda do erro do banco.
- **Modal / exclusão — registro inexistente:** toast "Tipo de lançamento não encontrado." + invalidação da lista.
- **Exclusão:** `AlertDialog` de confirmação antes de chamar a RPC.

### Atualização

- Sem realtime, sem optimistic update. Após cada mutation, a lista atualiza por invalidação de query.

## Dependências

- **Não depende de nenhuma spec anterior** — é a primeira peça de uma nova área (configurações / financeiro).
- Reusa componentes/itens existentes: `SectionHeading`, `EmptyState`, `RequireAuth` (prop `requireAdmin`), hook `useMediaQuery`, primitivos shadcn (`Dialog`, `Sheet`, `Switch`, `AlertDialog`, `Form*`, `Input`, `Button`).
- **Sem dependência nova de npm** — o `CurrencyInput` é implementado no projeto (acumulador de centavos + `Intl.NumberFormat`).
- **É pré-requisito** do futuro módulo financeiro e da funcionalidade de gerar mensalidades.

## Decisões de implementação

- **Migrations:** duas, no padrão da Spec 001 — `<timestamp>_transaction_types` (tabela + checks + índice único + RLS + policy de `select`) e `<timestamp>_transaction_types_rpcs` (as três RPCs). Timestamps posteriores a `20260516120003` (último aplicado).
- **Indicador de status (Ativo/Inativo):** não se adiciona o componente shadcn `badge` (não existe no projeto e traria o workaround de alias do `pnpm dlx`). É um `<span>` simples estilizado com classes Tailwind/tokens — "Inativo" em tom `muted`, "Ativo" em tom de destaque discreto. É CRUD básico; não justifica componente novo.
- **Ordenação no cliente:** a lista é pequena (poucos tipos); ordenar em memória (ativos primeiro → alfabético NFD) evita depender da collation do Postgres e mantém o critério igual ao de `/team`.
- **`delete_transaction_type` retorna `void`.**
- **Tipos do banco** regerados (`pnpm gen:types`) e commitados.
- **Policies documentadas** em `supabase/policies/transaction-types.md` (espelho do SQL), conforme CLAUDE.md §14.9.
- **Testes:** o repo ainda não tem Vitest/RTL configurados (mesma situação das Specs 003/004); bootstrapar a infra de testes fica fora do escopo. Limitação a registrar no resumo final.
- Sem `select('*')`, sem strings mágicas de status, código de tabela/coluna/função em inglês, textos PT-BR, cores via tokens.

## Critérios de aceite

- [ ] Tabela `transaction_types` criada: `id` uuid PK, `description` text not null com `check` de 1–80 caracteres, `suggested_amount_cents` integer nullable com `check (>= 0 or null)`, `is_active` boolean not null default true, `created_at`/`updated_at`. Índice único sobre `lower(btrim(description))`.
- [ ] RLS habilitada com policy de `select` para `app.is_admin()` e **sem** policies de `insert`/`update`/`delete`.
- [ ] RPC `create_transaction_type` `security definer`: checa `app.is_admin()`, faz `btrim` e rejeita descrição vazia/> 80/valor negativo, retorna a linha criada.
- [ ] RPC `update_transaction_type` `security definer`, **sem argumentos com `default`**: checa `app.is_admin()`, rejeita `id` inexistente (`P0002`), full-replace dos três campos + `updated_at`, retorna a linha; aceita `null` em `p_suggested_amount_cents` para limpar o valor.
- [ ] RPC `delete_transaction_type` `security definer`: checa `app.is_admin()`, rejeita `id` inexistente (`P0002`), faz hard delete, retorna `void`.
- [ ] Tipos do banco regerados (`pnpm gen:types`) e commitados; policies documentadas em `supabase/policies/transaction-types.md`.
- [ ] Rota `/admin/settings` protegida por `RequireAuth requireAdmin`; página é um hub com a seção "Tipos de lançamento" e voltar para a home.
- [ ] Lista de tipos ordenada **ativos primeiro, depois alfabética** (NFD), exibindo valor formatado em BRL (`R$ 0,00` quando `0`, `—` quando `null`), indicador Ativo/Inativo e ações editar/excluir.
- [ ] Componente `CurrencyInput` (acumulador de centavos, `inputmode="numeric"`, sem dependência nova) integrado ao formulário via React Hook Form; helper `formatBRL` em `lib/utils.ts`.
- [ ] Modal de criar/editar via React Hook Form + Zod: descrição obrigatória 1–80 caracteres (`.trim()` antes de `.min(1)`), valor sugerido opcional (`number | null`, máx. R$ 999.999,99), `Switch` de ativo; "Salvar" desabilitado sem alterações ou durante envio.
- [ ] Ativar/inativar é feito pela tela de edição (sem toggle inline); exclusão passa por `AlertDialog` de confirmação.
- [ ] Erro de descrição duplicada mostra mensagem PT-BR específica via `mapSupabaseError`; erro de "registro inexistente" mostra "Tipo de lançamento não encontrado." e invalida a lista.
- [ ] Nova capacidade `manage_settings` adicionada ao union `Capability` (`features/auth/types.ts`) e a `usePermissions()`; atalho de engrenagem no header da home gated por ela.
- [ ] Hooks de API em `features/finance/api/`; a UI não chama `supabase` direto; cache keys padronizadas em `keys.ts`.
- [ ] Estados de loading, erro e vazio tratados na lista; validação tratada no modal.
- [ ] Layout testado em viewport 360px e em desktop; toques ≥ 44px.
- [ ] Código de tabela/coluna/função/variável em inglês; textos em PT-BR; cores via tokens do design system.
