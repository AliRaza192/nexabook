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

vi.mock("@/lib/actions/fiscal-periods", () => ({
  checkPeriodLocked: vi.fn().mockResolvedValue(false),
}));

const validateJournalBalanceMock = vi.fn().mockReturnValue(true);
vi.mock("@/lib/accounting", () => ({
  validateJournalBalance: validateJournalBalanceMock,
}));

let jeCounter = 0;

beforeEach(async () => {
  vi.resetModules();
  testDb = await createTestDb();
  dbRef.current = testDb.db;
  jeCounter = 0;
  validateJournalBalanceMock.mockReturnValue(true);
  const shared = await import("@/lib/actions/shared");
  vi.mocked(shared.getCurrentOrgId).mockResolvedValue(testDb.ids.orgId);
  vi.mocked(shared.generateDocumentNumber).mockImplementation(async () => `INV-${String(++jeCounter).padStart(4, "0")}`);
  vi.mocked(shared.generateJournalEntryNumber).mockImplementation(async () => `JE-${String(++jeCounter).padStart(4, "0")}`);
});

afterEach(async () => {
  await testDb?.close();
});

describe("W3-GATE: Transaction atomicity regression tests", () => {

  it("1. createCustomerPayment rolls back completely on mid-transaction failure", async () => {
    const { db, ids } = testDb;
    validateJournalBalanceMock.mockReturnValue(false);

    const { createCustomerPayment } = await import("./sales");

    const result = await createCustomerPayment({
      customerId: ids.custId,
      paymentDate: "2026-08-22",
      paymentMethod: "cash",
      amount: "5000",
    });

    expect(result.success).toBe(false);

    const payments = await db.execute(`SELECT id FROM customer_payments WHERE org_id = '${ids.orgId}'`);
    expect(payments.rows.length).toBe(0);

    const jes = await db.execute(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}' AND reference_type = 'customer_payment'`);
    expect(jes.rows.length).toBe(0);
  });

  it("2. createVendorPayment rolls back completely on mid-transaction failure", async () => {
    const { db, ids } = testDb;
    validateJournalBalanceMock.mockReturnValue(false);

    const { createVendorPayment } = await import("./purchases");

    const result = await createVendorPayment({
      vendorId: ids.vendId,
      paymentDate: "2026-08-22",
      paymentMethod: "cash",
      amount: "3000",
    });

    expect(result.success).toBe(false);

    const payments = await db.execute(`SELECT id FROM vendor_payments WHERE org_id = '${ids.orgId}'`);
    expect(payments.rows.length).toBe(0);

    const jes = await db.execute(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}' AND reference_type = 'vendor_payment'`);
    expect(jes.rows.length).toBe(0);
  });

  it("3. addBankAccount rolls back bank + JE on mid-transaction failure", async () => {
    const { db, ids } = testDb;
    validateJournalBalanceMock.mockReturnValue(false);

    const { addBankAccount } = await import("./banking");

    const result = await addBankAccount({
      accountName: "Test Bank",
      accountNumber: "1234567890",
      accountType: "savings",
      openingBalance: "10000",
    });

    expect(result.success).toBe(false);

    const bankAccs = await db.execute(`SELECT id FROM bank_accounts WHERE org_id = '${ids.orgId}'`);
    expect(bankAccs.rows.length).toBe(0);

    const jes = await db.execute(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}' AND reference_type = 'bank_opening_balance'`);
    expect(jes.rows.length).toBe(0);
  });

  it("4. ACC-08: approveInvoice uses invoice.issueDate for JE entryDate", async () => {
    const { db, ids } = testDb;

    const invId = "acc08000-0000-0000-0000-000000000001";
    const itemId = "acc08000-0000-0000-0000-000000000002";
    const issueDate = "2026-03-15";

    await db.execute(
      `INSERT INTO invoices (id, org_id, customer_id, invoice_number, issue_date, due_date, net_amount, balance_amount, gross_amount, discount_amount, tax_amount, status) VALUES ('${invId}','${ids.orgId}','${ids.custId}','INV-ACC08','${issueDate}','${issueDate}','5000','5000','5000','0','0','pending')`
    );

    await db.execute(
      `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, line_total, discount_percentage, tax_rate) VALUES ('${itemId}','${ids.orgId}','${invId}','${ids.prodId}','Widget','10','500','5000','0','0')`
    );

    const { approveInvoice } = await import("./sales");
    const result = await approveInvoice(invId);
    expect(result.success).toBe(true);

    const jes = await db.execute(`SELECT entry_date FROM journal_entries WHERE reference_type = 'invoice' AND reference_id = '${invId}'`);
    expect(jes.rows.length).toBe(1);
    const jeDate = new Date((jes.rows[0] as any).entry_date);
    expect(jeDate.getFullYear()).toBe(2026);
    expect(jeDate.getMonth()).toBe(2);
    expect(jeDate.getDate()).toBe(15);
  });

  it("5. ACC-08: approvePurchaseInvoice uses purchase.date for JE entryDate", async () => {
    const { db, ids } = testDb;

    const piId = "acc08000-0000-0000-0000-000000000010";
    const piItemId = "acc08000-0000-0000-0000-000000000011";
    const purchaseDate = "2026-05-20";

    await db.execute(
      `INSERT INTO purchase_invoices (id, org_id, vendor_id, bill_number, date, net_amount, gross_amount, discount_total, tax_total, status) VALUES ('${piId}','${ids.orgId}','${ids.vendId}','BILL-ACC08','${purchaseDate}','3000','3000','0','0','Draft')`
    );

    await db.execute(
      `INSERT INTO purchase_items (id, org_id, purchase_invoice_id, product_id, description, quantity, unit_price, line_total, discount_percentage, tax_rate) VALUES ('${piItemId}','${ids.orgId}','${piId}','${ids.prodId}','Widget','5','600','3000','0','0')`
    );

    const { approvePurchaseInvoice } = await import("./purchases");
    const result = await approvePurchaseInvoice(piId);
    expect(result.success).toBe(true);

    const jes = await db.execute(`SELECT entry_date FROM journal_entries WHERE reference_type = 'purchase_invoice' AND reference_id = '${piId}'`);
    expect(jes.rows.length).toBe(1);
    const jeDate = new Date((jes.rows[0] as any).entry_date);
    expect(jeDate.getFullYear()).toBe(2026);
    expect(jeDate.getMonth()).toBe(4);
    expect(jeDate.getDate()).toBe(20);
  });

  it("6. Banking toFixed(2): addBankAccount writes balance with 2 decimal places", async () => {
    const { db, ids } = testDb;

    await db.execute(
      `INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type) VALUES ('a0000000-0000-0000-0000-000000000001','${ids.orgId}','1020','Bank','asset','bank')`
    );

    const { addBankAccount } = await import("./banking");

    const result = await addBankAccount({
      accountName: "HBL Savings",
      accountNumber: "9876543210",
      accountType: "savings",
      openingBalance: "50000.5",
    });

    expect(result.success).toBe(true);

    const bankRows = await db.execute(`SELECT current_balance, opening_balance FROM bank_accounts WHERE org_id = '${ids.orgId}'`);
    expect(bankRows.rows.length).toBe(1);
    const row = bankRows.rows[0] as any;
    expect(row.current_balance).toBe("50000.50");
    expect(row.opening_balance).toBe("50000.50");
  });

  it("7. createOrganization is fully atomic: org + profile + COA created together", async () => {
    const { db } = testDb;

    const shared = await import("@/lib/actions/shared");
    vi.mocked(shared.getCurrentOrgId).mockResolvedValue(null);

    const clerk = await import("@clerk/nextjs/server");
    vi.mocked(clerk.auth).mockResolvedValue({ userId: "user_999" } as any);
    vi.mocked(clerk.currentUser).mockResolvedValue({
      emailAddresses: [{ emailAddress: "new@org.com" }],
      fullName: "New User",
      username: "newuser",
    } as any);

    const { createOrganization } = await import("./onboarding");
    const result = await createOrganization({ name: "Atomic Test Org" });
    expect(result.success).toBe(true);

    const orgId = result.data?.orgId;
    expect(orgId).toBeTruthy();

    const orgRows = await db.execute(`SELECT id FROM organizations WHERE id = '${orgId}'`);
    expect(orgRows.rows.length).toBe(1);

    const profileRows = await db.execute(`SELECT id FROM profiles WHERE org_id = '${orgId}'`);
    expect(profileRows.rows.length).toBe(1);

    const coaRows = await db.execute(`SELECT id FROM chart_of_accounts WHERE org_id = '${orgId}'`);
    expect(coaRows.rows.length).toBe(11);
  });

});
