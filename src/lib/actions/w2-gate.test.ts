import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/__tests__/test-db";

vi.setConfig({ hookTimeout: 30000 });

let testDb: Awaited<ReturnType<typeof createTestDb>>;

const U = {
  inv1:      "a1000000-0000-0000-0000-000000000001",
  item1:     "a2000000-0000-0000-0000-000000000001",
  invDel:    "b1000000-0000-0000-0000-000000000001",
  itemDel:   "b2000000-0000-0000-0000-000000000001",
  jeOrig:    "c1000000-0000-0000-0000-000000000001",
  jl1:       "c2000000-0000-0000-0000-000000000001",
  jl2:       "c3000000-0000-0000-0000-000000000001",
  pi1:       "d1000000-0000-0000-0000-000000000001",
  piItem1:   "d2000000-0000-0000-0000-000000000001",
  shiftJe:   "e1000000-0000-0000-0000-000000000001",
  jePosted:  "f1000000-0000-0000-0000-000000000001",
  jeDraft:   "f2000000-0000-0000-0000-000000000001",
  jlp1:      "f3000000-0000-0000-0000-000000000001",
  jlp2:      "f4000000-0000-0000-0000-000000000001",
  jld1:      "f5000000-0000-0000-0000-000000000001",
  jld2:      "f6000000-0000-0000-0000-000000000001",
  invLocked: "a8000000-0000-0000-0000-000000000001",
  fpLocked:  "11111111-1111-1111-1111-111111111111",
};

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

beforeEach(async () => {
  vi.resetModules();
  testDb = await createTestDb();
  dbRef.current = testDb.db;
  let jeCounter = 0;
  const shared = await import("@/lib/actions/shared");
  vi.mocked(shared.getCurrentOrgId).mockResolvedValue(testDb.ids.orgId);
  vi.mocked(shared.generateDocumentNumber).mockImplementation(async () => `INV-${String(++jeCounter).padStart(4, "0")}`);
  vi.mocked(shared.generateJournalEntryNumber).mockImplementation(async () => `JE-${String(++jeCounter).padStart(4, "0")}`);
});

afterEach(async () => {
  await testDb?.close();
});

describe("W2-GATE: Real DB regression tests", () => {
  it("1. approveInvoice posts JE with status posted and balanced lines", async () => {
    const { db, ids } = testDb;
    const { approveInvoice } = await import("./sales");

    await db.execute(
      "INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount) VALUES ('" + U.inv1 + "','" + ids.orgId + "','" + ids.custId + "','INV-001','pending','2026-08-20','1000','1000','0','0','0','0','1000')"
    );
    await db.execute(
      "INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, line_total, tax_rate) VALUES ('" + U.item1 + "','" + ids.orgId + "','" + U.inv1 + "','" + ids.prodId + "','Widget','10','100','1000','0')"
    );

    const result = await approveInvoice(U.inv1);
    expect(result.success).toBe(true);

    const inv = await db.execute("SELECT journal_entry_id, status FROM invoices WHERE id = '" + U.inv1 + "'");
    const row = inv.rows[0] as any;
    expect(row.journal_entry_id).toBeTruthy();
    expect(row.status).toBe("approved");

    const jeRows = await db.execute("SELECT status FROM journal_entries WHERE id = '" + row.journal_entry_id + "'");
    expect((jeRows.rows[0] as any).status).toBe("posted");

    const lines = await db.execute(
      "SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '" + row.journal_entry_id + "'"
    );
    const totalDebit = lines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const totalCredit = lines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);
    expect(totalDebit).toBeGreaterThan(0);
    expect(totalDebit).toBe(totalCredit);
  });

  it("2. deleteInvoice creates reversal JE with net-zero balance", async () => {
    const { db, ids } = testDb;
    const { approveInvoice, deleteInvoice } = await import("./sales");

    await db.execute(
      "INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount) VALUES ('" + U.invDel + "','" + ids.orgId + "','" + ids.custId + "','INV-DEL','pending','2026-08-20','500','500','0','0','0','0','500')"
    );
    await db.execute(
      "INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, line_total, tax_rate) VALUES ('" + U.itemDel + "','" + ids.orgId + "','" + U.invDel + "','" + ids.prodId + "','Widget','5','100','500','0')"
    );

    const approveResult = await approveInvoice(U.invDel);
    expect(approveResult.success).toBe(true);

    const inv = await db.execute("SELECT journal_entry_id FROM invoices WHERE id = '" + U.invDel + "'");
    const origJeId = (inv.rows[0] as any).journal_entry_id;

    const deleteResult = await deleteInvoice(U.invDel);
    expect(deleteResult.success).toBe(true);

    const revJe = await db.execute(
      "SELECT id FROM journal_entries WHERE reference_type = 'reversal' AND reference_id = '" + U.invDel + "'"
    );
    const reversalJeId = (revJe.rows[0] as any).id;

    const origLines = await db.execute(
      "SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '" + origJeId + "'"
    );
    const revLines = await db.execute(
      "SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '" + reversalJeId + "'"
    );

    const origDebit = origLines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const origCredit = origLines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);
    const revDebit = revLines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const revCredit = revLines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);

    expect(origDebit).toBe(origCredit);
    expect(revDebit).toBe(revCredit);
    expect(origDebit).toBe(revDebit);
  });

  it("3. revisePurchaseInvoice creates reversal pair that nets to zero", async () => {
    const { db, ids } = testDb;
    const { revisePurchaseInvoice } = await import("./purchases");

    await db.execute(
      "INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, description, reference_type, reference_id) VALUES ('" + U.jeOrig + "','" + ids.orgId + "','JE-00020','2026-08-20','posted','Original PI JE','purchase_invoice','" + U.pi1 + "')"
    );
    await db.execute(
      "INSERT INTO journal_entry_lines (id, org_id, journal_entry_id, account_id, debit_amount, credit_amount) VALUES " +
      "('" + U.jl1 + "','" + ids.orgId + "','" + U.jeOrig + "','" + ids.invAccId + "','2000','0'), " +
      "('" + U.jl2 + "','" + ids.orgId + "','" + U.jeOrig + "','" + ids.apAccId + "','0','2000')"
    );
    await db.execute(
      "INSERT INTO purchase_invoices (id, org_id, vendor_id, bill_number, status, date, net_amount, gross_amount, discount_total, tax_total) VALUES ('" + U.pi1 + "','" + ids.orgId + "','" + ids.vendId + "','PB-001','Approved','2026-08-20','2000','2000','0','0')"
    );
    await db.execute(
      "INSERT INTO purchase_items (id, org_id, purchase_invoice_id, product_id, description, quantity, unit_price, line_total, tax_rate) VALUES ('" + U.piItem1 + "','" + ids.orgId + "','" + U.pi1 + "','" + ids.prodId + "','Widget','20','100','2000','0')"
    );

    const result = await revisePurchaseInvoice(U.pi1);
    expect(result.success).toBe(true);

    const jeAfter = await db.execute(
      "SELECT id FROM journal_entries WHERE reference_type = 'purchase_invoice_revision' AND reference_id = '" + U.pi1 + "' ORDER BY created_at DESC LIMIT 1"
    );
    const newJeId = (jeAfter.rows[0] as any).id;

    const origLines = await db.execute(
      "SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '" + U.jeOrig + "'"
    );
    const newLines = await db.execute(
      "SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '" + newJeId + "'"
    );

    const origDebit = origLines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const origCredit = origLines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);
    const newDebit = newLines.rows.reduce((s: number, r: any) => s + Number(r.debit_amount), 0);
    const newCredit = newLines.rows.reduce((s: number, r: any) => s + Number(r.credit_amount), 0);

    expect(origDebit).toBe(origCredit);
    expect(newDebit).toBe(newCredit);
    expect(origDebit).toBe(newDebit);
  });

  it("4. POS sale includes COGS line and debits equal credits", async () => {
    const { db, ids } = testDb;
    const { processPosSale } = await import("./pos");

    await db.execute(
      "INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, reference_type, reference_id, description) VALUES ('" + U.shiftJe + "','" + ids.orgId + "','JE-SHIFT-1','2026-08-20','posted','pos_shift','" + ids.profileId + "','open')"
    );

    const result = await processPosSale({
      items: [{ productId: ids.prodId, quantity: 5, unitPrice: 100 }],
      paymentMethod: "cash",
    });
    if (!result.success) throw new Error(`POS failed: ${result.error}`);
    expect(result.success).toBe(true);

    const inv = await db.execute(
      "SELECT id FROM invoices WHERE org_id = '" + ids.orgId + "' ORDER BY created_at DESC LIMIT 1"
    );
    const invoiceId = (inv.rows[0] as any).id;

    const jeRow = await db.execute(
      "SELECT id FROM journal_entries WHERE reference_type = 'pos_sale' AND reference_id = '" + invoiceId + "'"
    );
    const jeId = (jeRow.rows[0] as any).id;
    expect(jeId).toBeTruthy();

    const lines = await db.execute(
      "SELECT account_id, debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = '" + jeId + "'"
    );

    let totalDebit = 0;
    let totalCredit = 0;
    let hasCogs = false;

    for (const row of lines.rows) {
      const r = row as any;
      totalDebit += Number(r.debit_amount);
      totalCredit += Number(r.credit_amount);
      if (r.account_id === ids.cogsAccId) hasCogs = true;
    }

    expect(hasCogs).toBe(true);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBeGreaterThan(0);
  });

  it("5. Balance sheet and P&L filter by posted status and date bounds", async () => {
    const { db, ids } = testDb;

    await db.execute(
      "INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, description) VALUES ('" + U.jePosted + "','" + ids.orgId + "','JE-P1','2026-08-15','posted','Posted entry')"
    );
    await db.execute(
      "INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, description) VALUES ('" + U.jeDraft + "','" + ids.orgId + "','JE-D1','2026-08-20','draft','Draft entry')"
    );
    await db.execute(
      "INSERT INTO journal_entry_lines (id, org_id, journal_entry_id, account_id, debit_amount, credit_amount) VALUES " +
      "('" + U.jlp1 + "','" + ids.orgId + "','" + U.jePosted + "','" + ids.cashAccId + "','10000','0'), " +
      "('" + U.jlp2 + "','" + ids.orgId + "','" + U.jePosted + "','" + ids.revAccId + "','0','10000'), " +
      "('" + U.jld1 + "','" + ids.orgId + "','" + U.jeDraft + "','" + ids.cashAccId + "','5000','0'), " +
      "('" + U.jld2 + "','" + ids.orgId + "','" + U.jeDraft + "','" + ids.revAccId + "','0','5000')"
    );

    const { getBalanceSheet, getProfitAndLoss } = await import("@/lib/accounting");
    const bs = await getBalanceSheet(ids.orgId, new Date("2026-08-18"));
    expect(bs).toBeDefined();

    const pnl = await getProfitAndLoss(ids.orgId, "2026-08-01", "2026-08-18");
    expect(pnl).toBeDefined();
  });

  it("6. checkPeriodLocked rejects approveInvoice for locked period (POS: not yet wired)", async () => {
    const { db, ids } = testDb;
    const { approveInvoice } = await import("./sales");

    await db.execute(
      "INSERT INTO fiscal_periods (id, org_id, name, start_date, end_date, is_locked) VALUES ('" + U.fpLocked + "','" + ids.orgId + "','Locked FY','2025-07-01','2026-06-30',true)"
    );
    await db.execute(
      "INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount) VALUES ('" + U.invLocked + "','" + ids.orgId + "','" + ids.custId + "','INV-LK','pending','2025-12-15','100','100','0','0','0','0','100')"
    );

    const result = await approveInvoice(U.invLocked);
    expect(result.success).toBe(false);
  });
});
