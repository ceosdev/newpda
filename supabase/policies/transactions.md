# Policies — `transactions` (Spec 006)

Espelho da superfície de autorização da tabela `transactions`. Fonte de verdade
é o SQL em `supabase/migrations/20260518130000_transactions.sql`,
`20260518130001_transactions_rpcs.sql` e
`20260518130002_transaction_types_delete_guard.sql`.

## Tabela `transactions`

- RLS **habilitada** e **forçada**.
- Leitura liberada a qualquer membro aprovado; escrita só admin via RPC.

### Policies

| Operação | Policy                         | Regra                                                                                  |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| `select` | `transactions_select_approved` | `app.is_approved()` — qualquer aprovado (player ou spectator) lê todos os lançamentos. |
| `insert` | —                              | Sem policy. Bloqueado para acesso direto.                                              |
| `update` | —                              | Sem policy. Bloqueado para acesso direto.                                              |
| `delete` | —                              | Sem policy. Bloqueado para acesso direto.                                              |

Toda escrita passa pelas RPCs `security definer` abaixo.

## RPCs (`security definer`)

| RPC                                                           | Caller                         | Resumo                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_transaction(...)`                                     | admin (`app.is_admin()`)       | Insere um lançamento. Valida valor `> 0`, par de pagamento e valor pago `<= amount`. `created_by = auth.uid()`.                                    |
| `update_transaction(...)`                                     | admin                          | Full-replace dos campos editáveis. **Sem args `default`.** Rejeita `id` inexistente (`P0002`) e **rejeita edição de lançamento `paid`** (`22023`). |
| `delete_transaction(p_id)`                                    | admin                          | Hard delete. Rejeita `id` inexistente (`P0002`).                                                                                                   |
| `list_transactions(p_limit, p_offset, p_operation, p_status)` | aprovado (`app.is_approved()`) | Lista paginada + filtros; join de tipo, jogador e criador.                                                                                         |
| `list_player_options()`                                       | aprovado                       | Jogadores do elenco (`active`/`injured`, não arquivados) para o picker do formulário.                                                              |

Todas checam o papel no topo (`42501` se não autorizado), `grant execute` só
para `authenticated`, `revoke` de `public`/`anon`.

## `transaction_types` — guarda de exclusão

`transactions.transaction_type_id` referencia `transaction_types(id)` com
`on delete restrict`. A RPC `delete_transaction_type` foi **recriada**
(`20260518130002`) para, antes do `delete`, recusar a exclusão de um tipo em uso
por algum lançamento, com mensagem em PT-BR e `errcode P0001` (não mapeado por
`mapSupabaseError`, então a mensagem chega ao usuário). Resolve a pendência
registrada na Spec 005.

## Superfície de autorização — em uma frase

Admin cria, edita (exceto lançamentos `paid`) e exclui linhas de `transactions`
exclusivamente via RPCs `security definer` com `app.is_admin()`; qualquer
profile aprovado lê todos os lançamentos e os jogadores do elenco via
`list_transactions`/`list_player_options` (`app.is_approved()`); ninguém escreve
direto na tabela.
