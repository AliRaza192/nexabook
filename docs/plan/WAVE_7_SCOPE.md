# NexaBook — Wave 7 Scope: Financial Core Hardening

**Date:** 2026-09-03
**Source audit:** `NexaBook-FORENSIC-AUDIT-2026-09-03.md` (P0 findings NB-P0-01 through NB-P0-13)
**Verification:** Each finding re-read against current source by opencode agent; file:line references confirmed against `main` @ `2bfff18`.

---

## 1. Finding inventory

13 P0 findings were identified by the forensic audit. All 13 have been independently verified against source code. One finding (NB-P0-02) is rated P0/P1 — included here because its credit-limit enforcement impact is material.

| # | ID | Title | Severity | Verified | Files |
|---|---|---|---|---|---|
| 1 | NB-P0-01 | Invoice "received amount" has no cash/bank JE | P0 | ✅ | `sales.ts` |
| 2 | NB-P0-02 | `customers.balance` denormalized but never maintained | P0/P1 | ✅ | `sales.ts` |
| 3 | NB-P0-03 | Settlements change balances/status without accounting entries | P0 | ✅ | `sales.ts`, `purchases.ts` |
| 4 | NB-P0-04 | Sales return missing COGS/inventory GL reversal | P0 | ✅ | `sales.ts` |
| 5 | NB-P0-05 | Purchase return credits wrong account (not inventory asset) | P0 | ✅ | `purchases.ts` |
| 6 | NB-P0-06 | GRN + purchase invoice double-count inventory stock | P0 | ✅ | `purchases.ts` |
| 7 | NB-P0-07 | Stock count claims journal entry but never creates it | P0 | ✅ | `stock-count.ts` |
| 8 | NB-P0-08 | Stock adjustment mutates stock before approval | P0 | ✅ | `inventory-depth.ts` |
| 9 | NB-P0-09 | Posted journal entries are deletable (no reversal) | P0 | ✅ | `accounts.ts` |
| 10 | NB-P0-10 | Approved invoices are physically deleted | P0 | ✅ | `sales.ts` |
| 11 | NB-P0-11 | Journal line account IDs not validated for tenant ownership | P0 | ✅ | `accounts.ts` |
| 12 | NB-P0-12 | Zod validation schemas exist but are never used | P0 | ✅ | `validations.ts`, all `actions/` |
| 13 | NB-P0-13 | Hardcoded fallback encryption key in production | P0 | ✅ | `encryption.ts` |

---

## 2. Per-finding detail

### NB-P0-01 — Invoice "received amount" has no cash/bank JE

**Problem:** The invoice form collects `receivedAmount`, `cashBankAccountId`, and `paymentReference`. `createInvoice` stores them on the invoice row and computes `balanceAmount = netAmount - receivedAmount`. But `approveInvoice` posts only:

```
Dr Accounts Receivable     netAmount
Cr Sales Revenue           revenue
Dr COGS                    COGS
Cr Inventory               COGS
[+ optional tax/shipping/rounding]
```

No `Dr Cash/Bank, Cr AR` is created for the received portion. A separate `createCustomerPayment` function exists (`sales.ts:3237`) that correctly creates this entry, but the invoice Save & Approve flow never calls it.

**Impact:** Cash/Bank understated, AR overstated by `receivedAmount` on every invoice with partial payment.

**Evidence:**
- Form sends fields: `sales/invoices/new/page.tsx:491-493`
- `approveInvoice` JE lines: `sales.ts:1118-1154` — no cash line
- `createInvoice` stores received amount: `sales.ts:773-799`
- `approveInvoice` reads `invoice.receivedAmount` at `sales.ts:862` but never uses it in JE construction
- `createCustomerPayment` (correct pattern) exists at `sales.ts:3350-3375` but is never called from invoice flow

**Dependencies:** None — standalone fix in `approveInvoice`.

---

### NB-P0-02 — `customers.balance` denormalized but never maintained

**Problem:** `customers.balance` is initialized to `openingBalance` at creation (`sales.ts:186`) and never updated by any subsequent operation. The credit-limit check at `sales.ts:738-753` reads this stale field.

**Impact:** Credit limits are unenforced after the first transaction. A customer can owe unlimited amounts.

**Evidence:**
- Set once: `sales.ts:186` (`balance: data.openingBalance || "0"`)
- Read for credit check: `sales.ts:738` (`balance: customers.balance`)
- Never updated by: `approveInvoice` (`sales.ts:852-1200`), `createCustomerPayment` (`sales.ts:3237-3392`), `allocatePayment` (`sales.ts:3394-3459`), `approveSalesReturn` (`sales.ts:3007-3177`), `createCustomerSettlement` (`sales.ts:3537-3620`), `processPosSale` (`pos.ts:590-608`)

**Dependencies:** Should be fixed as part of centralized posting engine (NB-P0-01 dependency) — the balance should be derived from posted AR transactions, not a mutable column.

---

### NB-P0-03 — Settlements change balances/status without accounting entries

**Problem:** `createCustomerSettlement` and `createVendorSettlement` mark invoices as "paid", update balances, and record discounts — but create zero journal entries.

**Impact:** Trial balance does not reflect settlement movements. Financial statements are misstated.

**Evidence:**
- `createCustomerSettlement`: `sales.ts:3537-3620` — inserts `settlements` + `settlementLines`, marks invoices paid. No `db.insert(journalEntries)`.
- `createVendorSettlement`: `purchases.ts:2008-2088` — same pattern, no JE.
- Contrast: `createCustomerPayment` (`sales.ts:3337-3376`) and `createVendorPayment` (`purchases.ts:1916-1920`) both create proper JEs.

**Dependencies:** Requires centralized posting engine. Settlement JE structure: `Dr Cash/Bank, Dr Discount (if any), Cr AR` / `Dr AP, Cr Cash/Bank, Cr Discount (if any)`.

---

### NB-P0-04 — Sales return missing COGS/inventory GL reversal

**Problem:** `approveSalesReturn` increases physical stock and creates `Dr Sales Returns, Cr AR`, but does not reverse COGS or restore inventory asset value in the GL.

**Impact:** Inventory asset on balance sheet is understated; COGS on income statement is overstated.

**Evidence:**
- `approveSalesReturn` JE lines: `sales.ts:3133-3158` — only 2 lines (Sales Returns debit, AR credit)
- Stock increase: `sales.ts:3032-3050` — physical stock goes up but no GL counterpart for inventory asset
- Missing lines: `Dr Inventory, Cr COGS` using historical cost of returned goods

**Dependencies:** Requires knowing original cost at time of sale. If historical cost layer model (P1-04) is not yet implemented, use current `costPrice` as interim.

---

### NB-P0-05 — Purchase return credits wrong account

**Problem:** `approvePurchaseReturn` credits `Purchase Returns & Allowances` (contra-expense) instead of the Inventory Asset account. Physical stock decreases but the GL inventory asset is not reduced.

**Impact:** Balance sheet overstates inventory asset; income statement understates purchases.

**Evidence:**
- JE structure: `purchases.ts:1690-1714` — credit goes to Purchase Returns account (line 1690), not inventory asset
- Stock decrease: `purchases.ts:1642-1650` — physical stock goes down
- Expected: `Cr Inventory` (asset reduction) instead of `Cr Purchase Returns`

**Dependencies:** Same as P0-04 — needs historical cost. Fix in `approvePurchaseReturn`.

---

### NB-P0-06 — GRN + purchase invoice double-count inventory

**Problem:** `createGRN` immediately increments `products.currentStock`. `approvePurchaseInvoice` also increments `products.currentStock` for the same items. When a GRN is linked to a purchase invoice, stock is doubled.

**Impact:** Inventory can be inflated by 100% on GRN→Invoice workflow.

**Evidence:**
- `createGRN` stock increment: `purchases.ts:1364-1369` — `currentStock + acceptedQty`
- `approvePurchaseInvoice` stock increment: `purchases.ts:367-446` (line 417-427) — `currentStock += baseQuantity`
- No guard: `approvePurchaseInvoice` never queries `goodReceivingNotes` or checks if GRN already received stock
- GRN stores `purchaseInvoiceId`: `purchases.ts:1345` — but this link is never checked by invoice approval

**Dependencies:** Architecture decision needed — either:
  - (A) GRN does NOT increment stock; only invoice approval does (simpler, recommended)
  - (B) Invoice approval checks if GRN already received and skips stock increment (three-way match)

---

### NB-P0-07 — Stock count claims journal entry but never creates it

**Problem:** `completeStockCount` updates `products.currentStock`, creates stock movement records, builds `journalLineItems` array, and sets `journalEntryCreated = journalLineItems.length > 0` — but never inserts the journal entry.

**Impact:** Response reports `journalEntryCreated: true` when no JE exists. GL is disconnected from physical inventory changes.

**Evidence:**
- Stock mutation: `stock-count.ts:336` — `products.currentStock` updated
- JE lines built in memory: `stock-count.ts:355-382`
- Flag set without insert: `stock-count.ts:388` — `const journalEntryCreated = journalLineItems.length > 0`
- Comment confirms: `stock-count.ts:386-387` — "skip journal entry creation for now"
- No `db.insert(journalEntries)` call anywhere in the function

**Dependencies:** Requires account lookup (which accounts for inventory gain/loss). Needs `checkPeriodLocked`.

---

### NB-P0-08 — Stock adjustment mutates stock before approval

**Problem:** `addStockAdjustment` sets `approvalStatus: "pending_approval"` but immediately updates `products.currentStock`. The JE is only created later in `approveStockAdjustment`.

**Impact:** Approval boundary is violated — unapproved adjustments already affect physical inventory.

**Evidence:**
- Adjustment created: `inventory-depth.ts:247-255` — `approvalStatus: "pending_approval"`
- Stock mutated immediately: `inventory-depth.ts:288-291` — `products.currentStock` updated
- Stock movements created immediately: `inventory-depth.ts:295`
- JE created only on approval: `inventory-depth.ts:374/405`

**Dependencies:** Requires removing stock mutation from `addStockAdjustment` and moving it to `approveStockAdjustment`. May need a "pending quantity" concept if the UI shows expected stock.

---

### NB-P0-09 — Posted journal entries are deletable

**Problem:** `deleteJournalEntry` permits deletion of any journal entry after only checking RBAC and fiscal-period lock. Posted entries should be immutable.

**Impact:** Audit trail destroyed. GL can be silently altered.

**Evidence:**
- Deletion function: `accounts.ts:1384-1443`
- Only checks: RBAC (`requireRole`) at line 1387, fiscal period lock at line 1402
- No check on `entry.status` (which can be `"draft"`, `"posted"`, or `"reversed"` per schema)
- No reversal JE created

**Dependencies:** None — standalone fix. Add: if `status === "posted"`, reject deletion or require reversal JE first.

---

### NB-P0-10 — Approved invoices are physically deleted

**Problem:** `deleteInvoice` for approved invoices creates a reversal JE then physically deletes the invoice row and items. Historical document numbers and references are lost.

**Impact:** Non-audit-grade lifecycle. Invoice numbers cannot be traced.

**Evidence:**
- Deletion function: `sales.ts:1353-1454`
- Reversal JE created: `sales.ts:1406-1447`
- Physical delete: `sales.ts:1451-1454` — `tx.delete(invoiceItems)` then `tx.delete(invoices)`
- No audit log for the deletion itself

**Dependencies:** Should implement void/cancel lifecycle: `POSTED → VOIDED → reversal JE`. Invoice row stays with `status: "voided"`.

---

### NB-P0-11 — Journal line account IDs not validated for tenant ownership

**Problem:** `createJournalEntry` accepts `accountId` values from the client and inserts them without verifying that each account belongs to the current `orgId`.

**Impact:** A user could reference accounts from other tenants, corrupting cross-tenant data.

**Evidence:**
- Insert: `accounts.ts:301-308` — `accountId: line.accountId` inserted directly
- No query: `chartOfAccounts WHERE id = accountId AND orgId = currentOrgId` is never executed
- Only check: `accounts.ts:237-239` — ensures the *user* has an org, not that each account belongs to it

**Dependencies:** None — standalone fix. Add ownership check in the line-insert loop.

---

### NB-P0-12 — Zod validation schemas exist but are never used

**Problem:** `src/lib/validations.ts` exports well-defined Zod schemas for invoices, customers, vendors, products, journal entries, employees, and bank accounts. No server action, API route, or component imports them.

**Impact:** Server trusts client-provided strings/numbers for quantities, prices, taxes, discounts, totals, account IDs, and warehouse IDs.

**Evidence:**
- Schemas exported: `validations.ts` — `createJournalEntrySchema` (line 78), `createInvoiceSchema` (line 22), `createCustomerSchema` (line 45), etc.
- Zero imports: `grep -rn "from.*validations" src/lib/actions/` returns nothing
- Manual validation in actions: e.g., `accounts.ts:254` checks debit/credit balance by hand

**Dependencies:** None — standalone fix. Wire schemas into each action function's entry point.

---

### NB-P0-13 — Hardcoded fallback encryption key

**Problem:** If `ENCRYPTION_KEY` env var is missing, the application derives a key from the hardcoded string `"nexabook-default-dev-key"`. No runtime guard prevents this in production.

**Impact:** All environments without the env var share the same predictable encryption key. Anyone with source access can decrypt all tokens.

**Evidence:**
- Fallback: `encryption.ts:9` — `crypto.scryptSync("nexabook-default-dev-key", "salt", 32)`
- Used by: `encryptToken` (line 14), `decryptToken` (line 28)
- No `NODE_ENV` check, no throw, no warning

**Dependencies:** None — standalone fix. Throw error if `ENCRYPTION_KEY` is missing in production.

---

## 3. Dependency graph

```
NB-P0-13  encryption key fail-closed ──────────────────────── standalone ⚡
NB-P0-09  posted JE immutability ──────────────────────────── standalone ⚡
NB-P0-11  account tenant ownership ────────────────────────── standalone ⚡
NB-P0-12  wire Zod validation ─────────────────────────────── standalone ⚡
NB-P0-08  stock adjustment behind approval ────────────────── standalone ⚡
NB-P0-07  stock count actual JE ────────────────────────────── standalone ⚡

NB-P0-06  GRN/invoice double stock ─────────────────────────── standalone ⚡
NB-P0-10  invoice void lifecycle ───────────────────────────── depends on P0-09 (JE immutability pattern)

NB-P0-01  invoice received-amount JE ─────────────┐
NB-P0-02  customers.balance source of truth ──────┤
NB-P0-03  settlement accounting ──────────────────┤── ALL require centralized posting engine
NB-P0-04  sales return COGS reversal ─────────────┤
NB-P0-05  purchase return inventory reversal ─────┘
```

**Critical path:**

```
Posting engine foundation (new)
  ├─ NB-P0-01  invoice received-amount
  ├─ NB-P0-03  settlement JE
  ├─ NB-P0-04  sales return COGS
  ├─ NB-P0-05  purchase return inventory
  └─ NB-P0-02  customer balance derivation

In parallel with posting engine:
  ├─ NB-P0-06  GRN/invoice dedup
  ├─ NB-P0-07  stock count JE
  ├─ NB-P0-08  stock adjustment approval
  ├─ NB-P0-09  JE immutability
  ├─ NB-P0-10  invoice void lifecycle
  ├─ NB-P0-11  account tenant check
  ├─ NB-P0-12  wire Zod schemas
  └─ NB-P0-13  encryption key
```

---

## 4. Recommended wave structure

### Wave 7a — Standalone fixes (parallel, no shared dependency)

| Fix | Scope | Est. |
|---|---|---|
| NB-P0-13 | `encryption.ts` — throw if key missing in prod | 0.5h |
| NB-P0-09 | `accounts.ts:deleteJournalEntry` — reject if status = "posted" | 0.5h |
| NB-P0-11 | `accounts.ts:createJournalEntry` — add org ownership check per line | 1h |
| NB-P0-12 | Wire `validations.ts` schemas into all action entry points | 2h |
| NB-P0-08 | `inventory-depth.ts` — move stock mutation from create to approve | 1.5h |
| NB-P0-07 | `stock-count.ts` — actually insert the JE (with account lookup) | 1.5h |
| NB-P0-06 | `purchases.ts` — GRN/invoice stock dedup guard | 1.5h |
| NB-P0-10 | `sales.ts` — void lifecycle instead of physical delete | 2h |

**Parallel batch total: ~10.5h**

### Wave 7b — Posting engine + dependent fixes (serial)

| Fix | Scope | Est. |
|---|---|---|
| Foundation | `src/lib/accounting/posting-engine.ts` — central JE builder, account resolver, period control | 4h |
| NB-P0-01 | Wire `approveInvoice` through posting engine with received-amount cash line | 2h |
| NB-P0-03 | Wire settlements through posting engine | 2h |
| NB-P0-04 | Wire sales returns through posting engine (with COGS reversal) | 2h |
| NB-P0-05 | Wire purchase returns through posting engine (credit inventory asset) | 2h |
| NB-P0-02 | Derive `customers.balance` from posted AR (or update in posting engine) | 1.5h |

**Serial path total: ~13.5h**

### Wave 7c — Gate tests

| Test | Scope | Est. |
|---|---|---|
| Financial invariant tests | Invoice JE balance, payment JE balance, return JE balance, settlement JE balance | 3h |
| GRN/invoice dedup test | GRN→Invoice workflow produces correct stock | 1h |
| Stock adjustment lifecycle | Create(pending)→Approve→JE posted | 1h |
| Void lifecycle | Posted invoice → voided → reversal JE exists | 1h |
| Tenant isolation | Account IDs from other org rejected | 1h |

**Gate test total: ~7h**

---

## 5. Production readiness gate (Wave 7 exit criteria)

- [ ] All 13 P0 findings fixed and verified
- [ ] Posting engine handles: invoice, payment, return, settlement, expense, payroll
- [ ] Every posting path calls `checkPeriodLocked`
- [ ] Every foreign key validated against `orgId` before insert
- [ ] Posted JEs cannot be deleted (only reversed)
- [ ] Invoices cannot be physically deleted (void lifecycle)
- [ ] Stock adjustments do not mutate stock before approval
- [ ] Stock count creates actual JE
- [ ] GRN + invoice do not double-count stock
- [ ] Zod validation wired into all mutation entry points
- [ ] Encryption key fails closed in production
- [ ] Financial invariant tests pass (debit = credit on every JE)
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` green
- [ ] `npm run test` all passing

---

## 6. What is NOT in Wave 7 (deferred to P1/P2)

These are real findings but not P0 — they require deeper architectural work:

| ID | Title | Priority | Why deferred |
|---|---|---|---|
| P1-01 | UOM/COGS inconsistency | P1 | Requires cost-layer model redesign |
| P1-02 | Historical cost vs current cost | P1 | Requires inventory layer/FIFO engine |
| P1-03 | Product sales report vs GL COGS | P1 | Depends on P1-02 |
| P1-04 | FIFO not transaction-level | P1 | Major inventory engine rework |
| P1-05 | POS uses current cost | P1 | Depends on P1-02 |
| P1-06 | POS posting duplication | P1 | Requires unified posting engine (Wave 7b covers foundation) |
| P1-07 | Payment allocation over-allocate | P1 | Should be included in Wave 7b posting engine |
| P1-08 | Vendor payment allocation sync | P1 | Should be included in Wave 7b posting engine |
| P1-09 | Vendor balance zeroed on revision | P1 | Fix in `revisePurchaseInvoice` — small standalone fix, can fold into 7a |
| P1-10 | Purchase revision UOM asymmetry | P1 | Small fix, can fold into 7a |
| P1-11 | Purchase revision wrong JE structure | P1 | Requires posting engine |
| P1-12 | Fiscal period locking not global | P1 | Architectural — DB constraint or middleware |
| P1-13 | Multi-currency posting | P1 | Requires FX engine |
| P1-14 | Tax engine not centralized | P1 | Major rework |
| P1-15 | FBR simulation fallback | P1 | Config/guard fix — small, can fold into 7a |
| P1-16 | `isPosted`/status competing models | P1 | State machine consolidation |
| P1-17 | Warehouse stock missing `org_id` | P1 | Schema + migration |
| P1-18 | Stock transfer no UOM conversion | P1 | Small fix, can fold into 7a |
| P1-19 | Serial number lifecycle | P1 | Feature completion |
| P1-20 | Payroll JE missing PF/unpaid leave | P1 | Fix in `hr-payroll.ts` — standalone, can fold into 7a |
| SEC-01 | FK tenant ownership (general) | P0 | Covered by NB-P0-11 |
| SEC-02 | Webhook SSRF | P1 | Security hardening |
| SEC-03 | Webhook secrets in listing | P1 | Small fix |
| SEC-04 | Payment callback idempotency | P1 | Security hardening |
| SEC-05 | `/api/log` unauthenticated | P2 | Low risk |
| SEC-06 | Single-org membership model | P2 | Architecture decision |
