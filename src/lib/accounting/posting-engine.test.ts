import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/__tests__/test-db";
import { journalEntries, journalEntryLines } from "@/db/schema";
import { eq } from "drizzle-orm";

vi.setConfig({ hookTimeout: 60000 });

let testDb: Awaited<ReturnType<typeof createTestDb>>;

const dbRef: { current: any } = { current: null as any };
vi.mock("@/db", () => ({ get db() { return dbRef.current; } }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_123" }),
  currentUser: vi.fn(),
}));

vi.mock("@/lib/fbr-api", () => ({ submitInvoiceToFBR: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/lib/actions/inventory", () => ({
  convertToBaseUnit: vi.fn(),
  updateWarehouseStock: vi.fn(),
  updateBatchStock: vi.fn(),
}));

vi.mock("@/lib/actions/shared", () => ({
  getCurrentOrgId: vi.fn(),
  requireRole: vi.fn().mockResolvedValue(undefined),
  generateDocumentNumber: vi.fn(),
  generateJournalEntryNumber: vi.fn(),
}));

const { checkPeriodLockedMock } = vi.hoisted(() => {
  return { checkPeriodLockedMock: vi.fn().mockResolvedValue(false) };
});
vi.mock("@/lib/actions/fiscal-periods", () => ({
  checkPeriodLocked: checkPeriodLockedMock,
}));

beforeEach(async () => {
  vi.resetModules();
  testDb = await createTestDb();
  dbRef.current = testDb.db;
  checkPeriodLockedMock.mockResolvedValue(false);

  const shared = await import("@/lib/actions/shared");
  vi.mocked(shared.getCurrentOrgId).mockResolvedValue(testDb.ids.orgId);
  vi.mocked(shared.generateDocumentNumber).mockImplementation(async () => `DOC-${Date.now()}`);
  vi.mocked(shared.generateJournalEntryNumber).mockImplementation(async () => `JE-${Date.now()}`);
});

afterEach(async () => {
  await testDb?.close();
});

describe("Posting Engine — Parity with approveInvoice (plain invoice, receivedAmount=0)", () => {
  it("postTransaction produces identical journal entry lines to approveInvoice", async () => {
    const { db, ids } = testDb;
    const { orgId, arAccId, revAccId, cogsAccId, invAccId, custId, prodId } = ids;

    // ── Invoice A: run through legacy approveInvoice ──────────────────
    const invAId = "10000000-0000-0000-0000-000000000001";
    const itemAId = "20000000-0000-0000-0000-000000000001";
    const issueDate = new Date("2026-09-01");

    await db.execute(
      `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount, tax_amount)
       VALUES ('${invAId}','${orgId}','${custId}','INV-PARITY-A','pending','${issueDate.toISOString()}','1000.00','1000.00','0.00','0.00','0.00','0.00','1000.00','0.00')`,
    );
    await db.execute(
      `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, tax_rate, line_total)
       VALUES ('${itemAId}','${orgId}','${invAId}','${prodId}','Widget sale','10','100.00','0','1000.00')`,
    );

    const { approveInvoice } = await import("@/lib/actions/sales");
    const legacyResult = await approveInvoice(invAId);
    expect(legacyResult.success).toBe(true);

    // Read the JE created by legacy approveInvoice
    const [legacyJe] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.referenceId, invAId))
      .limit(1);
    expect(legacyJe).toBeDefined();
    expect(legacyJe.status).toBe("posted");

    const legacyLines = await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, legacyJe.id));

    // Sort by accountId for deterministic comparison
    const legacySorted = [...legacyLines].sort((a, b) => a.accountId.localeCompare(b.accountId));

    // ── Invoice B: run through new posting engine ─────────────────────
    const invBId = "10000000-0000-0000-0000-000000000002";
    const itemBId = "20000000-0000-0000-0000-000000000002";

    await db.execute(
      `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount, tax_amount)
       VALUES ('${invBId}','${orgId}','${custId}','INV-PARITY-B','pending','${issueDate.toISOString()}','1000.00','1000.00','0.00','0.00','0.00','0.00','1000.00','0.00')`,
    );
    await db.execute(
      `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, tax_rate, line_total)
       VALUES ('${itemBId}','${orgId}','${invBId}','${prodId}','Widget sale','10','100.00','0','1000.00')`,
    );

    // totalCOGS = 10 * costPrice(60) = 600 — same as approveInvoice computes
    const totalCOGS = "600.00";

    const { postTransaction } = await import("@/lib/accounting/posting-engine");
    const engineResult = await postTransaction(db, {
      orgId,
      description: `Invoice INV-PARITY-B approval`,
      date: issueDate,
      referenceType: "invoice",
      referenceId: invBId,
      sourceType: "invoice",
      lines: [
        {
          accountId: arAccId,
          description: `AR Invoice INV-PARITY-B`,
          debit: "1000.00",
          credit: "0.00",
        },
        {
          accountId: revAccId,
          description: `Revenue Invoice INV-PARITY-B`,
          debit: "0.00",
          credit: "1000.00",
        },
        {
          accountId: cogsAccId,
          description: `COGS Invoice INV-PARITY-B`,
          debit: totalCOGS,
          credit: "0.00",
        },
        {
          accountId: invAccId,
          description: `Inventory Credit Invoice INV-PARITY-B`,
          debit: "0.00",
          credit: totalCOGS,
        },
      ],
    });

    expect(engineResult.journalEntryId).toBeDefined();

    // Read the JE created by the posting engine
    const [engineJe] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, engineResult.journalEntryId))
      .limit(1);
    expect(engineJe).toBeDefined();
    expect(engineJe.status).toBe("posted");

    const engineLines = await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, engineJe.id));

    const engineSorted = [...engineLines].sort((a, b) => a.accountId.localeCompare(b.accountId));

    // ── Parity assertion: same number of lines ────────────────────────
    expect(engineSorted.length).toBe(legacySorted.length);
    expect(engineSorted.length).toBe(4);

    // ── Parity assertion: each line matches ───────────────────────────
    for (let i = 0; i < legacySorted.length; i++) {
      const legacy = legacySorted[i];
      const engine = engineSorted[i];

      expect(engine.accountId).toBe(legacy.accountId);
      expect(Number(engine.debitAmount)).toBe(Number(legacy.debitAmount));
      expect(Number(engine.creditAmount)).toBe(Number(legacy.creditAmount));
    }

    // ── Balance invariant: debits = credits on both ───────────────────
    const legacyDebit = legacySorted.reduce((s, l) => s + Number(l.debitAmount), 0);
    const legacyCredit = legacySorted.reduce((s, l) => s + Number(l.creditAmount), 0);
    expect(legacyDebit).toBe(legacyCredit);
    expect(legacyDebit).toBe(1600);

    const engineDebit = engineSorted.reduce((s, l) => s + Number(l.debitAmount), 0);
    const engineCredit = engineSorted.reduce((s, l) => s + Number(l.creditAmount), 0);
    expect(engineDebit).toBe(engineCredit);
    expect(engineDebit).toBe(1600);

    // ── Specific account mappings match ───────────────────────────────
    const findLine = (sorted: any[], accId: string) => sorted.find((l) => l.accountId === accId);

    // AR: Dr 1000
    expect(findLine(legacySorted, arAccId)!.debitAmount).toBe("1000.00");
    expect(findLine(engineSorted, arAccId)!.debitAmount).toBe("1000.00");

    // Revenue: Cr 1000
    expect(findLine(legacySorted, revAccId)!.creditAmount).toBe("1000.00");
    expect(findLine(engineSorted, revAccId)!.creditAmount).toBe("1000.00");

    // COGS: Dr 600
    expect(findLine(legacySorted, cogsAccId)!.debitAmount).toBe("600.00");
    expect(findLine(engineSorted, cogsAccId)!.debitAmount).toBe("600.00");

    // Inventory: Cr 600
    expect(findLine(legacySorted, invAccId)!.creditAmount).toBe("600.00");
    expect(findLine(engineSorted, invAccId)!.creditAmount).toBe("600.00");
  });

  it("postTransaction rejects unbalanced entries", async () => {
    const { postTransaction } = await import("@/lib/accounting/posting-engine");
    const { ids } = testDb;

    await expect(
      postTransaction(testDb.db, {
        orgId: ids.orgId,
        description: "Unbalanced test",
        date: new Date("2026-09-01"),
        referenceType: "manual",
        referenceId: "00000000-0000-0000-0000-000000000099",
        lines: [
          { accountId: ids.cashAccId, description: "Dr", debit: "500", credit: "0" },
          { accountId: ids.revAccId, description: "Cr", debit: "0", credit: "300" },
        ],
      }),
    ).rejects.toThrow("out of balance");
  });

  it("postTransaction rejects empty lines", async () => {
    const { postTransaction } = await import("@/lib/accounting/posting-engine");
    const { ids } = testDb;

    await expect(
      postTransaction(testDb.db, {
        orgId: ids.orgId,
        description: "Empty test",
        date: new Date("2026-09-01"),
        referenceType: "manual",
        referenceId: "00000000-0000-0000-0000-000000000099",
        lines: [],
      }),
    ).rejects.toThrow("at least one line");
  });

  it("reverseTransaction creates equal-and-opposite entry and marks original reversed", async () => {
    const { db, ids } = testDb;
    const { orgId, cashAccId, revAccId } = ids;

    // Post a simple entry first
    const { postTransaction } = await import("@/lib/accounting/posting-engine");
    const posted = await postTransaction(db, {
      orgId,
      description: "Original entry",
      date: new Date("2026-09-01"),
      referenceType: "manual",
      referenceId: "00000000-0000-0000-0000-000000000098",
      lines: [
        { accountId: cashAccId, description: "Dr cash", debit: "500", credit: "0" },
        { accountId: revAccId, description: "Cr revenue", debit: "0", credit: "500" },
      ],
    });

    // Reverse it
    const { reverseTransaction } = await import("@/lib/accounting/posting-engine");
    const reversal = await reverseTransaction(
      db,
      posted.journalEntryId,
      "Reversal of original",
      new Date("2026-09-02"),
      orgId,
    );

    expect(reversal.journalEntryId).toBeDefined();
    expect(reversal.journalEntryId).not.toBe(posted.journalEntryId);

    // Original should be marked reversed
    const [orig] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, posted.journalEntryId))
      .limit(1);
    expect(orig.status).toBe("reversed");

    // Reversal entry should be posted
    const [rev] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, reversal.journalEntryId))
      .limit(1);
    expect(rev.status).toBe("posted");
    expect(rev.referenceType).toBe("reversal");
    expect(rev.referenceId).toBe(posted.journalEntryId);

    // Reversal lines should swap debit/credit
    const revLines = await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, reversal.journalEntryId));

    const cashLine = revLines.find((l) => l.accountId === cashAccId);
    const revLine = revLines.find((l) => l.accountId === revAccId);

    expect(cashLine).toBeDefined();
    expect(revLine).toBeDefined();

    // Original: Dr cash 500 → Reversal: Cr cash 500
    expect(Number(cashLine!.debitAmount)).toBe(0);
    expect(Number(cashLine!.creditAmount)).toBe(500);

    // Original: Cr revenue 500 → Reversal: Dr revenue 500
    expect(Number(revLine!.debitAmount)).toBe(500);
    expect(Number(revLine!.creditAmount)).toBe(0);
  });

  it("resolveAccount finds account by subType", async () => {
    const { resolveAccount } = await import("@/lib/accounting/posting-engine");
    const { ids } = testDb;

    const ar = await resolveAccount(testDb.db, ids.orgId, "accounts_receivable");
    expect(ar.id).toBe(ids.arAccId);
    expect(ar.name).toBe("Accounts Receivable");

    await expect(
      resolveAccount(testDb.db, ids.orgId, "nonexistent_sub_type"),
    ).rejects.toThrow('no account with subType "nonexistent_sub_type"');
  });

  it("NB-P0-01: approveInvoice with receivedAmount > 0 creates Dr Cash/Bank + Cr AR lines", async () => {
    const { db, ids } = testDb;
    const { orgId, arAccId, revAccId, cogsAccId, invAccId, cashAccId, custId, prodId } = ids;

    // Invoice: 10 widgets @ Rs.100, costPrice=60, receivedAmount=400
    // Expected: 6 lines
    //   Dr AR       1000   Cr 0       (full netAmount)
    //   Dr 0        Cr 1000          (revenue)
    //   Dr COGS     600    Cr 0      (10 * 60)
    //   Dr 0        Cr 600           (inventory)
    //   Dr Cash     400    Cr 0      (received — NB-P0-01 NEW)
    //   Dr 0        Cr 400           (AR credit — NB-P0-01 NEW)
    // Net AR = 1000 - 400 = 600 = balanceAmount ✓

    const invId = "30000000-0000-0000-0000-000000000001";
    const itmId = "40000000-0000-0000-0000-000000000001";
    const issueDate = new Date("2026-09-15");

    await db.execute(
      `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount, cash_bank_account_id, tax_amount)
       VALUES ('${invId}','${orgId}','${custId}','INV-P001','pending','${issueDate.toISOString()}','1000.00','1000.00','0.00','0.00','0.00','400.00','600.00','${cashAccId}','0.00')`,
    );
    await db.execute(
      `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, tax_rate, line_total)
       VALUES ('${itmId}','${orgId}','${invId}','${prodId}','Widget sale','10','100.00','0','1000.00')`,
    );

    const { approveInvoice } = await import("@/lib/actions/sales");
    const result = await approveInvoice(invId);
    expect(result.success).toBe(true);

    // Read the JE
    const [je] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.referenceId, invId))
      .limit(1);
    expect(je).toBeDefined();
    expect(je.status).toBe("posted");

    const lines = await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, je.id));

    // 6 lines: AR, Revenue, COGS, Inventory, Cash (dr), AR Credit (cr)
    expect(lines.length).toBe(6);

    // Balance check
    const totalDebit = lines.reduce((s, l) => s + Number(l.debitAmount), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.creditAmount), 0);
    expect(totalDebit).toBe(totalCredit);
    // Dr: AR 1000 + COGS 600 + Cash 400 = 2000
    expect(totalDebit).toBe(2000);

    const findLine = (accId: string, desc: string) =>
      lines.find((l) => l.accountId === accId && l.description?.includes(desc));

    // AR: Dr 1000 (full netAmount)
    const arDr = findLine(arAccId, "AR Invoice");
    expect(arDr).toBeDefined();
    expect(Number(arDr!.debitAmount)).toBe(1000);
    expect(Number(arDr!.creditAmount)).toBe(0);

    // Revenue: Cr 1000
    const revCr = findLine(revAccId, "Revenue Invoice");
    expect(revCr).toBeDefined();
    expect(Number(revCr!.debitAmount)).toBe(0);
    expect(Number(revCr!.creditAmount)).toBe(1000);

    // COGS: Dr 600
    const cogsDr = findLine(cogsAccId, "COGS Invoice");
    expect(cogsDr).toBeDefined();
    expect(Number(cogsDr!.debitAmount)).toBe(600);

    // Inventory: Cr 600
    const invCr = findLine(invAccId, "Inventory Credit Invoice");
    expect(invCr).toBeDefined();
    expect(Number(invCr!.creditAmount)).toBe(600);

    // Cash/Bank: Dr 400 (NB-P0-01 — the fix)
    const cashDr = findLine(cashAccId, "Cash Received");
    expect(cashDr).toBeDefined();
    expect(Number(cashDr!.debitAmount)).toBe(400);
    expect(Number(cashDr!.creditAmount)).toBe(0);

    // AR Credit: Cr 400 (NB-P0-01 — offsets the AR)
    const arCr = findLine(arAccId, "AR Credit");
    expect(arCr).toBeDefined();
    expect(Number(arCr!.debitAmount)).toBe(0);
    expect(Number(arCr!.creditAmount)).toBe(400);

    // Net AR = 1000 - 400 = 600 = balanceAmount
    const arLines = lines.filter((l) => l.accountId === arAccId);
    const netAR = arLines.reduce((s, l) => s + Number(l.debitAmount) - Number(l.creditAmount), 0);
    expect(netAR).toBe(600);
  });
});
