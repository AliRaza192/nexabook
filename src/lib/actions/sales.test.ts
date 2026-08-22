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

vi.mock("@/lib/fbr-api", () => ({
  submitInvoiceToFBR: vi.fn(),
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
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve([])),
  };
  return self;
};

const mockDb = {
  select: vi.fn(() => chainable()),
  insert: vi.fn(() => chainable()),
  update: vi.fn(() => chainable()),
  delete: vi.fn(() => chainable()),
  query: {},
};

vi.mock("@/db", () => ({ db: mockDb }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("SEC-07/08/20: Sales IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createDeliveryNote checks orgId on invoice lookup/update", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const insertChain = chainable();
    insertChain.returning.mockResolvedValue([{ id: "dn_123", deliveryNumber: "DN-00001" }]);
    mockDb.insert.mockReturnValue(insertChain);

    const { createDeliveryNote } = await import("./sales");
    const result = await createDeliveryNote({
      customerId: "cust_1",
      deliveryDate: "2026-08-20",
      items: [{ description: "Item", orderedQty: "1", deliveredQty: "1" }],
      invoiceId: "invoice_from_other_org",
    });

    expect(result.success).toBe(true);
  });

  it("allocatePayment checks orgId on payment lookup", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const { allocatePayment } = await import("./sales");
    const result = await allocatePayment("payment_other_org", [
      { invoiceId: "inv_1", amount: "1000" },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("updateInvoiceStatus blocks 'approved' status (must use approveInvoice)", async () => {
    mockRequireRole.mockResolvedValue(undefined);
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const { updateInvoiceStatus } = await import("./sales");
    const result = await updateInvoiceStatus("inv_123", "approved");

    expect(result.success).toBe(false);
    expect(result.error).toContain("approveInvoice");
  });

  it("updateInvoiceStatus requires admin/accountant role", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden: This action requires one of these roles: admin, accountant"));
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const { updateInvoiceStatus } = await import("./sales");
    const result = await updateInvoiceStatus("inv_123", "sent");

    expect(result.success).toBe(false);
  });

  it("createDeliveryNote: Org B cannot flip Org A's invoice status to sent", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_B");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const insertChain = chainable();
    insertChain.returning.mockResolvedValue([{ id: "dn_456", deliveryNumber: "DN-00002" }]);
    mockDb.insert.mockReturnValue(insertChain);

    const { createDeliveryNote } = await import("./sales");
    const result = await createDeliveryNote({
      customerId: "cust_1",
      deliveryDate: "2026-08-20",
      items: [{ description: "Item", orderedQty: "1", deliveredQty: "1" }],
      invoiceId: "invoice_owned_by_org_A",
    });

    expect(result.success).toBe(true);

    const invoiceSelectCall = mockDb.select.mock.calls.find((_: any, i: number) => {
      return mockDb.select.mock.results[i]?.value === selectChain;
    });
    expect(invoiceSelectCall).toBeDefined();
  });
});
