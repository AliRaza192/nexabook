import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb, type TestDbHandle, type SqlRow } from "@/__tests__/test-db";
import { NextRequest } from "next/server";

vi.setConfig({ hookTimeout: 60000, testTimeout: 60000 });

let testDb: Awaited<ReturnType<typeof createTestDb>>;

const dbRef: { current: TestDbHandle["db"] | null } = { current: null };
vi.mock("@/db", () => ({ get db() { return dbRef.current; } }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_123" }),
  currentUser: vi.fn(),
}));

vi.mock("@/lib/fbr-api", () => ({ submitInvoiceToFBR: vi.fn() }));

vi.mock("@/lib/actions/shared", () => ({
  getCurrentOrgId: vi.fn(),
  requireRole: vi.fn().mockResolvedValue(undefined),
  generateDocumentNumber: vi.fn(),
  generateJournalEntryNumber: vi.fn(),
}));

vi.mock("@/lib/actions/fiscal-periods", () => ({
  checkPeriodLocked: vi.fn().mockResolvedValue(false),
}));

const U = {
  salaryExpense: "b1000001-0000-0000-0000-000000000001",
  salariesPayable: "b1000002-0000-0000-0000-000000000001",
  eobiPayable: "b1000003-0000-0000-0000-000000000001",
  eobiExpense: "b1000004-0000-0000-0000-000000000001",
  incomeTaxPayable: "b1000005-0000-0000-0000-000000000001",
  pfPayable: "b1000006-0000-0000-0000-000000000001",
  posCash: "b1000007-0000-0000-0000-000000000001",
  warehouse: "b1000008-0000-0000-0000-000000000001",
  warehouseStock: "b1000009-0000-0000-0000-000000000001",
  employee: "b100000a-0000-0000-0000-000000000001",
  leaveType: "b100000b-0000-0000-0000-000000000001",
  leaveA1: "b100000c-0000-0000-0000-000000000001",
  leaveA2: "b100000d-0000-0000-0000-000000000001",
  leaveB: "b100000e-0000-0000-0000-000000000001",
  orgB: "b100000f-0000-0000-0000-000000000001",
  custB: "b1000010-0000-0000-0000-000000000001",
  empB: "b1000011-0000-0000-0000-000000000001",
  leaveTypeB: "b1000012-0000-0000-0000-000000000001",
  portalCust: "b1000013-0000-0000-0000-000000000001",
  portalInv: "b1000014-0000-0000-0000-000000000001",
  otherInv: "b1000015-0000-0000-0000-000000000001",
  srInvoice: "b1000016-0000-0000-0000-000000000001",
  srItem: "b1000017-0000-0000-0000-000000000001",
  salesReturn: "b1000018-0000-0000-0000-000000000001",
  srItemLine: "b100001a-0000-0000-0000-000000000001",
  srBatch: "b100001b-0000-0000-0000-000000000001",
  invForPayroll: "b1000019-0000-0000-0000-000000000001",
};

async function sqlRows(query: string): Promise<SqlRow[]> {
  const res = await testDb.db.execute(query);
  return res.rows as SqlRow[];
}

async function firstRow(query: string): Promise<SqlRow> {
  const rows = await sqlRows(query);
  return rows[0];
}

async function journalLines(jeId: string): Promise<SqlRow[]> {
  return sqlRows(
    `SELECT l.debit_amount, l.credit_amount, a.sub_type, a.code
     FROM journal_entry_lines l
     JOIN chart_of_accounts a ON a.id = l.account_id
     WHERE l.journal_entry_id = '${jeId}'`
  );
}

function totals(lines: SqlRow[]) {
  const debit = lines.reduce((s, l) => s + Number(l.debit_amount), 0);
  const credit = lines.reduce((s, l) => s + Number(l.credit_amount), 0);
  return { debit, credit };
}

async function insertPayrollAccounts(orgId: string) {
  await testDb.db.execute(
    `INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type) VALUES
     ('${U.salaryExpense}','${orgId}','5100','Salaries & Wages','expense','salary_expense'),
     ('${U.salariesPayable}','${orgId}','2410','Accrued Salaries','liability','salaries_payable'),
     ('${U.eobiPayable}','${orgId}','2800','EOBI Payable','liability','eobi_payable'),
     ('${U.eobiExpense}','${orgId}','5115','EOBI Expense','expense','eobi_expense'),
     ('${U.incomeTaxPayable}','${orgId}','2210','Income Tax Withheld','liability','income_tax_payable'),
     ('${U.pfPayable}','${orgId}','2430','Provident Fund Payable','liability','pf_payable'),
     ('${U.posCash}','${orgId}','1040','POS Cash','asset','pos_cash')`
  );
}

let docSeq = 0;
let jeSeq = 0;

beforeEach(async () => {
  vi.resetModules();
  testDb = await createTestDb();
  dbRef.current = testDb.db;
  docSeq = 0;
  jeSeq = 0;

  const shared = await import("@/lib/actions/shared");
  vi.mocked(shared.getCurrentOrgId).mockResolvedValue(testDb.ids.orgId);
  vi.mocked(shared.requireRole).mockResolvedValue(undefined);
  vi.mocked(shared.generateDocumentNumber).mockImplementation(
    async () => `INV-TEST-${String(++docSeq).padStart(5, "0")}`
  );
  vi.mocked(shared.generateJournalEntryNumber).mockImplementation(
    async () => `JE-${String(++jeSeq).padStart(5, "0")}`
  );
  vi.mocked((await import("@/lib/actions/fiscal-periods")).checkPeriodLocked).mockResolvedValue(
    false
  );

  await insertPayrollAccounts(testDb.ids.orgId);
});

afterEach(async () => {
  await testDb?.close();
});

describe("W7 financial-integrity integration tests", () => {
  it("1. invoice creation recomputes client-supplied totals from line items", async () => {
    const { db, ids } = testDb;
    const { createInvoice } = await import("@/lib/actions/sales");

    const result = await createInvoice({
      customerId: ids.custId,
      invoiceNumber: "IGNORED-BY-SERVER",
      issueDate: new Date("2026-07-01"),
      grossAmount: "999999.00",
      discountAmount: "50.00",
      taxAmount: "999999.00",
      shippingCharges: "0",
      roundOff: "0",
      netAmount: "999999.00",
      receivedAmount: "100.00",
      items: [
        {
          productId: ids.prodId,
          description: "Widget",
          quantity: "10",
          unitPrice: "100",
          discountPercentage: "0",
          taxRate: "10",
          lineTotal: "1000",
        },
      ],
    });

    expect(result.success).toBe(true);

    const inv = await firstRow(
      `SELECT gross_amount, discount_amount, tax_amount, net_amount, balance_amount, status
       FROM invoices WHERE org_id = '${ids.orgId}'`
    );

    expect(Number(inv.gross_amount)).toBe(1000);
    expect(Number(inv.tax_amount)).toBe(100);
    expect(Number(inv.net_amount)).toBe(1050);
    expect(Number(inv.balance_amount)).toBe(950);
    expect(inv.status).toBe("draft");
    expect(String(inv.gross_amount)).not.toBe("999999.00");
    expect(String(inv.net_amount)).not.toBe("999999.00");
  });

  it("2. invoice approval posts a balanced journal entry and decrements stock", async () => {
    const { db, ids } = testDb;
    const { createInvoice, approveInvoice } = await import("@/lib/actions/sales");

    const stockBefore = Number(
      (await firstRow(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`)).current_stock
    );

    const created = await createInvoice({
      customerId: ids.custId,
      invoiceNumber: "IGNORED-BY-SERVER",
      issueDate: new Date("2026-07-01"),
      grossAmount: "1000",
      discountAmount: "0",
      taxAmount: "100",
      shippingCharges: "0",
      roundOff: "0",
      netAmount: "1100",
      receivedAmount: "0",
      items: [
        {
          productId: ids.prodId,
          description: "Widget",
          quantity: "10",
          unitPrice: "100",
          discountPercentage: "0",
          taxRate: "10",
          lineTotal: "1000",
        },
      ],
    });
    expect(created.success).toBe(true);

    const invRow = await firstRow(
      `SELECT id FROM invoices WHERE org_id = '${ids.orgId}' ORDER BY created_at DESC LIMIT 1`
    );

    const approveResult = await approveInvoice(invRow.id as string);
    expect(approveResult.success).toBe(true);

    const approved = await firstRow(
      `SELECT status, journal_entry_id FROM invoices WHERE id = '${invRow.id}'`
    );
    expect(approved.status).toBe("approved");
    expect(approved.journal_entry_id).toBeTruthy();

    const lines = await journalLines(approved.journal_entry_id as string);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const { debit, credit } = totals(lines);
    expect(debit).toBeCloseTo(credit, 2);
    expect(debit).toBeCloseTo(1700, 2);

    const stockAfter = Number(
      (await firstRow(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`)).current_stock
    );
    expect(stockAfter).toBe(stockBefore - 10);

    const je = await firstRow(
      `SELECT status, reference_type FROM journal_entries WHERE id = '${approved.journal_entry_id}'`
    );
    expect(je.status).toBe("posted");
    expect(je.reference_type).toBe("invoice");
  });

  it("3. payroll JE balances with PF, EOBI and unpaid-leave lines", async () => {
    const { db, ids } = testDb;
    await db.execute(
      `INSERT INTO employees (id, org_id, employee_code, full_name, joining_date, basic_salary, status)
       VALUES ('${U.employee}','${ids.orgId}','EMP-W7','W7 Employee','2026-01-01','150000','Active')`
    );

    const { generateAndApprovePayroll } = await import("@/lib/actions/hr-payroll");
    const result = await generateAndApprovePayroll(7, 2026, [
      {
        employeeId: U.employee,
        employeeName: "W7 Employee",
        employeeCode: "EMP-W7",
        designation: "Engineer",
        department: "Engineering",
        cnic: "35202-1234567-1",
        bankName: "HBL",
        accountNumber: "1234",
        basicSalary: 100000,
        houseRent: 30000,
        medicalAllowance: 15000,
        conveyanceAllowance: 5000,
        otherAllowances: 0,
        overtimePay: 0,
        bonus: 0,
        totalEarnings: 150000,
        eobiDeduction: 3700,
        incomeTax: 12000,
        providentFund: 6000,
        otherDeductions: 0,
        unpaidLeaveDeduction: 5000,
        totalDeductions: 26700,
        netSalary: 123300,
        presentDays: 26,
        absentDays: 0,
        leaveDays: 0,
        unpaidLeaveDays: 1,
        totalWorkingDays: 26,
      },
    ]);

    expect(result.success).toBe(true);

    const run = await firstRow(
      `SELECT id, status, journal_entry_id FROM payroll_runs WHERE org_id = '${ids.orgId}'`
    );
    expect(run.status).toBe("Posted");
    expect(run.journal_entry_id).toBeTruthy();

    const lines = await journalLines(run.journal_entry_id as string);
    const { debit, credit } = totals(lines);
    expect(debit).toBeCloseTo(credit, 2);
    expect(debit).toBeCloseTo(148700, 2);

    const byType = Object.fromEntries(lines.map((l) => [l.sub_type, l]));
    expect(Number(byType.salary_expense.debit_amount)).toBe(145000);
    expect(Number(byType.salaries_payable.credit_amount)).toBe(123300);
    expect(Number(byType.eobi_payable.credit_amount)).toBe(7400);
    expect(Number(byType.eobi_expense.debit_amount)).toBe(3700);
    expect(Number(byType.income_tax_payable.credit_amount)).toBe(12000);
    expect(Number(byType.pf_payable.credit_amount)).toBe(6000);
    expect(Number(byType.salaries_payable.credit_amount)).toBeGreaterThan(0);
  });

  it("4. markPayslipPaid creates a balanced payroll-payment JE and flips isPaid", async () => {
    const { db, ids } = testDb;
    await db.execute(
      `INSERT INTO employees (id, org_id, employee_code, full_name, joining_date, basic_salary, status)
       VALUES ('${U.employee}','${ids.orgId}','EMP-W7','W7 Employee','2026-01-01','150000','Active')`
    );

    const { generateAndApprovePayroll, markPayslipPaid } = await import("@/lib/actions/hr-payroll");
    const payroll = await generateAndApprovePayroll(8, 2026, [
      {
        employeeId: U.employee,
        employeeName: "W7 Employee",
        employeeCode: "EMP-W7",
        designation: "Engineer",
        department: "Engineering",
        cnic: "35202-1234567-1",
        bankName: "HBL",
        accountNumber: "1234",
        basicSalary: 100000,
        houseRent: 30000,
        medicalAllowance: 15000,
        conveyanceAllowance: 5000,
        otherAllowances: 0,
        overtimePay: 0,
        bonus: 0,
        totalEarnings: 150000,
        eobiDeduction: 0,
        incomeTax: 0,
        providentFund: 0,
        otherDeductions: 0,
        unpaidLeaveDeduction: 0,
        totalDeductions: 0,
        netSalary: 150000,
        presentDays: 26,
        absentDays: 0,
        leaveDays: 0,
        unpaidLeaveDays: 0,
        totalWorkingDays: 26,
      },
    ]);
    expect(payroll.success).toBe(true);

    const payslip = await firstRow(
      `SELECT id, net_salary, is_paid FROM payslips WHERE org_id = '${ids.orgId}'`
    );
    expect(payslip.is_paid).toBe(false);

    const paid = await markPayslipPaid(payslip.id as string, "bank");
    expect(paid.success).toBe(true);

    const after = await firstRow(
      `SELECT is_paid, payment_method FROM payslips WHERE id = '${payslip.id}'`
    );
    expect(after.is_paid).toBe(true);
    expect(after.payment_method).toBe("bank");

    const je = await firstRow(
      `SELECT id FROM journal_entries
       WHERE org_id = '${ids.orgId}' AND reference_type = 'payroll_payment'
         AND reference_id = '${payslip.id}'`
    );
    expect(je).toBeTruthy();

    const lines = await journalLines(je.id as string);
    expect(lines.length).toBe(2);
    const { debit, credit } = totals(lines);
    expect(debit).toBeCloseTo(credit, 2);
    expect(debit).toBeCloseTo(Number(payslip.net_salary), 2);

    const byType = Object.fromEntries(lines.map((l) => [l.sub_type, l]));
    expect(Number(byType.salaries_payable.debit_amount)).toBeCloseTo(
      Number(payslip.net_salary),
      2
    );
    expect(Number(byType.cash.credit_amount)).toBeCloseTo(Number(payslip.net_salary), 2);
  });

  it("5. POS shift opening credits pos_cash (not equity) and closing posts a real balanced JE", async () => {
    const { db, ids } = testDb;
    const { startShift, endShift, generatePOSReport } = await import("@/lib/actions/pos");

    const open = await startShift(5000);
    expect(open.success).toBe(true);

    const shift = await firstRow(
      `SELECT id, status, opening_journal_entry_id FROM pos_shifts WHERE org_id = '${ids.orgId}'`
    );
    expect(shift.status).toBe("open");
    expect(shift.opening_journal_entry_id).toBeTruthy();

    const openLines = await journalLines(shift.opening_journal_entry_id as string);
    const openTotals = totals(openLines);
    expect(openTotals.debit).toBeCloseTo(openTotals.credit, 2);
    expect(openTotals.debit).toBeCloseTo(5000, 2);

    const openByType = Object.fromEntries(openLines.map((l) => [l.sub_type, l]));
    expect(openByType.cash).toBeTruthy();
    expect(openByType.pos_cash).toBeTruthy();
    expect(Number(openByType.cash.debit_amount)).toBe(5000);
    expect(Number(openByType.pos_cash.credit_amount)).toBe(5000);

    const equityLines = openLines.filter((l) =>
      ["opening_balance_equity", "capital"].includes(l.sub_type as string)
    );
    expect(equityLines.length).toBe(0);

    const closed = await endShift(5200, 5000);
    expect(closed.success).toBe(true);

    const afterClose = await firstRow(
      `SELECT status, closing_journal_entry_id FROM pos_shifts WHERE id = '${shift.id}'`
    );
    expect(afterClose.status).toBe("closed");
    expect(afterClose.closing_journal_entry_id).toBeTruthy();

    const closeLines = await journalLines(afterClose.closing_journal_entry_id as string);
    const closeTotals = totals(closeLines);
    expect(closeTotals.debit).toBeCloseTo(closeTotals.credit, 2);
    expect(closeTotals.debit).toBeCloseTo(5200, 2);

    const closeJe = await firstRow(
      `SELECT status, reference_type FROM journal_entries WHERE id = '${afterClose.closing_journal_entry_id}'`
    );
    expect(closeJe.status).toBe("posted");
    expect(closeJe.reference_type).toBe("pos_shift_closing");

    const zReport = await generatePOSReport(shift.id as string, "Z");
    expect(zReport.success).toBe(false);
    expect(zReport.error).toContain("already closed");
  });

  it("6. leave approve/reject are scoped to the caller's organization", async () => {
    const { db, ids } = testDb;
    await db.execute(
      `INSERT INTO employees (id, org_id, employee_code, full_name, joining_date, basic_salary, status)
       VALUES ('${U.employee}','${ids.orgId}','EMP-W7','W7 Employee','2026-01-01','100000','Active')`
    );
    await db.execute(
      `INSERT INTO leave_types (id, org_id, name, days_allowed)
       VALUES ('${U.leaveType}','${ids.orgId}','Annual',15)`
    );
    await db.execute(
      `INSERT INTO leave_applications (id, org_id, employee_id, leave_type_id, from_date, to_date, total_days, reason, status, applied_by)
       VALUES
       ('${U.leaveA1}','${ids.orgId}','${U.employee}','${U.leaveType}','2026-08-01','2026-08-02',2,'Vacation','pending','user_123'),
       ('${U.leaveA2}','${ids.orgId}','${U.employee}','${U.leaveType}','2026-08-05','2026-08-06',2,'Vacation','pending','user_123')`
    );

    await db.execute(`INSERT INTO organizations (id, name, slug) VALUES ('${U.orgB}','Other Co','other-co-fin')`);
    await db.execute(
      `INSERT INTO employees (id, org_id, employee_code, full_name, joining_date, basic_salary, status)
       VALUES ('${U.empB}','${U.orgB}','EMP-B','B Employee','2026-01-01','100000','Active')`
    );
    await db.execute(
      `INSERT INTO leave_types (id, org_id, name, days_allowed)
       VALUES ('${U.leaveTypeB}','${U.orgB}','Annual',15)`
    );
    await db.execute(
      `INSERT INTO leave_applications (id, org_id, employee_id, leave_type_id, from_date, to_date, total_days, reason, status, applied_by)
       VALUES ('${U.leaveB}','${U.orgB}','${U.empB}','${U.leaveTypeB}','2026-08-01','2026-08-02',2,'Vacation','pending','someone')`
    );

    const { approveLeaveApplication, rejectLeaveApplication } = await import(
      "@/lib/actions/leaves"
    );

    const crossOrg = await approveLeaveApplication(U.leaveB);
    expect(crossOrg.success).toBe(false);
    expect(crossOrg.error).toContain("not found");

    const leaveBAfter = await firstRow(
      `SELECT status, reviewed_by FROM leave_applications WHERE id = '${U.leaveB}'`
    );
    expect(leaveBAfter.status).toBe("pending");
    expect(leaveBAfter.reviewed_by).toBeNull();

    const inOrg = await approveLeaveApplication(U.leaveA1);
    expect(inOrg.success).toBe(true);
    const leaveA1After = await firstRow(
      `SELECT status, reviewed_by FROM leave_applications WHERE id = '${U.leaveA1}'`
    );
    expect(leaveA1After.status).toBe("approved");
    expect(leaveA1After.reviewed_by).toBe("user_123");

    const rejected = await rejectLeaveApplication(U.leaveA2, "Not urgent");
    expect(rejected.success).toBe(true);
    const leaveA2After = await firstRow(
      `SELECT status, rejection_reason FROM leave_applications WHERE id = '${U.leaveA2}'`
    );
    expect(leaveA2After.status).toBe("rejected");
    expect(leaveA2After.rejection_reason).toBe("Not urgent");

    const crossOrgReject = await rejectLeaveApplication(U.leaveB, "nope");
    expect(crossOrgReject.success).toBe(false);
    const leaveBFinal = await firstRow(
      `SELECT status FROM leave_applications WHERE id = '${U.leaveB}'`
    );
    expect(leaveBFinal.status).toBe("pending");
  });

  it("7. portal payment rejects amounts above the invoice balance and non-payable invoices", async () => {
    const { db, ids } = testDb;
    await db.execute(
      `INSERT INTO customers (id, org_id, name, portal_token)
       VALUES ('${U.portalCust}','${ids.orgId}','Portal Customer','portal-token-w7')`
    );
    await db.execute(
      `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount)
       VALUES
       ('${U.portalInv}','${ids.orgId}','${U.portalCust}','INV-PORTAL-W7','pending','2026-07-01','1000','1000','0','0','0','0','1000'),
       ('${U.otherInv}','${ids.orgId}','${ids.custId}','INV-OTHER-W7','paid','2026-07-01','500','500','0','0','0','0','0')`
    );

    const { POST } = await import("@/app/api/portal-pay/route");

    const post = (body: unknown) =>
      new NextRequest("http://localhost/api/portal-pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

    const tooHigh = await POST(
      post({ token: "portal-token-w7", invoiceId: U.portalInv, amount: 1500, gateway: "jazzcash" })
    );
    expect(tooHigh.status).toBe(400);
    expect((await tooHigh.json()).error).toContain("Invalid amount");

    const zero = await POST(
      post({ token: "portal-token-w7", invoiceId: U.portalInv, amount: 0, gateway: "jazzcash" })
    );
    expect(zero.status).toBe(400);

    const wrongInvoice = await POST(
      post({ token: "portal-token-w7", invoiceId: U.otherInv, amount: 100, gateway: "jazzcash" })
    );
    expect(wrongInvoice.status).toBe(400);
    expect((await wrongInvoice.json()).error).toContain("not payable");

    const badGateway = await POST(
      post({ token: "portal-token-w7", invoiceId: U.portalInv, amount: 100, gateway: "paypal" })
    );
    expect(badGateway.status).toBe(400);

    const badToken = await POST(
      post({ token: "nope", invoiceId: U.portalInv, amount: 100, gateway: "jazzcash" })
    );
    expect(badToken.status).toBe(401);

    const pendingTxns = await sqlRows(
      `SELECT id FROM payment_transactions WHERE org_id = '${ids.orgId}'`
    );
    expect(pendingTxns.length).toBe(0);
  });

  it("8. approving a sales return restores product, warehouse and batch stock and posts a balanced JE", async () => {
    const { db, ids } = testDb;
    await db.execute(
      `INSERT INTO warehouses (id, org_id, name, is_default)
       VALUES ('${U.warehouse}','${ids.orgId}','Main Warehouse',true)`
    );
    await db.execute(
      `INSERT INTO warehouse_stock (id, org_id, warehouse_id, product_id, quantity)
       VALUES ('${U.warehouseStock}','${ids.orgId}','${U.warehouse}','${ids.prodId}','50')`
    );
    await db.execute(
      `INSERT INTO invoices (id, org_id, customer_id, warehouse_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount)
       VALUES ('${U.srInvoice}','${ids.orgId}','${ids.custId}','${U.warehouse}','INV-SR-W7','approved','2026-07-01','1000','1000','0','0','0','0','1000')`
    );
    await db.execute(
      `INSERT INTO product_batches (id, org_id, product_id, warehouse_id, batch_no, initial_qty, current_qty)
       VALUES ('${U.srBatch}','${ids.orgId}','${ids.prodId}','${U.warehouse}','BATCH-W7','100','90')`
    );
    await db.execute(
      `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, batch_id, description, quantity, unit_price, line_total, tax_rate, unit_cost)
       VALUES ('${U.srItem}','${ids.orgId}','${U.srInvoice}','${ids.prodId}','${U.srBatch}','Widget','10','100','1000','0','60')`
    );
    await db.execute(
      `INSERT INTO sales_returns (id, org_id, return_number, invoice_id, customer_id, return_date, reason, gross_amount, discount_amount, tax_amount, net_amount, refund_amount, status)
       VALUES ('${U.salesReturn}','${ids.orgId}','SR-W7-001','${U.srInvoice}','${ids.custId}','2026-07-15','defective','500','0','0','500','500','pending')`
    );
    await db.execute(
      `INSERT INTO sales_return_items (id, org_id, sales_return_id, product_id, description, quantity, unit_price, line_total)
       VALUES ('${U.srItemLine}','${ids.orgId}','${U.salesReturn}','${ids.prodId}','Widget','2','250','500')`
    );

    const productBefore = Number(
      (await firstRow(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`)).current_stock
    );
    const warehouseBefore = Number(
      (await firstRow(
        `SELECT quantity FROM warehouse_stock WHERE id = '${U.warehouseStock}'`
      )).quantity
    );
    const batchBefore = Number(
      (await firstRow(
        `SELECT current_qty FROM product_batches WHERE id = '${U.srBatch}'`
      )).current_qty
    );
    expect(productBefore).toBe(100);
    expect(warehouseBefore).toBe(50);
    expect(batchBefore).toBe(90);

    const { approveSalesReturn } = await import("@/lib/actions/sales");
    const result = await approveSalesReturn(U.salesReturn);
    expect(result.success).toBe(true);

    const productAfter = Number(
      (await firstRow(`SELECT current_stock FROM products WHERE id = '${ids.prodId}'`)).current_stock
    );
    const warehouseAfter = Number(
      (await firstRow(
        `SELECT quantity FROM warehouse_stock WHERE id = '${U.warehouseStock}'`
      )).quantity
    );
    const batchAfter = Number(
      (await firstRow(
        `SELECT current_qty FROM product_batches WHERE id = '${U.srBatch}'`
      )).current_qty
    );
    expect(productAfter).toBe(productBefore + 2);
    expect(warehouseAfter).toBe(warehouseBefore + 2);
    expect(batchAfter).toBe(batchBefore + 2);

    const inv = await firstRow(
      `SELECT balance_amount, status FROM invoices WHERE id = '${U.srInvoice}'`
    );
    expect(Number(inv.balance_amount)).toBe(500);
    expect(inv.status).toBe("partial");

    const je = await firstRow(
      `SELECT id FROM journal_entries
       WHERE org_id = '${ids.orgId}' AND reference_type = 'sales_return'
         AND reference_id = '${U.salesReturn}'`
    );
    expect(je).toBeTruthy();

    const lines = await journalLines(je.id as string);
    const { debit, credit } = totals(lines);
    expect(debit).toBeCloseTo(credit, 2);
    expect(debit).toBeCloseTo(620, 2);

    const sr = await firstRow(
      `SELECT status FROM sales_returns WHERE id = '${U.salesReturn}'`
    );
    expect(sr.status).toBe("approved");
  });
});
