# NexaBook — Decisions Log & Architecture Record
**Version:** 3.0  
**Created:** 2026-07-08  
**Owner:** Ali Raza  
**Purpose:** Track all major architectural & strategic decisions

---

## Active Decisions (Current)

### D-001: 6-Phase Improvement Plan (APPROVED)
**Date:** 2026-07-08  
**Maker:** Ali Raza  
**Status:** ✅ APPROVED

**Decision:** Follow sequential 6-phase plan:
1. Phase 1: Security Hardening (3-4 weeks)
2. Phase 2: Accounting Corrections (2-3 weeks)
3. Phase 3: Testing (2-3 weeks)
4. Phase 4: Performance (1-2 weeks)
5. Phase 5: Advanced Features (2-3 weeks)
6. Phase 6: Deployment (1 week)

**Why:** 
- Phase 1 (security) blocks everything — must be first
- Phase 2 (accounting) depends on Phase 1 completion
- Phases 3-6 can partially parallelize but need 1-2 completion
- Total: 8-12 weeks to production-ready

**Trade-offs:**
- ❌ Slower than "build features first" approach
- ✅ Delivers secure, auditable, testable system
- ✅ Prevents expensive rework later
- ✅ Matches "build right, build fast" philosophy

**Implementation:** See IMPROVEMENT_PLAN.md for detailed breakdown

---

### D-002: Free Tier Only Policy (EXISTING)
**Date:** Before 2026-07-08 (from CONSTITUTION.md)  
**Maker:** Ali Raza  
**Status:** ✅ ENFORCED

**Decision:** NexaBook uses ONLY free-tier services for MVP:
- Gemini 2.0 Flash (free: 15 RPM, 1M tokens/day)
- Neon PostgreSQL (free: 10GB, 3 projects)
- Vercel (free: 100GB bandwidth)
- Resend (free: 100 emails/day)
- No Stripe until revenue exists

**Why:**
- Zero cost to launch MVP
- Validates product-market fit before spending
- Easy to migrate to paid when needed
- Acceptable for SMB Pakistan market

**Constraints:**
- Gemini rate limits (15 RPM) → queue AI requests
- Email limits (100/day) → segment users by priority
- Bandwidth (100GB) → monitor usage

**Revisit:** When org count reaches 100 or monthly spend >$0

---

### D-003: Server Actions Over REST API (EXISTING)
**Date:** Before 2026-07-08  
**Maker:** Ali Raza  
**Status:** ✅ ENFORCED

**Decision:** Use Next.js Server Actions, NOT traditional REST API

**Why:**
- Automatic type safety (TypeScript across client-server)
- Fewer files (no API route per endpoint)
- Built-in CSRF protection
- RPC-style is natural for accounting software

**Trade-offs:**
- ❌ No public API for 3rd-party integrations (yet)
- ✅ Faster development
- ✅ Better DX

**Future:** Can add REST API layer in Phase 5 if needed

---

### D-004: Drizzle ORM for All Data Access (EXISTING)
**Date:** Before 2026-07-08  
**Maker:** Ali Raza  
**Status:** ✅ ENFORCED

**Decision:** Use Drizzle ORM exclusively (no raw SQL except aggregations)

**Why:**
- Type-safe queries prevent mistakes
- Migrations auto-generated
- Query builder prevents N+1 patterns
- Scales better than string-based SQL

**Exception:** Complex aggregations (P&L, trial balance) can use `sql\`...\`` for performance

---

### D-005: Double-Entry Bookkeeping is Sacred (EXISTING)
**Date:** Before 2026-07-08  
**Maker:** Ali Raza  
**Status:** ✅ ENFORCED

**Decision:** Every financial transaction MUST create balanced journal entries (debits = credits)

**Rule:** `validateJournalBalance()` enforced on every insert, no exceptions

**Why:**
- Accounting 101: Foundation of financial integrity
- Enables audit trail & reconciliation
- Required for Pakistan tax compliance

---

### D-006: Multi-Tenancy by orgId (EXISTING)
**Date:** Before 2026-07-08  
**Maker:** Ali Raza  
**Status:** ✅ ENFORCED (but needs middleware)

**Decision:** Every table has `orgId` foreign key, all queries scoped

**Current Issue:** Scoping relies on each server action remembering to filter — fragile

**Phase 1 Fix:** Add middleware that auto-injects orgId (Task 1.2.1)

**Future:** PostgreSQL Row-Level Security (Task 1.2.3)

---

### D-007: Spec-Driven Development (EXISTING)
**Date:** Before 2026-07-08 (from CONSTITUTION.md)  
**Maker:** Ali Raza  
**Status:** ✅ INTENDED (not yet enforced)

**Decision:** Every feature starts with spec (CONSTITUTION.md defines format)

**Pattern:**
```
Phase 0: CONSTITUTION (rules)
  ↓
Phase 1: RESEARCH (understand problem)
  ↓
Phase 2: SPECIFY (write what, not how)
  ↓
Phase 3: CLARIFY (interview for ambiguity)
  ↓
Phase 4: BUILD (plan → tasks → implement → verify)
```

**Note:** Current codebase built before specs were enforced. Phase 1 tasks don't have specs. Consider adding spec template for future features.

---

### D-008: AgentFactory Framework (EXISTING)
**Date:** Before 2026-07-08 (from CONSTITUTION.md)  
**Maker:** Ali Raza  
**Status:** ✅ INTENDED

**Decision:** Use AgentFactory (10-80-10 rule):
- 10% Human (Ali): Define intent, constraints, budget
- 80% AI: Implement, test, document
- 10% Human: Review, refine, approve

**Why:** Faster development, clear accountability

**Constraints:**
- Only free AI (Gemini, no OpenAI)
- Skills in `.claude/skills/` (not yet populated)

---

### D-009: Pakistan Tax Compliance is Non-Negotiable (EXISTING)
**Date:** Before 2026-07-08  
**Maker:** Ali Raza  
**Status:** ✅ ENFORCED

**Requirements:**
- [ ] FBR e-invoicing integration
- [ ] Sales Tax (SST/PST) per province
- [ ] Input/Output Tax GL separation
- [ ] Withholding Tax (WHT) tracking
- [ ] NTN/STRN validation
- [ ] Annual returns preparation

**Current:** Mostly built (per Phase G docs)

**Phase 1:** Verify + audit (see Task 1.2.2)

---

### D-010: Production Launch Requirements (NEW)
**Date:** 2026-07-08  
**Maker:** Ali Raza  
**Status:** ✅ APPROVED

**Decision:** Before launch, must achieve:

| Requirement | Target | Status |
|-------------|--------|--------|
| Security | All P0 issues fixed | ⏳ Phase 1 |
| Accounting | Trial balance = 0 | ⏳ Phase 2 |
| Testing | 60%+ coverage | ⏳ Phase 3 |
| Performance | <100ms reports | ⏳ Phase 4 |
| Monitoring | Sentry + metrics | ⏳ Phase 6 |
| Documentation | Updated & complete | ✅ PROJECT_CONTEXT.md |

**Go/No-Go:** All checkboxes must be ✅ before Vercel deployment

---

## Historical Decisions (For Context)

### H-001: Next.js 16 + TypeScript 5.7 (ENFORCED)
**Rationale:** Latest stable versions at project start, modern tooling

---

### H-002: Shadcn UI + Tailwind CSS (ENFORCED)
**Rationale:** Component-driven UI, rapid development, professional design

---

### H-003: Clerk for Authentication (ENFORCED)
**Rationale:** Multi-tenant out-of-box, free tier, faster than Auth0

---

### H-004: Neon PostgreSQL (ENFORCED)
**Rationale:** Serverless, free tier, Pakistan doesn't require local DB

---

## Pending Decisions (Need Input)

### P-001: Public API Strategy
**Question:** Should NexaBook expose REST API for integrations?

**Options:**
1. No API (current) — Server Actions only, internal use
2. Basic API — CRUD endpoints for customers, invoices, products
3. Full API — GraphQL + REST, webhooks, API keys

**Impact:** 
- Option 1: Fast to launch, hard to integrate with 3rd parties
- Option 2: Medium effort, enables Zapier/integrations
- Option 3: Significant effort, full ecosystem support

**Recommendation:** Option 1 for MVP, Option 2 in Phase 5 if demand exists

**Defer to:** Phase 5 sprint review

---

### P-002: Mobile Strategy
**Question:** Build native mobile app or mobile web?

**Options:**
1. Mobile web (responsive, current) — Already works
2. React Native (Ali's expertise) — Native iOS/Android
3. Both (long-term) — Web + native

**Impact:**
- Option 1: Free, fast to deploy, offline issues
- Option 2: Better UX, offline support, 2-3 week effort
- Option 3: Maximum coverage, 4-5 week effort

**Recommendation:** Start with mobile web (already works), add React Native in Phase 5

**Defer to:** Phase 5 sprint review

---

### P-003: Multi-Currency Future
**Question:** How to handle multi-currency accounting?

**Current:** Each org has single currency (default PKR)

**Future Options:**
1. Single-currency only — Keep current, target Pakistan SMBs
2. Multi-currency per org — Allow GBP, USD, AED alongside PKR
3. Multi-currency per transaction — Complex (dual ledger approach)

**Impact:**
- Option 1: Simple, fits Pakistan focus
- Option 2: Enables regional expansion, moderate complexity
- Option 3: Very complex (requires realization entries)

**Recommendation:** Option 1 for MVP, Option 2 in Phase 5 if expanding beyond Pakistan

**Defer to:** Product review when >50 orgs onboard

---

### P-004: Subscription Billing Model
**Question:** How to charge for NexaBook?

**Options:**
1. Freemium — Free for <5 invoices/month, paid for unlimited
2. Per-Org — Free org gets limited modules, Professional = all modules
3. Usage-based — Charge per invoice, per employee, per transaction
4. Support-only — Software free, charge for setup + support

**Impact:**
- Option 1: Simple to implement, low LTV
- Option 2: Fastest path to revenue, aligns with Clerk plans
- Option 3: Complex metering, high LTV
- Option 4: Services heavy, low margins

**Recommendation:** Option 2 (Professional/Enterprise plans exist in schema already)

**Task:** Phase 5 Task 5.1.1 (Stripe integration)

---

## Decision Making Framework

When making decisions in future phases, use this framework:

1. **Context** — What problem are we solving?
2. **Options** — What are 2-3 realistic options?
3. **Criteria** — How do we evaluate? (speed, cost, quality, user impact)
4. **Trade-offs** — What do we gain/lose per option?
5. **Decision** — Pick one, state why
6. **Implementation** — Assign to phase/task
7. **Review** — When to revisit? (date or trigger)

**Log every decision here** — makes onboarding new team members easy

---

## FAQ: "Why Did We..."

**Q: Why not fix security first?**  
A: Security IS first (Phase 1). But we documented current state before fixing it.

**Q: Why no tests today?**  
A: Phase 3 adds 60%+ coverage. Current 1 test file is minimum viable.

**Q: Why Clerk instead of Auth0?**  
A: Clerk has better multi-tenant support, free tier goes higher, faster setup (D-003).

**Q: Why no Stripe billing yet?**  
A: Free tier policy (D-002) — validates product before monetizing.

**Q: Can I skip Phase 1 and go straight to features?**  
A: No. Unpatched security = data breach + compliance violation. Non-negotiable.

---

## Next Decision to Make

**When:** After Phase 1 Checkpoint (Week 4)

**Topic:** Public API Strategy (P-001)

**Input Needed:** 
- [ ] Do customers ask for API?
- [ ] Are there integration needs?
- [ ] Should we build Zapier/webhook support?

**Owner:** Ali Raza (with team input)

---

This log is living. Update after each major decision.