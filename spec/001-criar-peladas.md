# Spec 001 — Criar peladas

> Nomenclatura no código sempre em inglês (`matches`, `match_date`, `match_time`, `status`, etc.), conforme CLAUDE.md §"idioma". Exibição na UI sempre em PT-BR.

## Escopo

**Nesta spec:**
- Modelo e tela da entidade *pelada* (criar, listar, editar data/hora, fechar, excluir).
- Os três botões de resposta (eu vou / talvez / não vou) aparecem no card visualmente, mas **sem persistência** — são placeholders fiados no front.
- Os contadores no rodapé do card (confirmados / pendentes / não vão) renderizam com valores zerados (placeholders).

**Fora desta spec (próxima):**
- Modelagem e gravação das respostas de presença.
- Definição de quem entra no universo de "pendentes" (já decidido: jogadores com `player_status` em `active` ou `injured` — fica registrado para a próxima spec implementar).
- Mecânica de mudança de resposta, histórico, e efeito de mudanças de role/status na resposta já dada.

## Entidade

Tabela `matches`:

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | gerado |
| `match_date` | date | obrigatório; padrão na criação = data atual; aceita datas no passado |
| `match_time` | time | obrigatório; padrão na criação = `20:00` |
| `status` | enum `match_status` (`open`, `closed`) | obrigatório; padrão na criação = `open` |
| `created_at` | timestamptz | gerado, não exibido |
| `created_by` | uuid FK → `profiles.id` | gerado a partir de `auth.uid()`, não exibido (auditoria) |

> Hora foi adicionada à entidade porque o app precisa diferenciar peladas no mesmo dia. O padrão `20:00` será futuramente parametrizável em uma tela de configurações.

## Solução proposta

Criar a rota `/matches` (exibida no menu como "Peladas"), com:

1. **Listagem das peladas em formato de card**, ordenadas por `match_date desc, match_time desc`.
2. Paginação **infinite scroll** carregando lotes de 10. A primeira página entra ao montar a tela; cada scroll ao final da lista dispara o próximo lote.
3. Após criar uma nova pelada, a lista **é resetada para a primeira página** (todo o scroll feito até então é descartado e a nova pelada aparece no topo, junto das outras 9 mais recentes).
4. **Botão de criar pelada** visível apenas para admin:
   - Em mobile: FAB (botão flutuante) no canto inferior direito.
   - Em desktop: botão no canto superior direito da tela.
5. O fluxo de criação abre um **bottom sheet** (consistente com o restante do app — `ApproveSheet`, `PlayerDetailSheet`, etc.) com:
   - Campo de data (default = hoje).
   - Campo de hora (default = 20:00).
   - Status é fixado em `open` na criação (não exibido como editável).
   - Botão "Criar pelada" + botão "Cancelar".

### Card da pelada

Layout do card (mobile-first, espaços simétricos):

- **Cabeçalho:** data (DD/MM/AAAA) + hora (HH:mm) + badge de status (`Aberta` / `Fechada`, com o mesmo tratamento de cor já usado para `player_status`).
- **Ações de admin** (visíveis somente para admin): editar, fechar (se `open`), excluir. Em peladas `closed`, "fechar" some.
- **Botões de resposta** (visíveis para qualquer jogador em peladas `open` — desabilitados/placeholder nesta spec):
  - "Eu vou" → cor `emerald` (mesma família do badge `active`).
  - "Talvez" → cor `primary` (cor de acento do design system).
  - "Não vou" → cor `destructive` (mesma família do badge `DM`).
  - Em peladas `closed`, os três botões não aparecem.
- **Rodapé do card:** três contadores com espaços simétricos: `Confirmados` / `Pendentes` / `Não vão`. Nesta spec todos exibem `0` ou um traço (`—`), como placeholder.

## Comportamento esperado

### Fluxo feliz

1. Usuário aprovado acessa `/matches` e vê os cards das peladas mais recentes.
2. Admin clica em "Criar pelada" (FAB no mobile / botão no canto superior direito no desktop), preenche data e hora (ou aceita os defaults), confirma. A pelada nasce com status `open`. A lista refaz a primeira página e a nova pelada aparece no topo.
3. Qualquer jogador (`player_status` em `active` ou `injured`) vê os três botões de resposta nos cards `open`. Nesta spec os botões existem visualmente mas não persistem nada — clicar não tem efeito significativo. Espectadores não veem os botões.
4. Admin pode, em qualquer card:
   - **Editar:** abre um sheet com data e hora editáveis. Status fica bloqueado e visível como informação. Salvar **não pede confirmação**. A lista reflete a alteração.
   - **Fechar:** ação dedicada (atalho, separada do editar) que muda `status` de `open` para `closed`. **Exige confirmação** com texto explicando que a pelada deixa de aceitar respostas. Uma pelada fechada não tem o botão "Fechar" e não pode ser reaberta.
   - **Excluir:** **exige confirmação** com disclaimer explícito: *"Esta ação é permanente. Todos os lançamentos já feitos nesta pelada (presença, etc.) serão apagados junto."* — após confirmação, hard delete.

### Regras de autorização

- Criar / editar / fechar / excluir: **apenas admin**, garantido por RLS + RPCs `security definer` (não confiar em UI).
- Ler peladas: qualquer profile com `status = 'approved'` (player ou spectator).
- Em peladas `closed`, os três botões de resposta não são renderizados para ninguém.

### Estados de tela

- **Loading inicial:** skeletons de card.
- **Erro de fetch:** `Alert` destructive com botão "Tentar novamente" (padrão do app).
- **Lista vazia:** `EmptyState` com chamada para admin criar a primeira pelada (texto adaptado ao role do usuário).
- **Loading do próximo lote:** skeleton ou spinner discreto no fim da lista.
- **Fim da lista:** sem indicador especial — apenas para de carregar.

### Atualização

- Sem realtime. Os contadores e a lista atualizam apenas em refetch manual (ou ao voltar o foco para a aba — comportamento padrão do React Query, sem ajustes específicos).

## Critérios de aceite

- [ ] Tabela `matches` criada com colunas e enum `match_status` conforme tabela acima, com RLS habilitada e policies por operação (admin escreve, aprovado lê).
- [ ] RPCs `security definer` criadas: `create_match`, `update_match_schedule` (data/hora), `close_match`, `delete_match`. Todas checam `app.is_admin()` no topo.
- [ ] Rota `/matches` acessível para qualquer profile aprovado; botão de criar visível só para admin (com gate também no DB).
- [ ] Listagem ordena por `match_date desc, match_time desc`; paginação de 10 em 10 com infinite scroll funcionando em mobile e desktop.
- [ ] Criar uma pelada faz a lista voltar para a primeira página (reset do scroll).
- [ ] Edição altera somente `match_date` e `match_time` (status bloqueado no formulário). Salvar não pede confirmação.
- [ ] Fechar pelada é ação distinta, pede confirmação, e remove o botão "Fechar" do card após o fato (sem caminho de reabertura).
- [ ] Excluir pelada pede confirmação com disclaimer mencionando que apaga lançamentos junto; ao confirmar faz hard delete.
- [ ] Card mostra data (DD/MM/AAAA), hora (HH:mm), badge de status, 3 botões coloridos de resposta (apenas para jogadores `active`/`injured` em peladas `open`, sem persistência nesta spec), e rodapé simétrico com contadores `Confirmados` / `Pendentes` / `Não vão` zerados.
- [ ] Estados de loading (inicial e próximo lote), erro e vazio implementados conforme padrão do app.
- [ ] Layout testado em viewport 360px e em desktop (≥ `lg`).
- [ ] Todo o código de tabela/coluna/função/variável em inglês; textos exibidos em PT-BR; cores via tokens do design system (sem hex cru).
