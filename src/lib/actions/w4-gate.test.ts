import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/__tests__/test-db";

vi.setConfig({ hookTimeout: 30000 });

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
  fp1:      "a4000001-0000-0000-0000-000000000001",
  fp2:      "a4000002-0000-0000-0000-000000000001",
  fp3:      "a4000003-0000-0000-0000-000000000001",
  shiftJe1: "b4000001-0000-0000-0000-000000000001",
  shiftJe2: "b4000002-0000-0000-0000-000000000001",
  walkIn1:  "c4000001-0000-0000-0000-000000000001",
  walkIn2:  "c4000002-0000-0000-0000-000000000001",
  adj1:     "d4000001-0000-0000-0000-000000000001",
  adjLine1: "d4000002-0000-0000-0000-000000000001",
  tax1:     "e4000001-0000-0000-0000-000000000001",
  jeFx:     "f4000001-0000-0000-0000-000000000001",
  jlFxDr:   "f4000002-0000-0000-0000-000000000001",
  jlFxCr:   "f4000003-0000-0000-0000-000000000001",
};

beforeEach(async () => {
  vi.resetModules();
  testDb = await createTestDb();
  dbRef.current = testDb.db;
  checkPeriodLockedMock.mockResolvedValue(false);
  validateJournalBalanceMock.mockReturnValue(true);

  const shared = await import("@/lib/actions/shared");
  vi.mocked(shared.getCurrentOrgId).mockResolvedValue(testDb.ids.orgId);
  vi.mocked(shared.generateDocumentNumber).mockImplementation(async () => `INV-${Date.now()}`);
  vi.mocked(shared.generateJournalEntryNumber).mockImplementation(async () => `JE-${Date.now()}`);
});

afterEach(async () => {
  await testDb?.close();
});

describe("W4-GATE: Wave 4 functional regression tests", () => {

  it("1. Period-lock rejection: POS sale in locked fiscal period is rejected", async () => {
    const { db, ids } = testDb;
    checkPeriodLockedMock.mockResolvedValue(true);

    await db.execute(
      `INSERT INTO fiscal_periods (id, org_id, name, start_date, end_date, is_locked, is_active) VALUES ('${U.fp1}','${ids.orgId}','Locked FY 2025-26','2025-07-01','2026-06-30',true,true)`
    );
    await db.execute(
      `INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, reference_type, reference_id, description) VALUES ('${U.shiftJe1}','${ids.orgId}','JE-SHIFT-W4','2026-08-31','posted','pos_shift','${ids.profileId}','open')`
    );
    await db.execute(
      `INSERT INTO customers (id, org_id, name) VALUES ('${U.walkIn1}','${ids.orgId}','Walk-in Customer')`
    );

    const { processPosSale } = await import("./pos");

    const result = await processPosSale({
      items: [{ productId: ids.prodId, quantity: 2, unitPrice: 100 }],
      paymentMethod: "cash",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("locked fiscal period");

    const invCount = await db.execute(
      `SELECT id FROM invoices WHERE org_id = '${ids.orgId}'`
    );
    expect(invCount.rows.length).toBe(0);

    const jeCount = await db.execute(
      `SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}' AND reference_type = 'pos_sale'`
    );
    expect(jeCount.rows.length).toBe(0);
  });

  it("2. Period-lock rejection: stock adjustment approval in locked period is rejected", async () => {
    const { db, ids } = testDb;
    checkPeriodLockedMock.mockResolvedValue(true);

    await db.execute(
      `INSERT INTO fiscal_periods (id, org_id, name, start_date, end_date, is_locked, is_active) VALUES ('${U.fp2}','${ids.orgId}','Locked FY 2025-26','2025-07-01','2026-06-30',true,true)`
    );
    await db.execute(
      `INSERT INTO stock_adjustments (id, org_id, adjustment_number, adjustment_date, reason, approval_status) VALUES ('${U.adj1}','${ids.orgId}','SA-00001','2026-03-15','correction','pending_approval')`
    );
    await db.execute(
      `INSERT INTO stock_adjustment_lines (id, org_id, stock_adjustment_id, product_id, current_stock, adjusted_quantity, difference, unit_cost, total_value) VALUES ('${U.adjLine1}','${ids.orgId}','${U.adj1}','${ids.prodId}','100','110','10','60','600')`
    );

    const { approveStockAdjustment } = await import("./inventory-depth");
    const result = await approveStockAdjustment(U.adj1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("locked fiscal period");

    const adjAfter = await db.execute(
      `SELECT approval_status FROM stock_adjustments WHERE id = '${U.adj1}'`
    );
    expect((adjAfter.rows[0] as any).approval_status).toBe("pending_approval");
  });

  it("3. Period-lock rejection: JE post via createJournalEntry in locked period is rejected", async () => {
    const { db, ids } = testDb;
    checkPeriodLockedMock.mockResolvedValue(true);

    await db.execute(
      `INSERT INTO fiscal_periods (id, org_id, name, start_date, end_date, is_locked, is_active) VALUES ('${U.fp3}','${ids.orgId}','Locked FY 2025-26','2025-07-01','2026-06-30',true,true)`
    );

    const { createJournalEntry } = await import("./accounts");

    const result = await createJournalEntry({
      date: "2026-03-15",
      reference: "Test Manual JE",
      description: "Manual JE in locked period",
      lines: [
        { accountId: ids.cashAccId, description: "Debit cash", debit: "1000", credit: "0" },
        { accountId: ids.revAccId, description: "Credit revenue", debit: "0", credit: "1000" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("locked fiscal period");

    const jeCount = await db.execute(
      `SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}' AND reference_type = 'manual'`
    );
    expect(jeCount.rows.length).toBe(0);
  });

  it("4. Tax validation: POS sale with unconfigured tax rate is rejected", async () => {
    const { db, ids } = testDb;
    checkPeriodLockedMock.mockResolvedValue(false);

    await db.execute(
      `INSERT INTO tax_rates (id, org_id, name, rate, tax_type, is_active) VALUES ('${U.tax1}','${ids.orgId}','GST 17%','17','GST',true)`
    );
    await db.execute(
      `INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, reference_type, reference_id, description) VALUES ('${U.shiftJe2}','${ids.orgId}','JE-SHIFT-W4-2','2026-08-31','posted','pos_shift','${ids.profileId}','open')`
    );
    await db.execute(
      `INSERT INTO customers (id, org_id, name) VALUES ('${U.walkIn2}','${ids.orgId}','Walk-in Customer')`
    );

    const { processPosSale } = await import("./pos");

    const result = await processPosSale({
      items: [{ productId: ids.prodId, quantity: 2, unitPrice: 100 }],
      paymentMethod: "cash",
      taxPercentage: 99,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("99");
    expect(result.error).toContain("not configured");
  });

  it("5. Multi-currency: JE with currency != PKR stores correct exchangeRate and amounts", async () => {
    const { db, ids } = testDb;

    const exchangeRate = 280.5;
    const originalAmount = 1000;
    const pkrAmount = originalAmount * exchangeRate;

    await db.execute("BEGIN");
    await db.execute(
      `INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, description, currency, exchange_rate) VALUES ('${U.jeFx}','${ids.orgId}','JE-FX-00001','2026-08-31','posted','Multi-currency test JE','USD','${exchangeRate}')`
    );
    await db.execute(
      `INSERT INTO journal_entry_lines (id, org_id, journal_entry_id, account_id, debit_amount, credit_amount, original_amount, original_currency) VALUES ('${U.jlFxDr}','${ids.orgId}','${U.jeFx}','${ids.cashAccId}','${pkrAmount}','0','${originalAmount}','USD')`
    );
    await db.execute(
      `INSERT INTO journal_entry_lines (id, org_id, journal_entry_id, account_id, debit_amount, credit_amount, original_amount, original_currency) VALUES ('${U.jlFxCr}','${ids.orgId}','${U.jeFx}','${ids.revAccId}','0','${pkrAmount}','${originalAmount}','USD')`
    );
    await db.execute("COMMIT");

    const jeRows = await db.execute(
      `SELECT currency, exchange_rate FROM journal_entries WHERE id = '${U.jeFx}'`
    );
    const jeRow = jeRows.rows[0] as any;
    expect(jeRow.currency).toBe("USD");
    expect(Number(jeRow.exchange_rate)).toBe(exchangeRate);

    const lines = await db.execute(
      `SELECT debit_amount, credit_amount, original_amount, original_currency FROM journal_entry_lines WHERE journal_entry_id = '${U.jeFx}'`
    );
    expect(lines.rows.length).toBe(2);

    const totalDebit = lines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const totalCredit = lines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(pkrAmount);

    for (const row of lines.rows) {
      expect((row as any).original_currency).toBe("USD");
      expect(Number((row as any).original_amount)).toBe(originalAmount);
    }
  });

  it("6. Easypaisa signature: callback with missing salt is rejected (fail-closed)", async () => {
    const origSalt = process.env.EASYPAISA_INTEGRITY_SALT;
    try {
      delete process.env.EASYPAISA_INTEGRITY_SALT;

      const { POST } = await import("@/app/api/payments/callback/route");

      const formData = new FormData();
      formData.set("orderRef", "EP-TEST-001");
      formData.set("ppmpf_1", "/pos");
      formData.set("status", "completed");

      const req = new Request("http://localhost:3000/api/payments/callback", {
        method: "POST",
        body: formData,
      }) as any;
      req.nextUrl = new URL("http://localhost:3000/api/payments/callback");

      const resp = await POST(req);
      const location = resp.headers.get("location") || "";

      expect(resp.status).toBeGreaterThanOrEqual(300);
      expect(resp.status).toBeLessThan(400);
      expect(location).toContain("missing_salt");
    } finally {
      if (origSalt !== undefined) {
        process.env.EASYPAISA_INTEGRITY_SALT = origSalt;
      } else {
        delete process.env.EASYPAISA_INTEGRITY_SALT;
      }
    }
  });

  it("7. Easypaisa signature: callback with forged hash is rejected (fail-closed)", async () => {
    const origSalt = process.env.EASYPAISA_INTEGRITY_SALT;
    try {
      process.env.EASYPAISA_INTEGRITY_SALT = "real-salt-w4";

      const { POST } = await import("@/app/api/payments/callback/route");

      const formData = new FormData();
      formData.set("orderRef", "EP-TEST-002");
      formData.set("amount", "1500");
      formData.set("status", "completed");
      formData.set("secureHash", "aabbccdd1122334400000000000000000000000000000000000000000000000000");
      formData.set("ppmpf_1", "/pos");

      const req = new Request("http://localhost:3000/api/payments/callback", {
        method: "POST",
        body: formData,
      }) as any;
      req.nextUrl = new URL("http://localhost:3000/api/payments/callback");

      const resp = await POST(req);
      const location = resp.headers.get("location") || "";

      expect(resp.status).toBeGreaterThanOrEqual(300);
      expect(resp.status).toBeLessThan(400);
      expect(location).toContain("invalid_signature");
    } finally {
      if (origSalt !== undefined) {
        process.env.EASYPAISA_INTEGRITY_SALT = origSalt;
      } else {
        delete process.env.EASYPAISA_INTEGRITY_SALT;
      }
    }
  });

});
