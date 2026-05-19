# Policies — `transaction_types` (Spec 005)

Espelho da superfície de autorização da tabela `transaction_types`. Fonte de
verdade é o SQL em `supabase/migrations/20260518120000_transaction_types.sql` e
`20260518120001_transaction_types_rpcs.sql`.

## Tabela `transaction_types`

- RLS **habilitada** e **forçada** (`enable` + `force row level security`).
- Configuração admin-only — leitura e escrita restritas ao administrador.

### Policies

| Operação | Policy                           | Regra                                                  |
| -------- | -------------------------------- | ------------------------------------------------------ |
| `select` | `transaction_types_select_admin` | `app.is_admin()` — só administradores listam os tipos. |
| `insert` | —                                | Sem policy. Bloqueado para acesso direto.              |
| `update` | —                                | Sem policy. Bloqueado para acesso direto.              |
| `delete` | —                                | Sem policy. Bloqueado para acesso direto.              |

Toda escrita passa pelas RPCs `security definer` abaixo — não há policy de
escrita, então `insert`/`update`/`delete` diretos da tabela são negados pela RLS.

## RPCs (`security definer`)

Todas checam `app.is_admin()` no topo e levantam `42501` se o caller não for
admin. `grant execute` apenas para `authenticated`; `revoke` de `public`/`anon`.

| RPC                                                                                                       | Resumo                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_transaction_type(p_description, p_suggested_amount_cents default null, p_is_active default true)` | Insere um tipo. `btrim` na descrição; rejeita vazia/> 80 caracteres e valor negativo. Retorna a linha criada.                                                                                                                    |
| `update_transaction_type(p_id, p_description, p_suggested_amount_cents, p_is_active)`                     | Full-replace dos três campos + `updated_at`. **Sem argumentos `default`** (evita apagar dado por omissão). Rejeita `id` inexistente (`P0002`). Aceita `null` em `p_suggested_amount_cents` para limpar o valor. Retorna a linha. |
| `delete_transaction_type(p_id)`                                                                           | Hard delete. Rejeita `id` inexistente (`P0002`).                                                                                                                                                                                 |

## Superfície de autorização — em uma frase

Admin pode criar, editar e excluir linhas de `transaction_types` exclusivamente
via RPCs `security definer` com checagem `app.is_admin()`, e lê a tabela via
`select` direto barrado por RLS a admin; nenhum não-admin lê ou escreve.

## Pendência futura

Quando o módulo financeiro tiver a tabela de lançamentos, `delete_transaction_type`
deve passar a recusar a exclusão de um tipo com lançamentos vinculados.
