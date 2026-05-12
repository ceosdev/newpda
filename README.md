# newpda

Web app de gerenciamento da pelada. Veja [`CLAUDE.md`](./CLAUDE.md) para governança técnica.

## Stack

Vite + React 19 + TypeScript estrito · TailwindCSS v4 · shadcn/ui · React Router v7 · TanStack Query v5 · Supabase.

## Pré-requisitos

- Node.js 20 LTS ou superior
- pnpm 9+

## Como rodar

```bash
pnpm install
cp .env.example .env.local      # preencha as variáveis
pnpm dev                         # http://localhost:5173
```

Outros scripts:

```bash
pnpm typecheck    # tsc -b --noEmit
pnpm lint         # eslint
pnpm build        # build de produção em dist/
pnpm preview      # serve o build localmente
pnpm format       # prettier --write .
```

## Variáveis de ambiente

Validadas em [`src/lib/env.ts`](./src/lib/env.ts) no boot — valores ausentes ou inválidos derrubam a aplicação propositalmente.

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (ex.: `https://xyzcompany.supabase.co` ou `http://127.0.0.1:54321` para CLI local) |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública do projeto Supabase |

Para desenvolvimento local há duas opções (decisão fica para o ciclo de schema):

1. **Projeto remoto Supabase**: criar projeto em [supabase.com](https://supabase.com), copiar URL e anon key do painel.
2. **Supabase CLI** (requer Docker): `supabase start` levanta Postgres + Studio + Auth local; o comando imprime URL e anon key.
