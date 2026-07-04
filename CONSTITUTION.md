# NexaBook — Constitution

**Project:** NexaBook Cloud ERP & Accounting System
**Framework:** AgentFactory (panaversity.org)
**Version:** 2.0
**Date:** July 4, 2026
**Owner:** Ali Raza

---

## The 10-80-10 Rule (How We Work)

| Phase | Who | What |
|-------|-----|------|
| **First 10% — Intent** | Human (Ali Raza) | Define spec: goals, constraints, budget, permissions |
| **Middle 80% — Execution** | AI (Opencode/Mimo) | Write specs, code, tests, documentation |
| **Final 10% — Verification** | Human (Ali Raza) | Review, refine, approve, ship |

---

## Seven Invariants (AgentFactory Architecture)

| # | Invariant | NexaBook Application |
|---|-----------|---------------------|
| 1 | **Human is Principal** | Ali defines intent, AI executes, Ali verifies |
| 2 | **Every Human needs a Delegate** | NexaBot (AI assistant) holds context and represents judgment |
| 3 | **Management Layer** | Spec-driven feature development, lifecycle management |
| 4 | **Per-Worker Engine** | Gemini free tier for all AI features |
| 5 | **System of Record** | PostgreSQL via Drizzle ORM (Neon) — the authoritative store |
| 6 | **Expandable Workforce** | New Digital FTEs via specs on demand |
| 7 | **Nervous System** | Server actions, cron jobs, webhooks, event-driven |

---

## SDD Workflow (Spec-Driven Development)

Every feature follows this 4-phase process:

```
Phase 0: CONSTITUTION (this file — project-wide rules)
    │
    ▼
Phase 1: RESEARCH — Understand the problem & existing code
    │
    ▼
Phase 2: SPECIFY — Write the what & why (never the how)
    │
    ▼
Phase 3: CLARIFY — AI interviews human to surface ambiguity
    │
    ▼
Phase 4: BUILD — Plan → Tasks → Implement → Verify
```

**Rule:** If a gap is found during Build, go back and fix the spec first. The spec stays true.

---

## Spec Structure (Every spec.md Must Have)

```markdown
# spec.md — [Feature Name]

## Goal
The why, in 2-3 sentences.

## User Scenarios
- When [user action], then [expected result]

## Functional Requirements
FR-1 [Requirement 1]
FR-2 [Requirement 2]

## Edge Cases
- [Edge case 1]
- [Edge case 2]

## Out of Scope
- [What this does NOT do]

## Acceptance Criteria
- [ ] [Check 1]
- [ ] [Check 2]
```

**Rules:**
- Specs describe **behaviour only** — no databases, frameworks, or file layout
- Each requirement must be specific enough that a build ignoring it would visibly fail
- The "how" belongs in the plan, not the spec
- Keep the spec alive: when behaviour changes, change the spec first

---

## Skill Structure (Digital FTE Capabilities)

Each Digital FTE has skills in `.claude/skills/` or `src/skills/`:

```
skill-name/
├── SKILL.md        # Frontmatter (name, description) + body (instructions)
├── scripts/        # Optional: code the agent runs
├── references/     # Optional: deep docs, loaded on demand
└── assets/         # Optional: templates, schemas, lookup tables
```

**Progressive Disclosure:**
1. **Discovery:** At startup, only `name` + `description` loaded (~100 tokens each)
2. **Activation:** When task matches, full `SKILL.md` body loaded (500-2000 tokens)
3. **Execution:** Referenced files loaded only when reached for

**Description is the trigger:** Must describe WHAT it produces, WHEN to fire, KEYWORDS users type, and a DO-NOT line for look-alikes.

---

## Principles

1. **Double-entry bookkeeping is sacred.** Every financial transaction creates balanced journal entries. Debits must equal credits — always.
2. **Pakistan-first.** FBR invoicing, SRB/PRA provincial tax, NTN/STRN compliance, PKR formatting (Rs. 1,00,000 = 1 lakh), Urdu/English mixed UI.
3. **Multi-tenant isolation is non-negotiable.** Every database query, every server action, every API route MUST filter by `orgId`. No exceptions.
4. **Specs before code.** No feature is written without a reviewed spec in `specs/`.
5. **Prefer Drizzle ORM over raw SQL.** Use raw SQL only when performance requires it (e.g., complex aggregations).
6. **Free tier only.** No paid APIs. Gemini free tier (15 RPM, 1M tokens/day) is the AI backbone.
7. **TypeScript strict mode.** Zero `any` types. All functions typed. All exports explicit.
8. **No secrets in code.** Environment variables for all keys. Never commit `.env` files.
9. **Postgres is the system of record.** One database, one truth. Consolidate by default, specialize deliberately.
10. **Plan with strong model, execute with cheap one.** Expensive thinking up front, routine execution on budget.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.x |
| Language | TypeScript | 5.7+ |
| ORM | Drizzle | 0.45+ |
| Database | Neon PostgreSQL | Serverless |
| Auth | Clerk | 7.x |
| UI | Tailwind CSS + Radix UI | - |
| AI | Gemini (free tier) | 2.0 Flash |
| Email | Resend | Free (100/day) |
| Rate Limit | Upstash Redis | Free |
| Testing | Vitest | 4.x |
| PDF | jsPDF + @react-pdf | - |
| Hosting | Vercel | Free |

---

## Database Rules (System of Record)

1. **All monetary amounts:** `decimal(14,2)` — no floating point.
2. **IDs:** UUIDs generated by PostgreSQL (`gen_random_uuid()`).
3. **Timestamps:** `createdAt` and `updatedAt` on every table.
4. **Soft deletes:** `deletedAt` nullable column instead of hard deletes.
5. **Org scoping:** Every table with user data has `orgId` column with foreign key.
6. **No raw SQL in components.** Server actions or API routes only.
7. **Audit trail:** Every Worker action leaves a trace in the database.
8. **Embeddings:** pgvector for semantic search on reference data.

---

## Code Style

1. **File naming:** `kebab-case` for files, `PascalCase` for components, `camelCase` for functions/variables.
2. **Server actions:** `src/lib/actions/` — one file per domain.
3. **API routes:** `src/app/api/` — RESTful naming.
4. **Components:** `src/components/` — shared UI components only.
5. **No inline styles.** Tailwind CSS classes only.
6. **No comments** unless explicitly requested.

---

## Testing Rules

1. **Every server action** must have at least one test.
2. **Financial calculations** must have edge case tests (zero amounts, negative values, rounding).
3. **Multi-tenant queries** must verify orgId filtering.
4. **Run tests before merge:** `npm run test` must pass.
5. **TypeScript check:** `npx tsc --noEmit` must pass with 0 errors.

---

## Definition of Done

A feature is DONE when:

- [ ] Spec written and approved in `specs/`
- [ ] Code follows this constitution
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] Journal entries balance (for financial features)
- [ ] `orgId` scoping on every query
- [ ] Human reviewed and approved
- [ ] Documentation updated

---

## Pakistan Tax Compliance (Non-Negotiable)

1. **FBR integration** for sales tax invoicing.
2. **SRB/PRA** provincial tax tracking.
3. **NTN/STRN** validation on all tax-related forms.
4. **Withholding tax** calculations per FBR rates.
5. **Annual returns** data preparation (not filing — that's manual).
6. **PKR formatting:** Rs. 1,00,000 (lakh system), not $100,000.

---

## Financial Integrity Rules

1. **Every debit has a credit.** No orphaned journal entries.
2. **Account balances** are computed, not stored (derived from journal entries).
3. **Trial Balance** must balance to zero.
4. **Draft entries** are excluded from reports (Trial Balance, P&L, Balance Sheet).
5. **No deletion of posted entries** — only reversing entries allowed.
6. **Period closing** creates closing entries and locks the period.

---

## Anti-Patterns (Never Do This)

- ❌ Store passwords in code
- ❌ Use `any` type
- ❌ Skip `orgId` filter
- ❌ Hardcode API keys
- ❌ Use floating point for money
- ❌ Delete financial records
- ❌ Skip tests "just this once"
- ❌ Add paid APIs without approval
- ❌ Write specs after code
- ❌ Skip the Clarify phase (AI interview)
- ❌ Mix "how" into the spec

---

## Amendment Process

1. Propose change with rationale
2. Update this Constitution
3. Update affected specs
4. Commit with message: `docs: amend constitution — [reason]`
5. Notify team

---

**This Constitution is the supreme law of NexaBook. All code, specs, and decisions must align with it.**
