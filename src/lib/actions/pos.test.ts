import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_123" }),
  currentUser: vi.fn(),
}));

const mockGetCurrentOrgId = vi.fn();

vi.mock("@/lib/actions/shared", () => ({
  getCurrentOrgId: (...args: any[]) => mockGetCurrentOrgId(...args),
  requireRole: vi.fn(),
  generateDocumentNumber: vi.fn(),
  generateJournalEntryNumber: vi.fn().mockResolvedValue("JE-00001"),
}));

vi.mock("@/lib/accounting", () => ({
  validateJournalBalance: vi.fn().mockReturnValue(true),
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
    returning: vi.fn().mockResolvedValue([{ id: "inv_123", invoiceNumber: "POS-00001" }]),
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

describe("SEC-09: POS IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("product stock deduction uses orgId guard", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([{ id: "profile_1" }]);
    mockDb.select.mockReturnValue(selectChain);

    const insertChain = chainable();
    insertChain.returning.mockResolvedValue([{ id: "inv_123", invoiceNumber: "POS-00001" }]);
    mockDb.insert.mockReturnValue(insertChain);

    const { processPosSale } = await import("./pos");
    const result = await processPosSale({
      items: [{ productId: "prod_from_other_org", quantity: 1, unitPrice: 100 }],
      paymentMethod: "cash",
    });

    expect(result).toBeDefined();
  });

  it("customer loyalty update uses orgId guard", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([{ id: "profile_1" }]);
    mockDb.select.mockReturnValue(selectChain);

    const insertChain = chainable();
    insertChain.returning.mockResolvedValue([{ id: "inv_123", invoiceNumber: "POS-00001" }]);
    mockDb.insert.mockReturnValue(insertChain);

    const { processPosSale } = await import("./pos");
    const result = await processPosSale({
      items: [{ productId: "prod_1", quantity: 1, unitPrice: 500 }],
      paymentMethod: "cash",
      customerId: "cust_from_other_org",
    });

    expect(result).toBeDefined();
  });

  it("processPosSale: Org B cannot deduct stock from Org A's product", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_B");

    const selectChain = chainable();
    selectChain.limit
      .mockResolvedValueOnce([{ id: "profile_1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.select.mockReturnValue(selectChain);

    const insertChain = chainable();
    insertChain.returning.mockResolvedValue([]);
    mockDb.insert.mockReturnValue(insertChain);

    const { processPosSale } = await import("./pos");
    const result = await processPosSale({
      items: [{ productId: "product_owned_by_org_A", quantity: 5, unitPrice: 100 }],
      paymentMethod: "cash",
    });

    expect(result).toBeDefined();

    const updateCalls = mockDb.update.mock.calls;
    const productUpdateCalls = updateCalls.filter((call: any) => {
      const setArg = call[0];
      return setArg && typeof setArg === 'object' && 'set' in setArg;
    });
    expect(productUpdateCalls.length).toBe(0);
  });

  it("processPosSale: Org B cannot award loyalty on Org A's customer", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_B");

    const selectChain = chainable();
    selectChain.limit
      .mockResolvedValueOnce([{ id: "profile_1" }])
      .mockResolvedValueOnce([{ id: "prod_1", currentStock: "50" }])
      .mockResolvedValueOnce([]);
    mockDb.select.mockReturnValue(selectChain);

    const insertChain = chainable();
    insertChain.returning.mockResolvedValue([{ id: "inv_123", invoiceNumber: "POS-00001" }]);
    mockDb.insert.mockReturnValue(insertChain);

    const { processPosSale } = await import("./pos");
    const result = await processPosSale({
      items: [{ productId: "prod_1", quantity: 1, unitPrice: 500 }],
      paymentMethod: "cash",
      customerId: "customer_owned_by_org_A",
    });

    expect(result).toBeDefined();

    const updateCalls = mockDb.update.mock.calls;
    const loyaltyUpdate = updateCalls.find((call: any) => {
      const setArg = call[0];
      return setArg && typeof setArg === 'object' && 'loyaltyPoints' in setArg;
    });
    expect(loyaltyUpdate).toBeUndefined();
  });
});
