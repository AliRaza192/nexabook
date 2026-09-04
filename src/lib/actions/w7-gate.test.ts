import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/__tests__/test-db";

vi.setConfig({ hookTimeout: 60000 });

let testDb: Awaited<ReturnType<typeof createTestDb>>;

const dbRef: { current: any } = { current: null as any };
vi.mock("@/db", () => ({ get db() { return dbRef.current; } }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_123" }),
  currentUser: vi.fn(),
}));

vi.mock("@/lib/fbr-api", () => ({ submitInvoiceToFBR: vi.fn() }));
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

const { validateJournalBalanceMock } = vi.hoisted(() => {
  return { validateJournalBalanceMock: vi.fn().mockReturnValue(true) };
});
vi.mock("@/lib/accounting", () => ({
  validateJournalBalance: validateJournalBalanceMock,
}));

const U = {
  po1:    "a7000001-0000-0000-0000-000000000001",
  poItem: "a7000002-0000-0000-0000-000000000001",
  grn1:   "a7000003-0000-0000-0000-000000000001",
  grnItm: "a7000004-0000-0000-0000-000000000001",
  pi1:    "a7000005-0000-0000-0000-000000000001",
  piItem: "a7000006-0000-0000-0000-000000000001",
  adj1:   "a7000007-0000-0000-0000-000000000001",
  adjLn1: "a7000008-0000-0000-0000-000000000001",
  adj2:   "a7000009-0000-0000-0000-000000000001",
  adjLn2: "a7000010-0000-0000-0000-000000000001",
  je1:    "a7000011-0000-0000-0000-000000000001",
  jl1:    "a7000012-0000-0000-0000-000000000001",
  jl2:    "a7000013-0000-0000-0000-000000000001",
  inv1:   "a7000014-0000-0000-0000-000000000001",
  itm1:   "a7000015-0000-0000-0000-000000000001",
  org2:   "a7000016-0000-0000-0000-000000000001",
  acc2:   "a7000017-0000-0000-0000-000000000001",
  sc1:    "a7000020-0000-0000-0000-000000000001",
  scItem: "a7000021-0000-0000-0000-000000000001",
  writeOffAcc: "a7000022-0000-0000-0000-000000000001",
  adjIncAcc:   "a7000023-0000-0000-0000-000000000001",
};

beforeEach(async () => {
  vi.resetModules();
  testDb = await createTestDb();
  dbRef.current = testDb.db;
  checkPeriodLockedMock.mockResolvedValue(false);
  validateJournalBalanceMock.mockReturnValue(true);

  const shared = await import("@/lib/actions/shared");
  vi.mocked(shared.getCurrentOrgId).mockResolvedValue(testDb.ids.orgId);
  vi.mocked(shared.generateDocumentNumber).mockImplementation(async () => `DOC-${Date.now()}`);
  vi.mocked(shared.generateJournalEntryNumber).mockImplementation(async () => `JE-${Date.now()}`);
});

afterEach(async () => {
  await testDb?.close();
});

describe("W7-GATE: Wave 7a financial-integrity regression tests", () => {

  it("1. p0-06: GRN does NOT increment stock; purchase invoice approval increments exactly once", async () => {
    const { db, ids } = testDb;

    const stockBefore = await db.execute(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`);
    const beforeQty = Number((stockBefore.rows[0] as any).current_stock);

    const { createGRN } = await import("./purchases");
    const grnResult = await createGRN({
      vendorId: ids.vendId,
      receivingDate: "2026-09-01",
      items: [{
        productId: ids.prodId,
        orderedQty: "50",
        receivedQty: "50",
        acceptedQty: "50",
        rejectedQty: "0",
      }],
    });
    expect(grnResult.success).toBe(true);

    const stockAfterGrn = await db.execute(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`);
    const afterGrnQty = Number((stockAfterGrn.rows[0] as any).current_stock);
    expect(afterGrnQty).toBe(beforeQty);

    await db.execute(
      `INSERT INTO purchase_invoices (id, org_id, vendor_id, bill_number, status, date, net_amount, gross_amount, discount_total, tax_total) VALUES ('${U.pi1}','${ids.orgId}','${ids.vendId}','PB-W7-001','Draft','2026-09-01','3000','3000','0','0')`
    );
    await db.execute(
      `INSERT INTO purchase_items (id, org_id, purchase_invoice_id, product_id, description, quantity, unit_price, line_total, tax_rate) VALUES ('${U.piItem}','${ids.orgId}','${U.pi1}','${ids.prodId}','Widget','50','60','3000','0')`
    );

    const { approvePurchaseInvoice } = await import("./purchases");
    const approvalResult = await approvePurchaseInvoice(U.pi1);
    expect(approvalResult.success).toBe(true);

    const stockAfterApproval = await db.execute(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`);
    const afterApprovalQty = Number((stockAfterApproval.rows[0] as any).current_stock);
    expect(afterApprovalQty).toBe(beforeQty + 50);
  });

  it("2. p0-07: Stock adjustment with negative variance creates balanced journal entries", async () => {
    const { db, ids } = testDb;

    await db.execute(
      `INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type) VALUES ('${U.writeOffAcc}','${ids.orgId}','5100','Inventory Write-off','expense','inventory_write_off'),('${U.adjIncAcc}','${ids.orgId}','4100','Inventory Adjustment Income','income','inventory_adjustment_income')`
    );

    await db.execute(
      `INSERT INTO stock_adjustments (id, org_id, adjustment_number, adjustment_date, reason, approval_status) VALUES ('${U.adj1}','${ids.orgId}','SA-W7-001','2026-09-01','correction','pending_approval')`
    );
    await db.execute(
      `INSERT INTO stock_adjustment_lines (id, org_id, stock_adjustment_id, product_id, current_stock, adjusted_quantity, difference, unit_cost, total_value) VALUES ('${U.adjLn1}','${ids.orgId}','${U.adj1}','${ids.prodId}','100','90','-10','60','600')`
    );

    const { approveStockAdjustment } = await import("./inventory-depth");
    const result = await approveStockAdjustment(U.adj1);
    expect(result.success).toBe(true);

    const jeRows = await db.execute(
      `SELECT id, status FROM journal_entries WHERE reference_type = 'stock_adjustment' AND reference_id = '${U.adj1}'`
    );
    expect(jeRows.rows.length).toBe(1);
    expect((jeRows.rows[0] as any).status).toBe("posted");

    const jeId = (jeRows.rows[0] as any).id;
    const lines = await db.execute(
      `SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '${jeId}'`
    );
    expect(lines.rows.length).toBe(2);

    const totalDebit = lines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const totalCredit = lines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(600);
  });

  it("3. p0-08: Stock adjustment in draft does NOT change currentStock; approval does", async () => {
    const { db, ids } = testDb;

    await db.execute(
      `INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type) VALUES ('${U.writeOffAcc}','${ids.orgId}','5100','Inventory Write-off','expense','inventory_write_off'),('${U.adjIncAcc}','${ids.orgId}','4100','Inventory Adjustment Income','income','inventory_adjustment_income')`
    );

    const stockBefore = await db.execute(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`);
    const beforeQty = Number((stockBefore.rows[0] as any).current_stock);

    const { addStockAdjustment, approveStockAdjustment } = await import("./inventory-depth");

    const createResult = await addStockAdjustment({
      adjustmentDate: "2026-09-01",
      reason: "correction",
      lines: [{ productId: ids.prodId, adjustedQuantity: "120" }],
    });
    expect(createResult.success).toBe(true);

    const stockAfterCreate = await db.execute(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`);
    const afterCreateQty = Number((stockAfterCreate.rows[0] as any).current_stock);
    expect(afterCreateQty).toBe(beforeQty);

    const adjustmentId = (createResult.data as any).id;
    const approveResult = await approveStockAdjustment(adjustmentId);
    expect(approveResult.success).toBe(true);

    const stockAfterApprove = await db.execute(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`);
    const afterApproveQty = Number((stockAfterApprove.rows[0] as any).current_stock);
    expect(afterApproveQty).toBe(120);
  });

  it("4. p0-09: Posted journal entry cannot be deleted at the application layer", async () => {
    const { db, ids } = testDb;

    await db.execute(
      `INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, description) VALUES ('${U.je1}','${ids.orgId}','JE-POSTED','2026-09-01','posted','Posted entry')`
    );
    await db.execute(
      `INSERT INTO journal_entry_lines (id, org_id, journal_entry_id, account_id, debit_amount, credit_amount) VALUES ` +
      `('${U.jl1}','${ids.orgId}','${U.je1}','${ids.cashAccId}','1000','0'), ` +
      `('${U.jl2}','${ids.orgId}','${U.je1}','${ids.revAccId}','0','1000')`
    );

    const { deleteJournalEntry } = await import("./accounts");
    const result = await deleteJournalEntry(U.je1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("posted");

    const jeStillExists = await db.execute(`SELECT id FROM journal_entries WHERE id = '${U.je1}'`);
    expect(jeStillExists.rows.length).toBe(1);

    const linesStillExist = await db.execute(`SELECT id FROM journal_entry_lines WHERE journal_entry_id = '${U.je1}'`);
    expect(linesStillExist.rows.length).toBe(2);
  });

  it("5. p0-10: Approved invoice cannot be hard-deleted; void produces cancellation + reversal JE", async () => {
    const { db, ids } = testDb;

    await db.execute(
      `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount) VALUES ('${U.inv1}','${ids.orgId}','${ids.custId}','INV-W7-VOID','pending','2026-09-01','1000','1000','0','0','0','0','1000')`
    );
    await db.execute(
      `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, line_total, tax_rate) VALUES ('${U.itm1}','${ids.orgId}','${U.inv1}','${ids.prodId}','Widget','10','100','1000','0')`
    );

    const { approveInvoice, deleteInvoice } = await import("./sales");

    const approveResult = await approveInvoice(U.inv1);
    expect(approveResult.success).toBe(true);

    const invBefore = await db.execute(`SELECT journal_entry_id, status FROM invoices WHERE id = '${U.inv1}'`);
    const origJeId = (invBefore.rows[0] as any).journal_entry_id;
    expect((invBefore.rows[0] as any).status).toBe("approved");

    const deleteResult = await deleteInvoice(U.inv1);
    expect(deleteResult.success).toBe(true);

    const invAfter = await db.execute(`SELECT status FROM invoices WHERE id = '${U.inv1}'`);
    expect(invAfter.rows.length).toBe(1);
    expect((invAfter.rows[0] as any).status).toBe("cancelled");

    const reversalJe = await db.execute(
      `SELECT id FROM journal_entries WHERE reference_type = 'reversal' AND reference_id = '${U.inv1}'`
    );
    expect(reversalJe.rows.length).toBe(1);
    const reversalJeId = (reversalJe.rows[0] as any).id;

    const origLines = await db.execute(
      `SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '${origJeId}'`
    );
    const revLines = await db.execute(
      `SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '${reversalJeId}'`
    );

    const origDebit = origLines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const origCredit = origLines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);
    const revDebit = revLines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const revCredit = revLines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);

    expect(origDebit).toBe(origCredit);
    expect(revDebit).toBe(revCredit);
    expect(origDebit).toBe(revDebit);
  });

  it("6. p0-11: Journal entry with accountId from different org is rejected", async () => {
    const { db, ids } = testDb;

    await db.execute(
      `INSERT INTO organizations (id, name, slug) VALUES ('${U.org2}','Other Co','other-co')`
    );
    await db.execute(
      `INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type) VALUES ('${U.acc2}','${U.org2}','9999','Foreign Account','asset','cash')`
    );

    const { createJournalEntry } = await import("./accounts");

    const result = await createJournalEntry({
      date: "2026-09-01",
      reference: "IDOR test",
      description: "Attempting cross-org account",
      lines: [
        { accountId: ids.cashAccId, description: "Debit cash", debit: "1000", credit: "0" },
        { accountId: U.acc2, description: "Credit foreign", debit: "0", credit: "1000" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not belong to this organization");

    const jeCount = await db.execute(
      `SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}' AND reference_type = 'manual'`
    );
    expect(jeCount.rows.length).toBe(0);
  });

  it("7. p0-12: Zod validation rejects invalid data before any DB write", async () => {
    const { db, ids } = testDb;

    const { createJournalEntry } = await import("./accounts");

    const resultNoLines = await createJournalEntry({
      date: "2026-09-01",
      reference: "Validation test",
      description: "No lines",
      lines: [],
    });
    expect(resultNoLines.success).toBe(false);

    const jeCount1 = await db.execute(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}'`);
    expect(jeCount1.rows.length).toBe(0);

    const resultBadAccount = await createJournalEntry({
      date: "2026-09-01",
      reference: "Validation test 2",
      description: "Bad UUID",
      lines: [
        { accountId: "not-a-uuid", description: "Bad", debit: "100", credit: "0" },
        { accountId: ids.revAccId, description: "OK", debit: "0", credit: "100" },
      ],
    });
    expect(resultBadAccount.success).toBe(false);

    const jeCount2 = await db.execute(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}'`);
    expect(jeCount2.rows.length).toBe(0);

    const resultUnbalanced = await createJournalEntry({
      date: "2026-09-01",
      reference: "Validation test 3",
      description: "Unbalanced",
      lines: [
        { accountId: ids.cashAccId, description: "Debit", debit: "500", credit: "0" },
        { accountId: ids.revAccId, description: "Credit", debit: "0", credit: "300" },
      ],
    });
    expect(resultUnbalanced.success).toBe(false);

    const jeCount3 = await db.execute(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}'`);
    expect(jeCount3.rows.length).toBe(0);
  });

  it("8. p0-13: Encryption fails closed when ENCRYPTION_KEY is unset in production", async () => {
    const origKey = process.env.ENCRYPTION_KEY;
    const env = process.env as Record<string, string | undefined>;

    try {
      delete env.ENCRYPTION_KEY;
      env.NODE_ENV = "production";

      const mod = await import("@/lib/encryption");
      expect(() => mod.encryptToken("test-value")).toThrow("ENCRYPTION_KEY");
      expect(() => mod.decryptToken("aa:bb:cc")).toThrow("ENCRYPTION_KEY");

      env.NODE_ENV = "test";
      const mod2 = await import("@/lib/encryption");
      const encrypted = mod2.encryptToken("test-value");
      expect(encrypted).toBeTruthy();
      const decrypted = mod2.decryptToken(encrypted);
      expect(decrypted).toBe("test-value");
      expect(mod2.isEncrypted(encrypted)).toBe(true);
      expect(mod2.isEncrypted("plaintext")).toBe(false);
    } finally {
      if (origKey !== undefined) {
        env.ENCRYPTION_KEY = origKey;
      } else {
        delete env.ENCRYPTION_KEY;
      }
      env.NODE_ENV = "test";
    }
  });

});
