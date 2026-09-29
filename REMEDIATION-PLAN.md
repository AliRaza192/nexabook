# NEXABOOK REMEDIATION PLAN

**Based on:** AUDIT-REPORT.md (2026-09-19)
**Status:** Execution-ready
**Total findings:** 14 CRITICAL, 37 HIGH, 48 MEDIUM, 20+ LOW

---

## PART 0: OPEN DECISIONS (All Resolved)

### Decision 1: Manufacturing Account Structure
- **Chosen:** Option A — Two subTypes: `finished_goods` (Dr) and `raw_materials` (Cr). Variance to `cogs`.
- **COA seeding:** Add `pf_payable`, `eobi_expense`, `pos_cash`, `finished_goods` subTypes.

### Decision 2: POS Float Accounting
- **Chosen:** Option A — `pos_cash` subType. `startShift`: Dr Cash / Cr POS-Cash. `endShift`: Dr Cash / Cr POS-Cash.

### Decision 3: Payroll Employer Contributions
- **Chosen:** Option A — Include employer EOBI (Dr `eobi_expense`, Cr `eobi_payable`) and employer PF.

### Decision 4: Portal Authentication
- **Chosen:** Option A — Keep token-based. Narrow middleware exemptions to exact routes.

---

## PART 1: EXECUTION WAVES

---

### WAVE 1 — Schema + Infrastructure (Foundation)
**Goal:** Add missing constraints, fix rate limiting, fix CSRF. No business logic changes.
**Depends on:** Nothing.

#### W1.1 Schema: Add missing unique constraints

**File:** `src/db/schema.ts`

Add composite unique constraints to 6 tables:

| Table | Constraint Name | Columns |
|-------|----------------|---------|
| `chartOfAccounts` | `uq_coa_org_subtype` | `orgId` + `subType` |
| `employees` | `uq_employee_org_code` | `orgId` + `employeeCode` (remove global `.unique()`) |
| `bankAccounts` | `uq_bank_account_org_number` | `orgId` + `accountNumber` |
| `customers` | `uq_customer_org_name` | `orgId` + `name` |
| `payrollRuns` | `uq_payroll_run_org_month_year` | `orgId` + `month` + `year` |
| `fiscalPeriods` | `uq_fiscal_period_org_dates` | `orgId` + `startDate` + `endDate` |

**COA seeding:** In `accounts.ts:66` and `purchases.ts:66` (seedInitialCOA), change `onConflictDoUpdate` to `onConflictDoNothing` for the COA subType insert.

**New COA subTypes to add in seedInitialCOA:**
- `pf_payable` — "Provident Fund Payable" (liability)
- `eobi_expense` — "EOBI Expense (Employer)" (expense)
- `pos_cash` — "POS Cash" (asset)
- `finished_goods` — "Finished Goods" (asset)

**Verification:** `npm run db:generate && npm run db:push`
**Rollback:** `DROP INDEX IF EXISTS uq_coa_org_subtype;` etc.

#### W1.2 Middleware: Fix rate limiting (userId-based key)

**File:** `src/middleware.ts:40-53`

**Current (broken):** Key is IP, params `30, 60_000` passed but `rate-limit.ts:22` hardcodes `Ratelimit.slidingWindow(60, "1 m")`.

**Fix:**
```typescript
const { userId } = await auth();
const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
const rateLimitKey = userId || `ip:${ip}`;
const result = await rateLimit(rateLimitKey, 60, 60_000);
```

**File:** `src/lib/rate-limit.ts:12,30`

**Fix:** Change `getRatelimit()` to accept params:
```typescript
function getRatelimit(maxRequests = 60, windowMs = 60_000): Ratelimit {
  const windowSeconds = Math.ceil(windowMs / 1000);
  const windowUnit = windowSeconds <= 60 ? "s" : "m";
  const windowAmount = windowSeconds <= 60 ? windowSeconds : Math.ceil(windowSeconds / 60);
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowAmount} ${windowUnit}`),
    analytics: true,
    prefix: "@upstash/ratelimit",
  });
}

export async function rateLimit(identifier: string, maxRequests = 60, windowMs = 60_000): Promise<RateLimitResult> {
  const rl = getRatelimit(maxRequests, windowMs);
  const result = await rl.limit(identifier);
  return { success: result.success, remaining: result.remaining, reset: result.reset };
}
```

#### W1.3 Middleware: Fix CSRF timingSafeEqual

**File:** `src/middleware.ts:59`

**Current:** `cookieToken !== headerToken` (timing attack vulnerable)

**Fix:**
```typescript
import crypto from "crypto";
// ...
if (!cookieToken || !headerToken) {
  return NextResponse.json({ error: "CSRF token missing" }, { status: 403 });
}
const a = Buffer.from(cookieToken);
const b = Buffer.from(headerToken);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}
```

#### W1.4 CSRF cookie security

**File:** `src/app/api/csrf/route.ts:4-6`

**Fix:**
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCsrfToken } from "@/lib/csrf";

export async function GET() {
  const token = await getCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set("csrf-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });
  return NextResponse.json({ token });
}
```

#### W1.5 Narrow route exemptions

**File:** `src/middleware.ts:5-29`

**Current (too broad):**
```typescript
"/portal(.*)",           // catches /portal/admin
"/vendor-portal(.*)",    // catches /vendor-portal/admin
"/api/webhooks(.*)",     // catches /api/webhooks-extra
"/api/payments(.*)",     // catches /api/payments-extra
"/api/csrf",             // should NOT be public
```

**Fix:**
```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/portal/[token]",
  "/vendor-portal/[token]",
  "/api/webhooks/[id]",
  "/api/portal-pay",
  "/api/portal-statement",
  "/api/payments/callback",
  "/api/payments/initiate",
  "/api/cron/(.*)",
  "/api/stripe/webhook",
]);

const csrfExemptRoutes = createRouteMatcher([
  "/api/webhooks/[id]",
  "/api/portal-pay",
  "/api/portal-statement",
  "/api/payments/callback",
  "/api/payments/initiate",
  "/api/cron/(.*)",
  "/api/chat",
  "/api/mobile/(.*)",
  "/api/stripe/webhook",
]);
```

**Blast radius:** `csrf-client.ts` must call `/api/csrf` to get token.
**Verification:** 61 requests in 60s -> 429. CSRF timing attack -> fails.
**Rollback:** Revert all three files.

---

### WAVE 2 — Cross-Tenant Security Fixes
**Goal:** Close all IDOR/cross-tenant breach vectors.
**Depends on:** Wave 1.

#### W2.1 leaves.ts: Add orgId to UPDATE queries

**File:** `src/lib/actions/leaves.ts:279,327`

**Line 279 (approveLeaveApplication):**
```typescript
// BEFORE:
.where(eq(leaveApplications.id, applicationId))
// AFTER:
.where(and(eq(leaveApplications.id, applicationId), eq(leaveApplications.orgId, orgId)))
```

**Line 327 (rejectLeaveApplication):** Same change.

**Verification:** Create leave in org A, approve from org B -> should fail.
**Rollback:** Remove `and()` wrapper.

#### W2.2 invoice-ocr.ts: Remove orgId parameter

**File:** `src/lib/actions/invoice-ocr.ts:190-194`

**Current:** `saveExtractedInvoice(extractedData, vendorId, orgId)` — orgId is caller-provided (cross-tenant injection).

**Fix:**
```typescript
export async function saveExtractedInvoice(
  extractedData: ExtractedInvoiceData,
  vendorId: string,
  // orgId REMOVED — obtained from session
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { success: false, error: "No organization found" };
  // ... rest unchanged
```

**Callers to update:**
- `src/app/api/invoice-ocr/route.ts` — remove third argument
- `src/components/invoice-ocr/invoice-ocr-upload.tsx` — verify and update

#### W2.3 consolidation.ts: Scope getAvailableOrgs

**File:** `src/lib/actions/consolidation.ts:113-131`

**Current:** Returns ALL orgs (cross-tenant data leak).

**Fix:** Join with `profiles` to only return orgs where user has admin/manager:
```typescript
const allOrgs = await db
  .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
  .from(organizations)
  .innerJoin(profiles, and(
    eq(profiles.orgId, organizations.id),
    eq(profiles.userId, userId),
    or(eq(profiles.role, "admin"), eq(profiles.role, "manager")),
  ))
  .where(and(
    sql`${organizations.id} != ${orgId}`,
    sql`${organizations.parentOrgId} IS NULL`,
  ))
  .orderBy(organizations.name);
```

#### W2.4 accounts.ts: Add orgId to getLedgerReport

**File:** `src/lib/actions/accounts.ts:815`

**Current:** `where(eq(chartOfAccounts.id, accountId))` — no orgId filter.

**Fix:**
```typescript
.where(and(eq(chartOfAccounts.id, accountId), eq(chartOfAccounts.orgId, orgId)))
```

#### W2.5 manufacturing.ts: Add orgId to final update

**File:** `src/lib/actions/manufacturing.ts:655`

**Current:** `where(eq(jobOrders.id, jobOrderId))`

**Fix:**
```typescript
.where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)))
```

---

### WAVE 3 — Critical Financial Integrity Fixes
**Goal:** Fix broken JEs, add server-side validation, fix missing JEs.
**Depends on:** Waves 1-2.

#### W3.1 sales.ts: Server-side recomputation of invoice totals

**File:** `src/lib/actions/sales.ts:805-822`

After inserting line items (line 821), add recomputation before audit log:
```typescript
// Recompute all totals from line items (server-side authoritative)
let computedGross = 0;
let computedTax = 0;
for (const item of data.items) {
  const qty = parseFloat(item.quantity || "1");
  const price = parseFloat(item.unitPrice || "0");
  const discPct = parseFloat(item.discountPercentage || "0");
  const taxRate = parseFloat(item.taxRate || "0");
  const lineSubtotal = qty * price;
  const discAmt = lineSubtotal * discPct / 100;
  const taxable = lineSubtotal - discAmt;
  const taxAmt = taxable * taxRate / 100;
  computedGross += lineSubtotal;
  computedTax += taxAmt;
}
const computedDiscount = parseFloat(data.discountAmount || "0");
const computedShipping = parseFloat(data.shippingCharges || "0");
const computedRoundOff = parseFloat(data.roundOff || "0");
const computedNet = computedGross - computedDiscount + computedTax + computedShipping + computedRoundOff;
const receivedAmt = parseFloat(receivedAmount || "0");
const computedBalance = computedNet - receivedAmt;

await tx.update(invoices).set({
  grossAmount: computedGross.toFixed(2),
  taxAmount: computedTax.toFixed(2),
  netAmount: computedNet.toFixed(2),
  balanceAmount: computedBalance.toFixed(2),
}).where(eq(invoices.id, created.id));
```

#### W3.2 api/portal-pay/route.ts: Amount validation

**File:** `src/app/api/portal-pay/route.ts:28-38`

After invoice lookup, add:
```typescript
if (invoiceId) {
  const [inv] = await db
    .select({ id: invoices.id, status: invoices.status, balanceAmount: invoices.balanceAmount })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.customerId, customer.id)))
    .limit(1);

  if (!inv || inv.status === "paid" || inv.status === "cancelled") {
    return NextResponse.json({ success: false, error: "Invoice is not payable" }, { status: 400 });
  }

  // ADD: Amount validation
  const invoiceBalance = parseFloat(inv.balanceAmount || "0");
  const requestedAmount = parseFloat(amount.toString());
  if (requestedAmount > invoiceBalance || requestedAmount <= 0) {
    return NextResponse.json(
      { success: false, error: `Invalid amount. Outstanding balance: Rs. ${invoiceBalance.toFixed(2)}` },
      { status: 400 }
    );
  }
}

// ADD: For non-invoice payments, require positive amount
if (!invoiceId && parseFloat(amount.toString()) <= 0) {
  return NextResponse.json({ success: false, error: "Amount must be greater than zero" }, { status: 400 });
}
```

#### W3.3 api/payments/initiate/route.ts: Amount validation

**File:** `src/app/api/payments/initiate/route.ts:17-24`

After orgId check, add:
```typescript
if (invoiceId) {
  const { invoices: invoicesTable } = await import("@/db/schema");
  const [inv] = await db
    .select({ balanceAmount: invoicesTable.balanceAmount })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.orgId, orgId)))
    .limit(1);
  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const invoiceBalance = parseFloat(inv.balanceAmount || "0");
  const requestedAmount = parseFloat(amount.toString());
  if (requestedAmount > invoiceBalance || requestedAmount <= 0) {
    return NextResponse.json({ error: "Amount exceeds outstanding balance" }, { status: 400 });
  }
}
```

#### W3.4 hr-payroll.ts: Fix unbalanced payroll JE

**File:** `src/lib/actions/hr-payroll.ts:761-797`

**Current JE (always unbalanced):**
- Dr `salary_expense` = totalGross
- Cr `salaries_payable` = totalNet
- Cr `eobi_payable` = totalEobi
- Cr `income_tax_payable` = totalIncomeTax
- **Missing:** PF payable line (credits != debits)

**Fix:** Add PF payable line after income tax block (line 797):
```typescript
// ADD: Provident Fund Payable
if (totalProvidentFund > 0) {
  const pfPayable = await resolveAccount(tx, orgId, "pf_payable");
  lines.push({
    accountId: pfPayable.id,
    description: "Provident Fund Payable",
    debit: "0",
    credit: totalProvidentFund.toFixed(2),
  });
}

// ADD: Employer EOBI Expense (Option A - legally required)
const employerEobi = totalEobi; // Employer pays same 1% per employee
if (employerEobi > 0) {
  const eobiExpense = await resolveAccount(tx, orgId, "eobi_expense");
  lines.push({
    accountId: eobiExpense.id,
    description: "EOBI Expense (Employer Share)",
    debit: employerEobi.toFixed(2),
    credit: "0",
  });
  // Update existing eobi_payable line to include employer portion
  const eobiLine = lines.find(l => l.description.includes("EOBI Payable"));
  if (eobiLine) {
    eobiLine.credit = (totalEobi + employerEobi).toFixed(2);
  }
}
```

#### W3.5 hr-payroll.ts: Add JE to markPayslipPaid

**File:** `src/lib/actions/hr-payroll.ts:904-926`

**Current:** Updates payslip status only — no financial JE.

**Fix:** Wrap in transaction with JE creation:
```typescript
export async function markPayslipPaid(id: string, paymentMethod: string) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [payslip] = await db.select().from(payslips)
      .where(and(eq(payslips.id, id), eq(payslips.orgId, orgId))).limit(1);
    if (!payslip) return { success: false, error: "Payslip not found" };
    if (payslip.isPaid) return { success: false, error: "Already paid" };

    await db.transaction(async (tx) => {
      await tx.update(payslips).set({
        isPaid: true, paymentDate: new Date(), paymentMethod, updatedAt: new Date(),
      }).where(and(eq(payslips.id, id), eq(payslips.orgId, orgId)));

      const salariesPayable = await resolveAccount(tx, orgId, "salaries_payable");
      const cashAcc = await resolveAccount(tx, orgId, "cash");

      await postTransaction(tx, {
        orgId,
        description: `Payroll Payment - ${payslip.employeeName}`,
        date: new Date(),
        referenceType: "payroll_payment",
        referenceId: id,
        sourceType: "payroll",
        lines: [
          { accountId: salariesPayable.id, description: "Dr Salaries Payable", debit: payslip.netSalary, credit: "0" },
          { accountId: cashAcc.id, description: "Cr Cash", debit: "0", credit: payslip.netSalary },
        ],
      });

      await tx.insert(auditLogs).values({
        orgId, userId: (await auth()).userId || "system",
        action: "PAYSLIP_PAID", entityType: "payslip", entityId: id,
        changes: JSON.stringify({ netSalary: payslip.netSalary, paymentMethod }),
      });
    });

    revalidatePath('/hr-payroll/reports');
    return { success: true, message: "Payslip marked as paid" };
  } catch (error) { /* ... */ }
}
```

#### W3.6 pos.ts: Fix shift opening/closing JEs

**File:** `src/lib/actions/pos.ts:122-148` (startShift)

**Current:** Dr `cash` / Cr `capital` (equity inflation).

**Fix:**
```typescript
// Line 124: change capital -> pos_cash
const posCashAcc = await resolveAccount(tx, orgId, "pos_cash");

// Lines 134-147: update JE lines
lines: [
  { accountId: cashAcc.id, description: "Dr Cash (Float Transfer)", debit: openingAmount.toFixed(2), credit: "0" },
  { accountId: posCashAcc.id, description: "Cr POS Cash (Opening Float)", debit: "0", credit: openingAmount.toFixed(2) },
]
```

**File:** `src/lib/actions/pos.ts:204-221` (endShift)

**Current:** No-op JE (Dr 0 / Cr 0).

**Fix:**
```typescript
const posCashAcc = await resolveAccount(tx, orgId, "pos_cash");
const mainCashAcc = await resolveAccount(tx, orgId, "cash");

const lines = [
  { accountId: mainCashAcc.id, description: "Dr Cash (Float Return)", debit: actualCash.toFixed(2), credit: "0" },
  { accountId: posCashAcc.id, description: "Cr POS Cash (Float)", debit: "0", credit: parseFloat(openShift.openingAmount).toFixed(2) },
];
if (Math.abs(variance) > 0.01) {
  if (variance > 0) {
    lines.push({ accountId: mainCashAcc.id, description: "Cash Overage", debit: Math.abs(variance).toFixed(2), credit: "0" });
  } else {
    lines.push({ accountId: mainCashAcc.id, description: "Cash Shortage", debit: "0", credit: Math.abs(variance).toFixed(2) });
  }
}
```

#### W3.7 manufacturing.ts: Fix wash-entry JEs

**File:** `src/lib/actions/manufacturing.ts:597-644` (completeJobOrder)

**Current:** All lines use `invAcc.id` (same account for Dr and Cr = wash entry).

**Fix (Option A):**
```typescript
const fgAcc = await resolveAccount(tx, orgId, "finished_goods");
const rmAcc = await resolveAccount(tx, orgId, "raw_materials");
const cogsAcc = await resolveAccount(tx, orgId, "cogs");

const lines = [
  { accountId: fgAcc.id, description: `Debit: Finished Goods - ${finishedGood.name}`, debit: totalValue.toFixed(2), credit: "0" },
];

for (const row of componentIdRows) {
  const comp = componentMap.get(row.componentId);
  const qty = parseFloat(row.requiredQty);
  const compCost = parseFloat(comp?.costPrice || "0");
  const lineValue = qty * compCost;
  lines.push({
    accountId: rmAcc.id,
    description: `Credit: Raw Material - ${comp?.name}`,
    debit: "0",
    credit: lineValue.toFixed(2),
  });
}

// Variance goes to COGS
const totalRawMaterialCost = lines.filter(l => l.credit !== "0").reduce((s, l) => s + parseFloat(l.credit), 0);
const variance = totalValue - totalRawMaterialCost;
if (Math.abs(variance) > 0.01) {
  if (variance > 0) {
    lines.push({ accountId: cogsAcc.id, description: "Manufacturing Variance", debit: variance.toFixed(2), credit: "0" });
  } else {
    lines.push({ accountId: cogsAcc.id, description: "Manufacturing Variance", debit: "0", credit: Math.abs(variance).toFixed(2) });
  }
}
```

**Line 655:** Add `eq(jobOrders.orgId, orgId)` (covered in W2.5).

**disassembleFinishedGood (lines 791-823):** Same pattern — Dr `raw_materials`, Cr `finished_goods`.

#### W3.8 sales.ts: Fix approveSalesReturn warehouse/batch stock

**File:** `src/lib/actions/sales.ts:3015-3036`

After the product stock update loop, add warehouse and batch updates:
```typescript
// ADD: Update warehouse stock
if (salesReturn.invoiceId) {
  const [originalInvoice] = await tx.select({ warehouseId: invoices.warehouseId })
    .from(invoices).where(eq(invoices.id, salesReturn.invoiceId)).limit(1);

  if (originalInvoice?.warehouseId) {
    for (const item of items) {
      if (item.productId) {
        await updateWarehouseStock(tx, orgId, originalInvoice.warehouseId, item.productId, item.quantity, "in");
      }
    }
  }
}

// ADD: Update batch stock
for (const item of items) {
  if (item.batchId) {
    await updateBatchStock(tx, item.batchId, item.quantity);
  }
}
```

Also batch-fetch products instead of N+1 (fetch all before loop with `inArray`).

#### W3.9 sales.ts: Atomic deletion sequences

**File:** `src/lib/actions/sales.ts:1389-1394` (deleteInvoice draft path)

**Current:** Two separate DELETE statements (non-atomic).

**Fix:**
```typescript
await db.transaction(async (tx) => {
  await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  await tx.delete(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
});
```

**Line 2255-2260 (deleteQuotation):** Same pattern.

**Line 2722-2729 (deleteRecurringInvoice):** Same pattern.

#### W3.10 consolidation.ts: Fix posted-only filter + Math.abs

**File:** `src/lib/actions/consolidation.ts`

**Lines 173, 260 (P&L + Balance Sheet queries):** Add `eq(journalEntries.status, "posted")` to WHERE clause.

**Lines 276-277 (balance sheet Math.abs):** Replace with type-aware balance:
```typescript
const balance = parseFloat(row.debit || "0") - parseFloat(row.credit || "0");
// Assets: debit-normal (positive = normal)
// Liabilities/Equity: credit-normal (negative = normal, negate for display)
const displayBalance = row.accountType === "asset" ? balance : -balance;
```

---

### WAVE 4 — RBAC (30+ functions)
**Goal:** Add `requireRole()` to all financial mutations.
**Depends on:** Waves 1-3.

#### Functions needing `await requireRole(["admin", "accountant"])`:

**sales.ts:**
- `createInvoice` (line 720)
- `createSaleOrder` (line 1636)
- `approveSaleOrder` (line 1731)
- `allocatePayment`
- `createSalesReturn`
- `duplicateInvoice`
- `createRecurringInvoice`

**banking.ts:**
- `addBankDeposit`
- `addFundsTransfer`
- `addMiscContact`

**bank-reconciliation.ts (13 functions, 0 have requireRole):**
- `finalizeReconciliation` (line 312)
- `saveMatchResult` (line 272)
- `undoReconciliation` (line 371)
- `deleteBankStatement` (line 295)
- `createBankStatement` (line 61)
- `parseBankStatementCSV` (line 126)
- `autoMatchTransactions` (line 178)
- `smartMatchTransactions` (line 484)
- `saveReconciliationPattern` (line 707)
- (Read-only functions can skip: `getBankStatements`, `getReconciliationHistory`, `getSmartSuggestions`, `getLearnedPatterns`)

**bank-feeds.ts (5 functions, 0 have requireRole):**
- `createBankConnection` (line 89)
- `deleteBankConnection` (line 128)
- `syncBankTransactions` (line 146)
- (Read-only can skip: `getBankConnections`, `syncAllBankConnections`)

**leaves.ts:**
- `approveLeaveApplication` (line 255)
- `rejectLeaveApplication` (line 303)
- `createLeaveType`
- `createLeaveApplication`

**inventory-depth.ts:**
- `addStockAdjustment`
- `approveStockAdjustment`

**stock-count.ts:**
- `completeStockCount`

**exchange-rates.ts:**
- `createExchangeRate`

**consolidation.ts:**
- `linkChildOrg`
- `unlinkChildOrg`

**crm.ts:**
- `createLead`
- `updateLead`
- `createTicket`

**cost-centers.ts:**
- `createCostCenter` (line 48)
- `updateCostCenter` (line 71)

**budget.ts:**
- `setBudget`

**tax-returns.ts:**
- `submitTaxReturn` (line 131)
- `deleteTaxReturn` (line 215)

**projects.ts:**
- `deleteProject`

**adjustments.ts:**
- `approveMiscContactSettlement` (line 435)

---

### WAVE 5 — JE Routing + Financial Module Fixes
**Goal:** Route hand-rolled JEs through `postTransaction()`.
**Depends on:** Waves 1-3.

#### W5.1 purchases.ts + accounts.ts: Route through postTransaction

**Functions to migrate (4 in each file, 8 total):**

| Function | purchases.ts line | accounts.ts line |
|----------|-------------------|------------------|
| `createJournalEntry` | 341-381 | 314-354 |
| `postOpeningBalance` | 496-540 | 469-510 |
| `bulkImportOpeningBalances` | 615-660 | 612-650 |
| `createVoucher` | 1282-1326 | 1275-1319 |

**Pattern for each:** Replace raw `tx.insert(journalEntries)` + `tx.insert(journalEntryLines)` + manual `generateJournalEntryNumber` with:
```typescript
const { journalEntryId, entryNumber } = await postTransaction(tx, {
  orgId,
  description: data.description,
  date: new Date(data.date),
  referenceType: "manual",
  referenceId: entryId,
  sourceType: "journal_entry",
  lines: data.lines.map(l => ({
    accountId: l.accountId,
    description: l.description,
    debit: l.debit || "0",
    credit: l.credit || "0",
  })),
});
```

**Also:** Add `import { postTransaction, resolveAccount } from "../accounting/posting-engine";` to both files.

**DRY fix:** Extract `getTaxSummary` into `src/lib/accounting/tax-summary.ts` and import from both files.

#### W5.2 banking.ts: Fix bank-to-bank transfer JE

**File:** `src/lib/actions/banking.ts:595-608`

**Current:** Lines 606-607 both use `bankAcc.id` (same account Dr and Cr = wash entry).

**Fix:** Add `coaAccountId` column to `bankAccounts` table, or resolve per-account:
```typescript
const [fromAcct] = await tx.select({ coaAccountId: bankAccounts.coaAccountId })
  .from(bankAccounts).where(eq(bankAccounts.id, transfer.fromBankAccountId));
const [toAcct] = await tx.select({ coaAccountId: bankAccounts.coaAccountId })
  .from(bankAccounts).where(eq(bankAccounts.id, transfer.toBankAccountId));

await postTransaction(tx, {
  orgId,
  description: `Funds transfer ${transfer.transferNumber}`,
  date: transfer.transferDate,
  referenceType: "funds_transfer",
  referenceId: transfer.id,
  sourceType: "funds_transfer",
  lines: [
    { accountId: toAcct.coaAccountId, description: "Dr Destination Bank", debit: transfer.amount, credit: "0" },
    { accountId: fromAcct.coaAccountId, description: "Cr Source Bank", debit: "0", credit: transfer.amount },
  ],
});
```

**Migration:** `ALTER TABLE bank_accounts ADD COLUMN coa_account_id UUID REFERENCES chart_of_accounts(id);`

#### W5.3 adjustments.ts: Wrap in transaction

**File:** `src/lib/actions/adjustments.ts:451-473`

**Current:** Bank balance update and approval status are two separate DB operations (non-atomic).

**Fix:**
```typescript
await db.transaction(async (tx) => {
  if (settlement.bankAccountId) {
    await tx.update(bankAccounts).set({
      currentBalance: sql`${bankAccounts.currentBalance}::numeric - ${settlement.settledAmount}::numeric`
    }).where(and(eq(bankAccounts.id, settlement.bankAccountId), eq(bankAccounts.orgId, orgId)));
  }
  await tx.update(miscContactSettlements).set({
    approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date(),
  }).where(eq(miscContactSettlements.id, settlementId));
});
```

#### W5.4 inventory.ts: Add opening stock JE

**File:** `src/lib/actions/inventory.ts:248-253`

Replace TODO comment with:
```typescript
if (openingQty > 0 && parseFloat(data.costPrice || "0") > 0) {
  const invAsset = await resolveAccount(tx, orgId, "inventory");
  const obeAcc = await resolveAccount(tx, orgId, "opening_balance_equity");
  const totalValue = openingQty * parseFloat(data.costPrice || "0");

  await postTransaction(tx, {
    orgId,
    description: `Opening Stock - ${data.name} (${data.sku})`,
    date: new Date(),
    referenceType: "product_opening_stock",
    referenceId: created.id,
    sourceType: "inventory",
    lines: [
      { accountId: invAsset.id, description: `Debit - Inventory Asset (${data.name})`, debit: totalValue.toFixed(2), credit: "0" },
      { accountId: obeAcc.id, description: "Credit - Opening Balance Equity", debit: "0", credit: totalValue.toFixed(2) },
    ],
  });
}
```

---

### WAVE 6 — Remaining Medium Fixes
**Goal:** N+1 queries, divide-by-zero, float arithmetic, dead code, DRY, POS reports.
**Depends on:** Waves 1-5.

#### W6.1 N+1 Query Fixes (13 instances)

| File | Function | Line | Fix |
|------|----------|------|-----|
| `sales.ts` | `createCustomerPayment` | 3285 | Batch-fetch invoices with `inArray` before loop |
| `sales.ts` | `approveSalesReturn` | 3017-3036 | Batch-fetch products with `inArray` before loop |
| `pos.ts` | `processPosSale` | 375 | Batch-fetch products before loop |
| `manufacturing.ts` | `explodeBOM` | 870-888 | Cache sub-BOM lookups in a Map |
| `accounts.ts` | `createJournalEntry` | 280-298 | Batch-validate account IDs with `inArray` |
| `accounts.ts` | `bulkImportOpeningBalances` | 550 | Batch-resolve account codes with `inArray` |
| `budget.ts` | `getBudgetVsActual` | 103 | Batch-fetch accounts before loop |
| `leaves.ts` | `getLeaveBalance` | 373 | Use SQL `GROUP BY` instead of per-type loop |
| `inventory-depth.ts` | `runStockValuation` | 460 | Batch products |
| `stock-count.ts` | `createStockCount` | 152 | Batch-fetch products |
| `barcodes.ts` | `getBarcodePrintData` | 43 | Batch-fetch serials |

#### W6.2 Divide-by-zero guards

**File:** `src/lib/actions/manufacturing.ts:465`

**Current:** `const multiplier = data.quantityToProduce / bom.quantity;`

**Fix:**
```typescript
if (bom.quantity <= 0) return { success: false, error: "BOM quantity must be greater than 0" };
const multiplier = data.quantityToProduce / bom.quantity;
```

**Line 762 (disassembleFinishedGood):** Same guard.

#### W6.3 Float arithmetic

Create `src/lib/utils/decimal.ts`:
```typescript
export function addDecimal(a: string, b: string): string {
  return (parseFloat(a) + parseFloat(b)).toFixed(2);
}
export function subDecimal(a: string, b: string): string {
  return (parseFloat(a) - parseFloat(b)).toFixed(2);
}
export function mulDecimal(a: string, b: string): string {
  return (parseFloat(a) * parseFloat(b)).toFixed(2);
}
```

Use in ledger running balances, payroll calculations, POS loyalty points.

#### W6.4 Dead code removal

- `sales.ts:1458` — Delete `createInvoiceJournalEntry` (deprecated, unused)
- `accounts.ts:459-466` — Delete unreachable auto-balance block
- `manufacturing.ts:602-624` — Remove dead `totalRawMaterialCost` accumulation

#### W6.5 POS report fixes

**File:** `src/lib/actions/pos.ts:805-808`

**Current:** All paid invoices classified as cash.

**Fix:** Check payment method from invoice:
```typescript
const [paymentInfo] = await tx.select({ paymentMethod: invoices.paymentMethod })
  .from(invoices).where(eq(invoices.id, invoice.id)).limit(1);
const method = paymentInfo?.paymentMethod || "cash";
if (method === "cash") { cashSales += ...; cashTransactions++; }
else { cardSales += ...; cardTransactions++; }
```

**Line 737-745:** Add filter by cashier's userId.

**Line 863-897:** Add guard:
```typescript
if (openShift.status === "closed") {
  return { success: false, error: "Shift already closed" };
}
```

#### W6.6 Other medium fixes

- `api/webhooks/route.ts:75` — Don't return `secret` in response after creation
- `invoice-ocr.ts:81` — Save to non-public directory (e.g., `uploads/invoices/` with API route for access)
- `api/payments/callback/route.ts:19` — Validate `returnOrigin` doesn't start with `//`
- `cost-centers.ts:120`, `budget.ts:48` — Use fiscal year from org settings instead of hardcoded calendar year
- `tax-returns.ts:58,78` — Normalize status casing

---

### WAVE 7 — Integration Tests
**Goal:** Close the mocked-DB blind spot with integration tests.
**Depends on:** All previous waves.

Create integration tests using the PGlite pattern from `posting-engine.test.ts`:

**New test file:** `src/__tests__/financial-integrity.test.ts`

Test cases:
1. Invoice creation recomputes totals — submit with wrong grossAmount, verify stored value matches line items
2. Invoice approval creates balanced JE — approve invoice, verify debits = credits
3. Payroll JE balances — run payroll, verify JE balances with PF/EOBI
4. markPayslipPaid creates JE — verify JE exists with correct amounts
5. POS shift open/close JEs — verify float transfer JE, not equity inflation
6. leave approve/reject scoped to orgId — verify UPDATE includes orgId
7. Portal payment amount validated — verify amount <= balanceAmount
8. Sales return updates warehouse stock — verify warehouse_stock updated

**New test file:** `src/__tests__/security-integration.test.ts`

Test cases:
1. orgId isolation on all mutation functions — call from org A with org B data
2. requireRole enforcement — call financial function without proper role
3. CSRF timing-safe comparison — verify timing attack doesn't work

---

## DEFINITION OF DONE CHECKLIST

### CRITICAL (14)
- [ ] Client-supplied invoice totals recomputed server-side (W3.1)
- [ ] Portal payment amount validated against balance (W3.2)
- [ ] Payment initiate amount validated against invoice (W3.3)
- [ ] Leave approve/reject UPDATE includes orgId (W2.1)
- [ ] Invoice OCR accepts no orgId parameter (W2.2)
- [ ] Rate limiting keyed on userId, not IP (W1.2)
- [ ] Rate limit params actually used (W1.2)
- [ ] Portal routes narrowed in middleware (W1.5)
- [ ] Payroll JE balances with PF/EOBI/unpaid-leave lines (W3.4)
- [ ] markPayslipPaid creates JE (W3.5)
- [ ] POS shift opening credits pos_cash, not equity (W3.6)
- [ ] POS shift closing creates real JE (W3.6)
- [ ] Manufacturing JEs use separate accounts (W3.7)
- [ ] Sales return updates warehouse/batch stock (W3.8)

### HIGH (37)
- [ ] All 8 hand-rolled JE functions routed through postTransaction (W5.1)
- [ ] CSRF comparison timing-safe (W1.3)
- [ ] CSRF cookie HttpOnly/Secure/SameSite (W1.4)
- [ ] Route exemptions narrowed (W1.5)
- [ ] 30+ functions have requireRole (W4)
- [ ] Consolidated P&L filters posted-only (W3.10)
- [ ] Consolidated balance sheet filters posted-only (W3.10)
- [ ] Balance sheet Math.abs removed (W3.10)
- [ ] getAvailableOrgs scoped to user's admin access (W2.3)
- [ ] getLedgerReport filters by orgId (W2.4)
- [ ] completeJobOrder final update includes orgId (W2.5)
- [ ] deleteInvoice atomic (W3.9)
- [ ] deleteQuotation atomic (W3.9)
- [ ] deleteRecurringInvoice atomic (W3.9)
- [ ] Bank-to-bank transfer uses separate COA accounts (W5.2)
- [ ] Float arithmetic mitigated in critical paths (W6.3)
- [ ] Misc contact settlement wrapped in transaction (W5.3)
- [ ] Opening stock creates JE (W5.4)
- [ ] Bank reconciliation functions have requireRole (W4)
- [ ] Cost center delete checks JE references (W6.6)
- [ ] Tax return generation race condition fixed (W6.6)
- [ ] Payment reminders deduplicated (W6.6)
- [ ] POS report classifies by payment method (W6.5)
- [ ] POS report filters by cashier (W6.5)
- [ ] POS Z-report guards against double-close (W6.5)
- [ ] Webhook secret not returned in response (W6.6)
- [ ] Invoice files not in public dir (W6.6)
- [ ] Open redirect fixed (W6.6)
- [ ] Tax return status casing normalized (W6.6)

### MEDIUM (remaining)
- [ ] 5 custom doc generators replaced (W5.1)
- [ ] DRY violations resolved (W5.1)
- [ ] Missing role checks on CRM/budgets/etc (W4)
- [ ] as any casts replaced (W6.6)
- [ ] 13 N+1 queries batched (W6.1)
- [ ] Divide-by-zero guards (W6.2)

### Tests
- [ ] Integration tests for financial integrity (W7)
- [ ] Integration tests for security/intent (W7)
- [ ] posting-engine.test.ts pattern adopted (W7)

---

## EXECUTION ORDER

1. **Wave 1** (Schema + Infrastructure) — Foundation, no business logic changes
2. **Wave 2** (Cross-Tenant Security) — 5 files, small targeted edits
3. **Wave 3** (Financial Integrity) — 10 fixes, most critical business logic
4. **Wave 4** (RBAC) — Add requireRole to 30+ functions
5. **Wave 5** (JE Routing) — Route 8 hand-rolled functions through postTransaction
6. **Wave 6** (Medium Fixes) — N+1, divide-by-zero, float, dead code, DRY, POS
7. **Wave 7** (Tests) — Integration tests for financial integrity + security

After each wave: `npm run lint && npx tsc --noEmit && npm run test`

---

*Plan generated from AUDIT-REPORT.md on 2026-09-19*
*Decisions locked: Manufacturing (Option A), POS (Option A), Payroll (Option A), Portal (Option A)*
