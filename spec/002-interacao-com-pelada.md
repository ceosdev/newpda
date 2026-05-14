# Spec 002 — Interação dos jogadores com a pelada

> Nomenclatura no código sempre em inglês (`match_attendances`, `attendance_response`, etc.), conforme CLAUDE.md §"idioma". Exibição na UI sempre em PT-BR.

## Escopo

**Nesta spec:**
- Persistência da resposta de presença em `match_attendances` (`going` / `maybe` / `declined`).
- Plug-in das três ações que hoje são placeholders no `MatchCard` (Spec 001).
- Indicação visual da resposta atual do jogador no card.
- Atualização dos contadores do card para refletir o estado real, agora com os três rótulos **Confirmados / Talvez / Não vão** — o app não trabalha com o conceito de "pendentes" para presença (ver decisão 5).
- Nova rota `/matches/:id` (tela de detalhes) com abas das três respostas, mostrando cards enxutos de jogador (foto, apelido, posição).
- Trigger que remove a resposta de um jogador quando ele perde a capacidade de responder (vai para `inactive` ou é arquivado).
- Mudança de paginação na listagem `/matches`: de 10 para **5 por lote**.

**Fora desta spec (próximas):**
- Lançamento de scouts/eventos durante/após a pelada (gols, cartões, etc.).
- Sorteio de times.
- Notificações.

## Entidade

### Enum
`public.attendance_response`: `going` | `maybe` | `declined`.

### Tabela `match_attendances`

| Campo | Tipo | Regras |
|---|---|---|
| `match_id` | uuid | FK → `matches.id` `on delete cascade` |
| `profile_id` | uuid | FK → `profiles.id` `on delete restrict` |
| `response` | enum `attendance_response` | obrigatório |
| `responded_at` | timestamptz | gerado na primeira inserção; **não muda** em updates (usado para ordenar a aba "mais antigo primeiro") |
| `updated_at` | timestamptz | trigger `moddatetime` |
| **PK** | composta | `(match_id, profile_id)` — impede duplicidade |

`responded_at` é o "carimbo de quando entrou na lista". Trocas de resposta não reordenam a aba.

### View `matches_with_counts`

Espelho de `matches` acrescido das colunas `going_count`, `maybe_count`, `declined_count`. Substitui o `select` direto na lista de `/matches`, evitando N+1 e mantendo o payload do front pequeno. Filtragem/ordenação/paginação continuam acontecendo na view (a view propaga o `where`/`order`/`range`).

### Trigger em `players`

`AFTER UPDATE` em `public.players` → quando o `player_status` sair de `('active','injured')` para `inactive`, **ou** quando `archived_at` for setado (jogador deixa o roster ativo), a função apaga todas as linhas de `match_attendances` desse jogador. Transições entre `active` ⇄ `injured` (DM) **mantêm** as respostas — DM ainda responde normalmente.

## Solução proposta

### Mudanças em `/matches` (listagem)

1. **Lote de paginação cai de 10 para 5.** O `useInfiniteQuery` carrega 5, mais 5 ao chegar no sentinela, e por aí vai.
2. A leitura passa a usar a view `matches_with_counts`, então cada card já chega com `going_count`, `maybe_count`, `declined_count` prontos.
3. **Rodapé do card** muda para três contadores: **Confirmados / Talvez / Não vão** (substitui o antigo "Pendentes" da Spec 001 — esse conceito não existe para presença).
4. **O card inteiro é navegável** para `/matches/:id`. Implementação: `role="button"` na `Card`, com Enter/Space tratados. Os três botões de resposta dentro do card usam `stopPropagation` no `onClick` para que clicar neles **não** dispare a navegação.
5. **Indicação visual da resposta atual do jogador:**
   - Acima dos botões, um chip discreto e colorido segundo a resposta:
     - "Sua resposta: Eu vou" (verde / `emerald-600`).
     - "Sua resposta: Talvez" (azul / `blue-600`).
     - "Sua resposta: Eu não vou" (vermelho / `destructive`).
   - O chip só aparece se o jogador já respondeu naquela pelada.
   - Além do chip, o **botão correspondente à resposta atual fica em estado destacado** (cor sólida e selecionado), enquanto os outros dois ficam visivelmente mais discretos (mesma família de cor, mas em variante "outline" suave). Antes da primeira resposta, todos os três estão em estado ativo padrão.
6. **Botões de resposta continuam ocultos** para quem não pode responder (espectadores, players `inactive`, e em peladas `closed`). Isso já está na regra da Spec 001 e é reforçado aqui.

### Nova rota `/matches/:id` (tela de detalhes)

Decidida como **rota dedicada** (não modal), para permitir deep-link, voltar nativo do navegador no mobile e ancoragem futura das telas de scouts/lançamentos.

Layout (mobile-first):

```
┌──────────────────────────────────────┐
│ ← 17/05/2026 · 20:00          ABERTA │   header com voltar + data/hora/status
├──────────────────────────────────────┤
│ Sua resposta: Eu vou                 │   chip (se o jogador respondeu)
│ [Eu vou] [Não vou] [Talvez]          │   3 botões (mesmo comportamento do card)
├──────────────────────────────────────┤
│ Confirmados 7  |  Talvez 2  | Não vão 1 │  abas com contagem na label
├──────────────────────────────────────┤
│ ┌──────────────────────────────┐     │
│ │ [foto]  Apelido               │    │   card enxuto: foto, apelido, posição
│ │         Goleiro · Você        │    │
│ └──────────────────────────────┘     │
│ ┌──────────────────────────────┐     │
│ │ [foto]  Apelido               │    │
│ │         Linha                 │    │
│ └──────────────────────────────┘     │
└──────────────────────────────────────┘
```

- **3 abas:** Confirmados / Talvez / Não vão. Cada `TabsTrigger` mostra a contagem ao lado da label (`Confirmados · 7`), seguindo o padrão já usado em `/team`.
- **Conteúdo de cada aba:** lista de cards enxutos por jogador, ordenados por `responded_at asc` (resposta mais antiga primeiro).
- **Card enxuto do jogador:** foto, apelido (com fallback para `display_name`), e posição (`Goleiro` / `Defesa` / `Meio` / `Ataque` / `Sem preferência`, usando os mesmos labels do `/team`). O próprio usuário recebe um marcador discreto "Você" ao lado da posição.
- **Empty state por aba:**
  - Confirmados: "Ninguém confirmou ainda".
  - Talvez: "Ninguém disse que talvez".
  - Não vão: "Ninguém disse que não vai".
- A **mesma área de ação de presença** do card aparece também no topo da tela de detalhes (chip de resposta + botões), para que o jogador responda sem voltar.
- **Espectador** vê tudo (header, abas, lista, contadores), mas **não vê a área de botões nem o chip de resposta**.
- **Pelada `closed`:** a tela funciona normalmente — abas e listas continuam acessíveis para histórico e para os scouts futuros. A área de botões some (não há ação possível). O badge de status muda para `Fechada`.

### Comportamento das mutações

- **Optimistic update** no clique do botão de resposta:
  - O chip de "Sua resposta" e o estado destacado do botão mudam **na hora** para a resposta nova.
  - Os contadores **incrementam/decrementam de forma otimista** no card listado e na tela de detalhes.
  - Em caso de erro, reverte e mostra toast.
- Após `onSuccess` da mutation: refetch leve para garantir consistência dos contadores e da posição na lista da aba (porque `responded_at` original é mantido, mas a primeira resposta cria `responded_at` novo).
- **Sem realtime.** A atualização vem só do próprio clique do usuário ou de um refresh manual / refetch on focus.

### Autorização

- **SELECT em `match_attendances`:** qualquer profile aprovado (player ou spectator).
- **INSERT / UPDATE:** somente via RPC `set_my_attendance(p_match_id, p_response)` — `security definer` checa:
  - profile aprovado;
  - `role = 'player'`;
  - `players.player_status` em `('active','injured')` e `archived_at is null`;
  - `matches.status = 'open'` (pelada fechada rejeita).
  - O upsert grava na PK composta. `responded_at` só é setado na **primeira** inserção; `updated_at` atualiza em qualquer escrita.
- **DELETE manual:** não existe. Não há rota para "desfazer" — uma resposta dada só pode ser **trocada** por outra (decisão 7).
- **Remoção automática:** trigger no `players` apaga respostas do jogador que sai do roster ativo (decisão 6).

## Critérios de aceite

- [ ] Enum `attendance_response` criado em `public`.
- [ ] Tabela `match_attendances` com PK composta `(match_id, profile_id)`, FK `on delete cascade` para `matches`, RLS habilitada e policy de `select` para aprovados. **Sem policies** de `insert`/`update`/`delete` — toda escrita passa pela RPC.
- [ ] RPC `set_my_attendance(p_match_id, p_response)` `security definer` com todas as validações listadas em §"Autorização".
- [ ] Trigger em `players` apaga `match_attendances` do jogador quando: (a) `player_status` sai de `('active','injured')` para `inactive` ou (b) `archived_at` é setado. Transição `active` ⇄ `injured` **não** apaga nada.
- [ ] View `matches_with_counts` retornando colunas de `matches` mais `going_count`, `maybe_count`, `declined_count`. A listagem `/matches` passa a ler dela.
- [ ] Listagem `/matches` muda paginação de 10 para **5 por lote**, mantendo o infinite scroll, o reset ao criar nova pelada e o agrupamento por mês.
- [ ] Rodapé do card exibe **Confirmados / Talvez / Não vão** com valores reais (sem placeholder).
- [ ] Chip "Sua resposta: ..." aparece no card e na tela de detalhes quando o jogador já respondeu; cor segue a família da resposta. Botão correspondente fica destacado.
- [ ] Clique no card (fora dos botões de resposta) navega para `/matches/:id`. Cliques nos botões de resposta **não** navegam (stopPropagation) e respeitam optimistic update + refetch após sucesso.
- [ ] Rota `/matches/:id` dentro de `<RequireAuth />` exibe header com data/hora/status, área de presença para quem pode responder, e três abas (Confirmados / Talvez / Não vão) com contagem na label.
- [ ] Cada aba mostra cards enxutos (foto + apelido + posição), ordenados por `responded_at` ascendente. Marca discreta "Você" no card do próprio jogador.
- [ ] Espectadores leem tudo (lista, contadores, abas) mas **não** veem chip nem botões. Players `inactive` idem. Em pelada `closed`, ninguém vê a área de presença, mas as abas e listas continuam acessíveis.
- [ ] FK `on delete cascade` confirmada: excluir uma pelada apaga as `match_attendances` em conjunto (alinhado com o hard delete da Spec 001).
- [ ] Empty states textuais conforme especificado em §"tela de detalhes".
- [ ] Layout testado em viewport 360px e em desktop ≥ `lg`.
- [ ] Código de tabela/coluna/função/variável em inglês; textos exibidos em PT-BR; cores via tokens do design system + as três cores semânticas das respostas (verde/azul/vermelho) já adotadas na Spec 001.
