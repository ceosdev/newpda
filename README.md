# newpda

Web app de gerenciamento da pelada. Veja [`CLAUDE.md`](./CLAUDE.md) para governança técnica.

## Stack

Vite + React 19 + TypeScript estrito · TailwindCSS v4 · shadcn/ui · React Router v7 · TanStack Query v5 · Supabase.

## Pré-requisitos

- Node.js 20 LTS ou superior
- pnpm 11+

## Como rodar

```bash
pnpm install
cp .env.example .env.local      # preencha as variáveis (ver §Supabase abaixo)
pnpm dev                         # http://localhost:5173
```

Outros scripts:

```bash
pnpm typecheck         # tsc -b --noEmit
pnpm lint              # eslint
pnpm build             # build de produção em dist/
pnpm preview           # serve o build localmente
pnpm format            # prettier --write .
```

## Supabase

A camada de identidade vive inteiramente no Supabase. **Sem Docker local** (escolha de ciclo 2): desenvolvimento e produção usam o **mesmo projeto remoto** — não há instância local.

### Setup do projeto remoto

1. Em [supabase.com](https://supabase.com), criar um projeto novo (free tier serve).
2. **Settings → API**: copiar
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`
3. **Settings → Database**: anotar o **database password** e o **project ref** (parte do `xxxx.supabase.co`).
4. Colocar tudo em `.env.local`.
5. Linkar a CLI local ao projeto:
   ```bash
   pnpm db:link        # passe --project-ref XXXX se ele não detectar; CLI vai pedir senha
   ```

### Aplicar migrations

Toda mudança de schema vira uma migration em `supabase/migrations/`. Para empurrar pro projeto remoto:

```bash
pnpm db:push           # supabase db push
pnpm gen:types         # regenera src/lib/supabase/database.types.ts a partir do schema vivo
```

Sempre rode `pnpm gen:types` depois de cada `db:push` e commit o arquivo gerado.

### Bootstrap do primeiro admin

A regra do app proíbe promover admin via UI sem outro admin existindo. Para o primeiro:

1. Fazer signup pelo app normalmente (email/senha ou Google), confirmar o email.
2. Rodar:
   ```bash
   pnpm promote:admin seuemail@exemplo.com
   ```
   Isso usa a `SUPABASE_SERVICE_ROLE_KEY` (bypass de RLS) só por esse script.

A partir daí, esse admin pode promover outros pela UI.

## Variáveis de ambiente

Validadas em [`src/lib/env.ts`](./src/lib/env.ts) no boot — valores ausentes ou inválidos derrubam a aplicação propositalmente.

| Variável | Onde é usada | Pode aparecer no bundle? |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend + scripts | sim (público) |
| `VITE_SUPABASE_ANON_KEY` | frontend + scripts | sim (público) |
| `SUPABASE_SERVICE_ROLE_KEY` | **apenas** `scripts/*.ts` | **NUNCA** — secret, bypass de RLS |
