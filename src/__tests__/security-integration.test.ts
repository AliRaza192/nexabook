import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb, type TestDbHandle, type SqlRow } from "@/__tests__/test-db";

vi.setConfig({ hookTimeout: 60000, testTimeout: 60000 });

let testDb: Awaited<ReturnType<typeof createTestDb>>;

const dbRef: { current: TestDbHandle["db"] | null } = { current: null };
vi.mock("@/db", () => ({ get db() { return dbRef.current; } }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const clerk = vi.hoisted(() => ({ userId: "user_123" }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: clerk.userId })),
  currentUser: vi.fn(),
}));

const csrfState = vi.hoisted(() => ({ cookie: null as string | null, header: null as string | null }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "csrf-token" && csrfState.cookie ? { value: csrfState.cookie } : undefined,
    set: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: (name: string) => (name === "x-csrf-token" ? csrfState.header : null),
  })),
}));

const cryptoSpy = vi.hoisted(() => ({ calls: [] as Array<[Buffer, Buffer]> }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    timingSafeEqual: (a: Buffer, b: Buffer) => {
      cryptoSpy.calls.push([a, b]);
      return actual.timingSafeEqual(a, b);
    },
  };
});

// Numbering helpers must not touch the global db while a PGlite transaction
// is open (single-connection deadlock). Org scoping / RBAC under test here.
vi.mock("@/lib/actions/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/actions/shared")>();
  let seq = 0;
  return {
    ...actual,
    generateDocumentNumber: vi.fn(
      async (type: string) => `DOC-${type}-${String(++seq).padStart(5, "0")}`
    ),
    generateJournalEntryNumber: vi.fn(
      async () => `JE-${String(++seq).padStart(5, "0")}`
    ),
  };
});

const U = {
  orgB: "c2000001-0000-0000-0000-000000000001",
  custB: "c2000002-0000-0000-0000-000000000001",
  invB: "c2000003-0000-0000-0000-000000000001",
  invA: "c2000004-0000-0000-0000-000000000001",
  invAItem: "c2000005-0000-0000-0000-000000000001",
  empA: "c2000006-0000-0000-0000-000000000001",
  empB: "c2000007-0000-0000-0000-000000000001",
  leaveTypeA: "c2000008-0000-0000-0000-000000000001",
  leaveTypeB: "c2000009-0000-0000-0000-000000000001",
  leaveA: "c200000a-0000-0000-0000-000000000001",
  leaveB: "c200000b-0000-0000-0000-000000000001",
  payRunB: "c200000c-0000-0000-0000-000000000001",
  payRunA: "c200000d-0000-0000-0000-000000000001",
  payslipA: "c200000e-0000-0000-0000-000000000001",
  payslipB: "c200000f-0000-0000-0000-000000000001",
};

async function sqlRows(query: string): Promise<SqlRow[]> {
  const res = await testDb.db.execute(query);
  return res.rows as SqlRow[];
}

async function firstRow(query: string): Promise<SqlRow> {
  const rows = await sqlRows(query);
  return rows[0];
}

beforeEach(async () => {
  vi.resetModules();
  testDb = await createTestDb();
  dbRef.current = testDb.db;
  clerk.userId = "user_123";
  csrfState.cookie = null;
  csrfState.header = null;
  cryptoSpy.calls.length = 0;
});

afterEach(async () => {
  await testDb?.close();
});

async function seedCrossOrgData() {
  const { db, ids } = testDb;

  await db.execute(
    `INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type)
     VALUES ('c2000010-0000-0000-0000-000000000001','${ids.orgId}','2410','Accrued Salaries','liability','salaries_payable')`
  );
  await db.execute(
    `INSERT INTO organizations (id, name, slug) VALUES ('${U.orgB}','Other Co','other-co-sec')`
  );
  await db.execute(
    `INSERT INTO customers (id, org_id, name) VALUES ('${U.custB}','${U.orgB}','Other Customer')`
  );
  await db.execute(
    `INSERT INTO invoices (id, org_id, customer_id, invoice_number, status, issue_date, net_amount, gross_amount, discount_amount, shipping_charges, round_off, received_amount, balance_amount)
     VALUES
     ('${U.invB}','${U.orgB}','${U.custB}','INV-ORG-B','pending','2026-07-01','1000','1000','0','0','0','0','1000'),
     ('${U.invA}','${ids.orgId}','${ids.custId}','INV-ORG-A','pending','2026-07-01','1000','1000','0','0','0','0','1000')`
  );
  await db.execute(
    `INSERT INTO invoice_items (id, org_id, invoice_id, product_id, description, quantity, unit_price, line_total, tax_rate)
     VALUES ('${U.invAItem}','${ids.orgId}','${U.invA}','${ids.prodId}','Widget','10','100','1000','0')`
  );

  await db.execute(
    `INSERT INTO employees (id, org_id, employee_code, full_name, joining_date, basic_salary, status)
     VALUES
     ('${U.empA}','${ids.orgId}','EMP-SEC-A','A Employee','2026-01-01','100000','Active'),
     ('${U.empB}','${U.orgB}','EMP-SEC-B','B Employee','2026-01-01','100000','Active')`
  );
  await db.execute(
    `INSERT INTO leave_types (id, org_id, name, days_allowed)
     VALUES
     ('${U.leaveTypeA}','${ids.orgId}','Annual',15),
     ('${U.leaveTypeB}','${U.orgB}','Annual',15)`
  );
  await db.execute(
    `INSERT INTO leave_applications (id, org_id, employee_id, leave_type_id, from_date, to_date, total_days, reason, status, applied_by)
     VALUES
     ('${U.leaveA}','${ids.orgId}','${U.empA}','${U.leaveTypeA}','2026-08-01','2026-08-02',2,'Vacation','pending','user_123'),
     ('${U.leaveB}','${U.orgB}','${U.empB}','${U.leaveTypeB}','2026-08-01','2026-08-02',2,'Vacation','pending','someone')`
  );

  await db.execute(
    `INSERT INTO payroll_runs (id, org_id, month, year, title, total_employees, total_gross, total_deductions, total_net, status)
     VALUES
     ('${U.payRunA}','${ids.orgId}',9,2026,'Sept A',1,'100000','0','100000','Posted'),
     ('${U.payRunB}','${U.orgB}',9,2026,'Sept B',1,'100000','0','100000','Posted')`
  );
  await db.execute(
    `INSERT INTO payslips (id, org_id, payroll_run_id, employee_id, employee_name, employee_code, basic_salary, total_earnings, total_deductions, net_salary, is_paid)
     VALUES
     ('${U.payslipA}','${ids.orgId}','${U.payRunA}','${U.empA}','A Employee','EMP-SEC-A','100000','100000','0','100000',false),
     ('${U.payslipB}','${U.orgB}','${U.payRunB}','${U.empB}','B Employee','EMP-SEC-B','100000','100000','0','100000',false)`
  );
}

describe("W7 security-integration tests", () => {
  it("1. mutations refuse records that belong to a different organization", async () => {
    const { db, ids } = testDb;
    await seedCrossOrgData();

    const { approveInvoice } = await import("@/lib/actions/sales");
    const { approveLeaveApplication } = await import("@/lib/actions/leaves");
    const { markPayslipPaid } = await import("@/lib/actions/hr-payroll");

    const crossInvoice = await approveInvoice(U.invB);
    expect(crossInvoice.success).toBe(false);
    expect(crossInvoice.error).toBe("Invoice not found");

    const crossLeave = await approveLeaveApplication(U.leaveB);
    expect(crossLeave.success).toBe(false);
    expect(crossLeave.error).toContain("not found");

    const crossPayslip = await markPayslipPaid(U.payslipB, "cash");
    expect(crossPayslip.success).toBe(false);
    expect(crossPayslip.error).toBe("Payslip not found");

    const invB = await firstRow(`SELECT status, journal_entry_id FROM invoices WHERE id = '${U.invB}'`);
    expect(invB.status).toBe("pending");
    expect(invB.journal_entry_id).toBeNull();

    const leaveB = await firstRow(
      `SELECT status, reviewed_by FROM leave_applications WHERE id = '${U.leaveB}'`
    );
    expect(leaveB.status).toBe("pending");
    expect(leaveB.reviewed_by).toBeNull();

    const payslipB = await firstRow(
      `SELECT is_paid, payment_method FROM payslips WHERE id = '${U.payslipB}'`
    );
    expect(payslipB.is_paid).toBe(false);
    expect(payslipB.payment_method).toBeNull();

    const crossOrgJe = await sqlRows(
      `SELECT id FROM journal_entries WHERE org_id = '${U.orgB}'`
    );
    expect(crossOrgJe.length).toBe(0);

    const inOrgLeave = await approveLeaveApplication(U.leaveA);
    expect(inOrgLeave.success).toBe(true);

    const inOrgInvoice = await approveInvoice(U.invA);
    expect(inOrgInvoice.success).toBe(true);
    const invA = await firstRow(`SELECT status FROM invoices WHERE id = '${U.invA}'`);
    expect(invA.status).toBe("approved");

    const inOrgPayslip = await markPayslipPaid(U.payslipA, "bank");
    expect(inOrgPayslip.success).toBe(true);
    const payslipA = await firstRow(
      `SELECT is_paid, payment_method FROM payslips WHERE id = '${U.payslipA}'`
    );
    expect(payslipA.is_paid).toBe(true);
    expect(payslipA.payment_method).toBe("bank");

    const orgAJes = await sqlRows(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}'`);
    expect(orgAJes.length).toBeGreaterThan(0);
  });

  it("2. requireRole blocks staff users from financial mutations", async () => {
    const { db, ids } = testDb;
    await seedCrossOrgData();

    const { requireRole } = await import("@/lib/actions/shared");
    const { createJournalEntry } = await import("@/lib/actions/accounts");
    const { approveLeaveApplication } = await import("@/lib/actions/leaves");

    await db.execute(`UPDATE profiles SET role = 'staff' WHERE user_id = 'user_123'`);

    await expect(requireRole(["admin", "accountant"])).rejects.toThrow(/Forbidden/);
    await expect(requireRole(["admin", "manager"])).rejects.toThrow(/Forbidden/);

    const entryData = {
      date: "2026-09-01",
      reference: "staff attempt",
      description: "Should not be created",
      lines: [
        { accountId: ids.cashAccId, description: "Debit cash", debit: "1000", credit: "0" },
        { accountId: ids.revAccId, description: "Credit revenue", debit: "0", credit: "1000" },
      ],
    };

    await expect(createJournalEntry(entryData)).rejects.toThrow(/Forbidden/);

    const blockedLeave = await approveLeaveApplication(U.leaveA);
    expect(blockedLeave.success).toBe(false);

    const jeAfterBlock = await sqlRows(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}'`);
    expect(jeAfterBlock.length).toBe(0);

    const leaveAfterBlock = await firstRow(
      `SELECT status FROM leave_applications WHERE id = '${U.leaveA}'`
    );
    expect(leaveAfterBlock.status).toBe("pending");

    await db.execute(`UPDATE profiles SET role = 'admin' WHERE user_id = 'user_123'`);

    const allowed = await createJournalEntry(entryData);
    expect(allowed.success).toBe(true);

    const jeAfterAllow = await sqlRows(`SELECT id FROM journal_entries WHERE org_id = '${ids.orgId}'`);
    expect(jeAfterAllow.length).toBe(1);
  });

  it("3. validateCsrf compares tokens with timingSafeEqual, never string equality", async () => {
    const token = "a".repeat(64);
    const { validateCsrf } = await import("@/lib/csrf");

    csrfState.cookie = token;
    csrfState.header = token;
    await expect(validateCsrf()).resolves.toBeUndefined();
    expect(cryptoSpy.calls.length).toBe(1);
    expect(cryptoSpy.calls[0][0].toString()).toBe(token);
    expect(cryptoSpy.calls[0][1].toString()).toBe(token);

    cryptoSpy.calls.length = 0;
    csrfState.header = `${"a".repeat(63)}b`;
    await expect(validateCsrf()).rejects.toThrow("Invalid CSRF token");
    expect(cryptoSpy.calls.length).toBe(1);

    cryptoSpy.calls.length = 0;
    csrfState.header = "short";
    await expect(validateCsrf()).rejects.toThrow("Invalid CSRF token");
    expect(cryptoSpy.calls.length).toBe(0);

    cryptoSpy.calls.length = 0;
    csrfState.cookie = token;
    csrfState.header = null;
    await expect(validateCsrf()).rejects.toThrow("CSRF token missing");
    expect(cryptoSpy.calls.length).toBe(0);

    csrfState.cookie = null;
    csrfState.header = token;
    await expect(validateCsrf()).rejects.toThrow("CSRF token missing");
    expect(cryptoSpy.calls.length).toBe(0);
  });
});
