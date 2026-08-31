import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_123" }),
  currentUser: vi.fn(),
}));

const mockGetCurrentOrgId = vi.fn();
const mockRequireRole = vi.fn();

vi.mock("@/lib/actions/shared", () => ({
  getCurrentOrgId: (...args: any[]) => mockGetCurrentOrgId(...args),
  requireRole: (...args: any[]) => mockRequireRole(...args),
  generateDocumentNumber: vi.fn(),
  generateJournalEntryNumber: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  validateJournalBalance: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/actions/fiscal-periods", () => ({
  checkPeriodLocked: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/actions/inventory", () => ({
  convertToBaseUnit: vi.fn(),
  updateWarehouseStock: vi.fn(),
  updateBatchStock: vi.fn(),
}));

const chainable = () => {
  const self: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "payment_123", paymentNumber: "VP-00001" }]),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve([])),
  };
  return self;
};

const mockDb: any = {
  select: vi.fn(() => chainable()),
  insert: vi.fn(() => chainable()),
  update: vi.fn(() => chainable()),
  delete: vi.fn(() => chainable()),
  query: {},
  transaction: vi.fn(async (fn: any) => fn(mockDb)),
};

vi.mock("@/db", () => ({ db: mockDb }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("SEC-06: Vendor payment/settlement IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createVendorPayment selects vendor with orgId guard", async () => {
    mockRequireRole.mockResolvedValue(undefined);
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([{ id: "acct_1", subType: "cash" }]);
    mockDb.select.mockReturnValue(selectChain);

    const insertChain = chainable();
    insertChain.returning.mockResolvedValue([{ id: "payment_123", paymentNumber: "VP-00001" }]);
    mockDb.insert.mockReturnValue(insertChain);

    const { createVendorPayment } = await import("./purchases");
    const result = await createVendorPayment({
      vendorId: "vendor_B",
      amount: "5000",
      paymentDate: "2026-08-20",
      paymentMethod: "cash",
    });

    expect(result.success).toBe(true);
  });

  it("allocateVendorPayment checks orgId on payment lookup", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const { allocateVendorPayment } = await import("./purchases");
    const result = await allocateVendorPayment("payment_other_org", [
      { invoiceId: "inv_1", amount: "1000" },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
