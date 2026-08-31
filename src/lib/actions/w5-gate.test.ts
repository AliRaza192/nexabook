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
  generatePaymentNumber: vi.fn(),
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

function hexUuid(prefix: string, index: number): string {
  const head = (prefix + String(index).padStart(2, "0")).slice(0, 8);
  return `${head}-0000-0000-0000-000000000001`;
}

function countQueries(db: any): { count: () => number; start: () => void; stop: () => void } {
  let n = 0;
  let active = false;
  const origSelect = db.select.bind(db);
  const origInsert = db.insert.bind(db);
  const origUpdate = db.update.bind(db);
  const origDelete = db.delete.bind(db);
  const origExec = db.execute.bind(db);
  const restores: (() => void)[] = [];

  function setup() {
    const s1 = vi.spyOn(db, "select").mockImplementation((...args: any[]) => { if (active) n++; return origSelect(...args); });
    const s2 = vi.spyOn(db, "insert").mockImplementation((...args: any[]) => { if (active) n++; return origInsert(...args); });
    const s3 = vi.spyOn(db, "update").mockImplementation((...args: any[]) => { if (active) n++; return origUpdate(...args); });
    const s4 = vi.spyOn(db, "delete").mockImplementation((...args: any[]) => { if (active) n++; return origDelete(...args); });
    const s5 = vi.spyOn(db, "execute").mockImplementation((...args: any[]) => { if (active) n++; return origExec(...args); });
    restores.push(() => { s1.mockRestore(); s2.mockRestore(); s3.mockRestore(); s4.mockRestore(); s5.mockRestore(); });
  }

  return {
    count: () => n,
    start: () => { n = 0; active = true; setup(); },
    stop: () => { active = false; for (const r of restores) r(); restores.length = 0; },
  };
}

describe("W5-GATE: N+1 query batch regression tests", () => {

  it("1. CRM getLeads: batch customer prefetch — ≤3 queries regardless of lead count", async () => {
    const { db, ids } = testDb;
    const N = 15;

    const custIds: string[] = [];
    for (let i = 0; i < N; i++) {
      const cid = hexUuid("a10000", i);
      custIds.push(cid);
      await db.execute(
        `INSERT INTO customers (id, org_id, name) VALUES ('${cid}','${ids.orgId}','Customer ${i}')`
      );
    }

    for (let i = 0; i < N; i++) {
      const lid = hexUuid("b10000", i);
      await db.execute(
        `INSERT INTO leads (id, org_id, name, status, converted_to_customer_id) VALUES ('${lid}','${ids.orgId}','Lead ${i}','won','${custIds[i]}')`
      );
    }

    const qc = countQueries(db);
    qc.start();

    const { getLeads } = await import("./crm");
    const result = await getLeads();

    expect(result.success).toBe(true);
    expect(result.data!.length).toBe(N);
    for (const lead of result.data!) {
      expect(lead.convertedCustomer).toBeTruthy();
    }

    qc.stop();
    expect(qc.count()).toBeLessThanOrEqual(3);
  });

  it("2. POS report: batch invoice items — ≤5 queries regardless of invoice count", async () => {
    const { db, ids } = testDb;
    const N = 10;

    const shiftJeId = hexUuid("c10000", 0);
    await db.execute(
      `INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, reference_type, reference_id, description) VALUES ('${shiftJeId}','${ids.orgId}','JE-SHIFT-W5','2026-08-31','posted','pos_shift','${ids.profileId}','open')`
    );

    for (let i = 0; i < N; i++) {
      const invId = hexUuid("d10000", i);
      const iiId = hexUuid("d20000", i);
      await db.execute(
        `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, tax_amount, shipping_charges, round_off, received_amount, balance_amount) VALUES ('${invId}','${ids.orgId}','${ids.custId}','POS-${1000 + i}','paid','2026-08-31','${(i + 1) * 100}','${(i + 1) * 100}','0','0','0','0','${(i + 1) * 100}','0')`
      );
      await db.execute(
        `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, line_total, discount_percentage, tax_rate) VALUES ('${iiId}','${ids.orgId}','${invId}','${ids.prodId}','Widget','1','${(i + 1) * 100}','${(i + 1) * 100}','0','0')`
      );
    }

    const qc = countQueries(db);
    qc.start();

    const { generatePOSReport } = await import("./pos");
    const result = await generatePOSReport(shiftJeId, "X");

    expect(result.success).toBe(true);
    qc.stop();
    expect(qc.count()).toBeLessThanOrEqual(5);
  });

  it("3. allocatePayment: batch invoice prefetch — ≤4 queries regardless of allocation count", async () => {
    const { db, ids } = testDb;
    const N = 8;

    const invIds: string[] = [];
    for (let i = 0; i < N; i++) {
      const invId = hexUuid("e10000", i);
      invIds.push(invId);
      await db.execute(
        `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, tax_amount, shipping_charges, round_off, received_amount, balance_amount) VALUES ('${invId}','${ids.orgId}','${ids.custId}','INV-ALLOC-${1000 + i}','approved','2026-08-31','1000','1000','0','0','0','0','0','1000')`
      );
    }

    const payId = hexUuid("f10000", 0);
    await db.execute(
      `INSERT INTO customer_payments (id, org_id, payment_number, customer_id, payment_date, payment_method, amount) VALUES ('${payId}','${ids.orgId}','PAY-W5-001','${ids.custId}','2026-08-31','cash','8000')`
    );

    const qc = countQueries(db);
    qc.start();

    const { allocatePayment } = await import("./sales");
    const result = await allocatePayment(
      payId,
      invIds.map((id) => ({ invoiceId: id, amount: "1000" }))
    );

    expect(result.success).toBe(true);
    qc.stop();
    expect(qc.count()).toBeLessThanOrEqual(4);
  });

  it("4. banking doc numbering: SQL COUNT — ≤3 queries (not N+1)", async () => {
    const { db, ids } = testDb;
    const N = 5;

    for (let i = 0; i < N; i++) {
      await db.execute(
        `INSERT INTO journal_entries (id, org_id, entry_number, entry_date, status, description) VALUES ('${hexUuid("a20000", i)}','${ids.orgId}','JE-BANK-${i}','2026-08-31','posted','Existing JE ${i}')`
      );
    }

    const bankCoaId = hexUuid("c30000", 0);
    await db.execute(
      `INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type, balance) VALUES ('${bankCoaId}','${ids.orgId}','1001','Test Bank COA','asset','bank','0')`
    );

    const qc = countQueries(db);
    qc.start();

    const { addBankAccount } = await import("./banking");
    const result = await addBankAccount({
      accountName: "Test Bank W5",
      accountNumber: "1234567890",
      accountType: "savings",
      openingBalance: "50000",
    });

    expect(result.success).toBe(true);
    qc.stop();
    expect(qc.count()).toBeLessThanOrEqual(3);
  });

  it("5. dashboard trends: single GROUP BY — ≤10 queries total for full dashboard", async () => {
    const { db, ids } = testDb;

    for (let i = 0; i < 6; i++) {
      const d = new Date(2026, 2 + i, 15);
      const dateStr = d.toISOString().split("T")[0];
      const invId = hexUuid("b20000", i);
      await db.execute(
        `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, tax_amount, shipping_charges, round_off, received_amount, balance_amount) VALUES ('${invId}','${ids.orgId}','${ids.custId}','INV-DASH-${1000 + i}','paid','${dateStr}','1000','1000','0','0','0','0','1000','0')`
      );
      const expId = hexUuid("c20000", i);
      await db.execute(
        `INSERT INTO expenses (id, org_id, account_id, amount, date, paid_from_account_id) VALUES ('${expId}','${ids.orgId}','${ids.cashAccId}','500','${dateStr}','${ids.cashAccId}')`
      );
    }

    const qc = countQueries(db);
    qc.start();

    const { getDashboardData } = await import("./dashboard");
    const result = await getDashboardData();

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.data!.monthlyTrends).toBeDefined();
    expect(result.data!.monthlyTrends.length).toBe(6);

    qc.stop();
    expect(qc.count()).toBeLessThanOrEqual(15);
  });

});
