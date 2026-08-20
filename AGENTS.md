# AGENTS.md — NexaBook

## Project

Cloud ERP & Accounting system localized for Pakistan. Invoicing, Inventory, Payroll, Accounts, Banking, POS, CRM, Manufacturing. Multi-tenant via Clerk + `orgId` on every table.

## Dev Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals)
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
npx tsc --noEmit     # Type check — zero errors expected
```

### Database

```bash
npm run db:generate   # Generate Drizzle migrations from schema changes
npm run db:push       # Push schema to DB (dev only, accepts data loss)
npm run db:migrate    # Run pending migrations
npm run db:studio     # Open Drizzle Studio GUI
npm run db:check      # Validate schema
```

Schema source of truth: `src/db/schema.ts`. DB connection: `src/db/index.ts`. Config: `drizzle.config.ts`. Env file: `.env.local` (copy from `.env.example`).

### Evals

```bash
npm run eval          # Run AI evaluation suite
npm run eval:watch    # Watch mode
```

## Path Aliases

`@/*` → `./src/*` (configured in `tsconfig.json`)

## Key Structure

```
src/
├── app/
│   ├── (auth)/          # Login/register (Clerk)
│   ├── (dashboard)/     # All ERP modules (protected)
│   ├── api/             # API routes (REST)
│   ├── portal/          # Customer/vendor portal
│   └── vendor-portal/
├── components/
│   ├── ui/              # Shadcn UI components
│   └── [feature]/       # Feature-specific components
├── db/
│   ├── index.ts         # DB connection (Neon serverless + Drizzle)
│   ├── schema.ts        # ALL tables (~3000 lines, single file)
│   └── seed.ts
├── hooks/
├── lib/
│   ├── actions/         # Server actions — one file per domain
│   ├── utils/           # Formatting, currency, WhatsApp helpers
│   ├── ai/              # Gemini integration
│   ├── banking/
│   ├── payments/
│   ├── events/
│   └── [test].test.ts   # Tests co-located with source
├── mcp/                 # MCP server
└── middleware.ts         # Clerk auth + rate limiting + CSRF
```

## Non-Negotiable Rules

1. **`orgId` on every query.** Every server action, API route, and DB query must filter by the current user's org. Use `getCurrentOrgId()` from `src/lib/actions/shared.ts`.
2. **No raw SQL in components.** DB access only via server actions in `src/lib/actions/` or API routes in `src/app/api/`.
3. **Decimal for money.** All monetary columns use `decimal(14,2)`. Never use floats for currency.
4. **Double-entry bookkeeping.** Every financial transaction creates balanced journal entries. Debits = Credits.
5. **TypeScript strict.** No `any` types. All functions typed.
6. **No comments** in code unless explicitly requested.
7. **No secrets in code.** All keys via env vars. Never commit `.env` files.

## Conventions

- **File naming:** `kebab-case` for files, `PascalCase` for React components, `camelCase` for functions/variables
- **Server actions:** `"use server"` directive, located in `src/lib/actions/[domain].ts`
- **Tests:** Vitest with `src/**/*.test.ts` pattern. DB is mocked in `vitest.setup.ts` — no real DB needed for unit tests.
- **UI:** Tailwind CSS only (no inline styles). Shadcn/Radix components in `src/components/ui/`.
- **Specs:** Every feature starts with a spec in `specs/` before code. Follow the SDD workflow from `CONSTITUTION.md`.

## Pakistan-Specific

- **PKR formatting:** `Rs. 1,00,000` (lakh system), not `$100,000`
- **FBR/SRB compliance** on all tax invoices
- **NTN/STRN** validation on tax forms
- **Fiscal year:** July 1 – June 30 (default `07-01`)
- **Currency:** PKR default

## Middleware

`src/middleware.ts` handles: Clerk auth protection, API rate limiting (30 req/60s per IP via Upstash), and CSRF validation for state-changing API requests (exemptions for webhooks, payments, cron, chat, mobile).

## Deployment

Vercel. Cron jobs configured in `vercel.json`: payment reminders, recurring invoices, low-stock alerts. `CRON_SECRET` env var required.

## Reference Docs

- `CONSTITUTION.md` — project rules, SDD workflow, anti-patterns
- `specs/` — feature specs (read before implementing)
- `.env.example` — full list of required/optional env vars
