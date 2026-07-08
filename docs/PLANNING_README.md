# How to Use NexaBook Planning Documents
**Quick Navigation Guide for Next Sessions**

---

## 📚 The 4 Planning Documents (What Each Does)

### 1️⃣ **PROJECT_CONTEXT.md** — Understand Current State
**Read this first** when starting a new session.

**Contains:**
- Executive summary (what's built, what's broken)
- Tech stack overview
- All 15+ modules status
- Critical issues tier-by-tier (Tier 1 = security, Tier 2 = accounting, etc.)
- Key architectural decisions
- Database schema (high-level)
- Code quality snapshot

**Use When:**
- "Where are we at?" — read Executive Summary
- "What modules exist?" — read What's Currently Built
- "What issues exist?" — read Critical Issues Found
- "Why did we choose Clerk/Drizzle/etc?" — read Key Architectural Decisions

**Length:** ~500 lines (5-10 min read)

---

### 2️⃣ **IMPROVEMENT_PLAN.md** — Detailed Task Breakdown
**Read this before starting work** on any phase.

**Contains:**
- 6 phases with 3 difficulty levels each
- Every task has:
  - Time estimate (hours)
  - File paths affected
  - Code snippets (before/after)
  - Verification checklist
- Task dependencies
- Estimated timeline

**Use When:**
- "What do I do next?" — read current phase's level
- "How do I fix X?" — search task name, see code example
- "How long will this take?" — check time estimate
- "How do I verify it worked?" — check verification checklist

**Length:** ~800 lines (30-45 min detailed read, 5 min for one task)

---

### 3️⃣ **TASKS.md** — Check Progress
**Update this file as you work** (mark tasks complete).

**Contains:**
- Flat task list with checkboxes
- All 40+ tasks across 6 phases
- Current phase highlighted
- Milestone checkpoints (Week 4, Week 5, Week 7, Week 12)
- Time estimates per phase
- Dependency notes

**Use When:**
- "What's done?" — look for [x] checkboxes
- "What's next?" — look for [ ] (unchecked) tasks
- "Are we on track?" — check milestone checkpoints
- "Update progress" — Mark tasks [x] as completed

**Length:** ~400 lines (10 min read, 1 min per update)

---

### 4️⃣ **DECISIONS_LOG.md** — Why We're Doing What
**Reference this** when debating architecture choices.

**Contains:**
- 10 active architectural decisions (with why/trade-offs)
- 4 historical decisions (for context)
- 4 pending decisions (waiting for input)
- Decision-making framework (how to make future decisions)
- FAQ ("Why didn't we...?")

**Use When:**
- "Why not use REST API?" → see D-003
- "Why Clerk instead of Auth0?" → see D-003
- "Can we skip Phase 1?" → see D-010
- "Should we add Stripe?" → see pending decision P-003
- "How should we decide X?" → see Decision Making Framework

**Length:** ~400 lines (15-20 min read, 2 min per lookup)

---

## 🎯 Quick Start for Next Session

**Scenario: "It's Monday morning, what do I work on?"**

1. **Read:** TASKS.md (2 min)
   - Find earliest [ ] task (unchecked)
   - Check its time estimate

2. **Read:** IMPROVEMENT_PLAN.md (5 min)
   - Search task number (e.g., "1.1.1")
   - Read the detailed description + code examples

3. **Work:** Follow the code snippets and verification checklist

4. **Done:** Update TASKS.md
   - Mark [x] task complete
   - Check next task

---

## 📊 Phase Overview (One-Liner Each)

| Phase | Goal | Timeline |
|-------|------|----------|
| **1** | Secure the app (middleware, auth, orgId scoping) | Week 1-4 |
| **2** | Fix accounting (date filtering, P&L accuracy, journals) | Week 2-5 |
| **3** | Test everything (60%+ coverage, integration tests) | Week 4-7 |
| **4** | Optimize performance (indexes, N+1 queries) | Week 7-9 |
| **5** | Add advanced features (billing, period locking, cash flow) | Week 8-11 |
| **6** | Deploy & monitor (Sentry, metrics, launch checklist) | Week 12 |

**Total: 8-12 weeks to production-ready**

---

## 🚦 Current Status

### Completed ✅
- [x] Project analysis & context written
- [x] Improvement plan broken into 6 phases
- [x] All 40+ tasks listed with estimates
- [x] Architectural decisions documented

### Ready to Start ⏳
- [ ] Phase 1, Level 1, Task 1.1.1 (Add Clerk Middleware)

### Recommended Starter Task 🎯
**Pick ONE to start:**

1. **2.1.1** (0.5h) — Fix COA duplicate codes → Easiest, visible result
2. **1.1.1** (2h) — Add Clerk middleware → Most critical
3. **2.1.2** (2h) — Filter draft entries from reports → Quick accounting win

---

## 🔗 Document Relationships

```
PROJECT_CONTEXT.md
    ↓ "What needs fixing?"
IMPROVEMENT_PLAN.md
    ↓ "Which tasks?"
TASKS.md
    ↓ "What's next?"
DECISIONS_LOG.md
    ↓ "Why this approach?"
CODE
```

**Always read in this order when starting a new session.**

---

## 📝 How to Update These Docs

### When You Complete a Task:
1. Open TASKS.md
2. Find task (e.g., "1.1.1")
3. Change `[ ]` → `[x]`
4. If task took longer/shorter, update time estimate in IMPROVEMENT_PLAN.md
5. Commit: `git add docs/TASKS.md && git commit -m "docs: mark 1.1.1 complete"`

### When You Find a Bug in the Plan:
1. Open IMPROVEMENT_PLAN.md
2. Fix description, code example, or estimate
3. Commit: `git add docs/IMPROVEMENT_PLAN.md && git commit -m "docs: fix 1.1.1 verification"`

### When You Make a Decision:
1. Open DECISIONS_LOG.md
2. Add new decision under "Active Decisions" section
3. Use format: D-0XX (next unused number)
4. Include: Context, Decision, Why, Trade-offs, Implementation link

---

## 🎓 For New Team Members

**Onboarding path:**
1. Read README.md (general overview)
2. Read PROJECT_CONTEXT.md (where we're at)
3. Read IMPROVEMENT_PLAN.md (Phase overview only, don't memorize tasks yet)
4. Read CONSTITUTION.md (project rules)
5. Ask questions about DECISIONS_LOG.md

**Then:** Pick a small task from Phase 1, Level 1 and go.

---

## ⚠️ Important Notes

### Phase 1 Must Complete First
Phase 1 (security) blocks everything else. Do NOT skip it or defer. It's 62.5 hours but non-negotiable.

### Phases Can Partially Parallelize
- Phase 1 must complete first
- Phase 2 can start when Phase 1 is 50%+ done
- Phase 3 can start when Phase 2 is 50%+ done
- Phases 4-6 sequential

### Tasks Have Estimates ±30%
Actual time may vary. If a task takes 2x longer, stop and diagnose (blockers? scope creep?) rather than powering through.

### Checkpoints Are Go/No-Go
- Week 4: Phase 1 must be done (or extend deadline)
- Week 5: Phase 2 must be done (or delay Phase 3)
- Week 7: Phase 3 must be done (or request resources)
- Week 12: Everything done before launch

---

## 🔍 Find Something Quickly

**Q: "Where do I find the Clerk middleware task?"**
A: TASKS.md → find "1.1.1" → IMPROVEMENT_PLAN.md → search "1.1.1"

**Q: "Why did we choose Drizzle?"**
A: DECISIONS_LOG.md → search "Drizzle" → see D-004

**Q: "What's the current accounting issue?"**
A: PROJECT_CONTEXT.md → search "TIER 2" → "Accounting Correctness"

**Q: "How do I know if Phase 1 is complete?"**
A: TASKS.md → find Phase 1 section → all [x] = done

**Q: "What's after Phase 1?"**
A: IMPROVEMENT_PLAN.md → scroll to "PHASE 2"

---

## 💾 Files Summary

| File | Lines | Time | Purpose |
|------|-------|------|---------|
| PROJECT_CONTEXT.md | ~500 | 5-10m | Current state snapshot |
| IMPROVEMENT_PLAN.md | ~800 | 30-45m | Detailed task breakdown |
| TASKS.md | ~400 | 10m | Progress tracker |
| DECISIONS_LOG.md | ~400 | 15-20m | Architecture decisions |
| PLANNING_README.md | ~300 | 5m | This file (navigation guide) |

**Total:** 2400 lines of planning docs (80-90 min to read thoroughly)

---

## Next: Start Phase 1

When you're ready:
1. Read IMPROVEMENT_PLAN.md section "PHASE 1: SECURITY HARDENING"
2. Start with Task 1.1.1 or 1.1.2
3. Follow code snippets and verification checklist
4. Update TASKS.md when done

**Good luck! 🚀**