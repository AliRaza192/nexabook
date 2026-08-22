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
  generateJournalEntryNumber: vi.fn(),
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

describe("SEC-10: Manufacturing disassemble IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finished good stock check uses orgId guard", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const { disassembleFinishedGood } = await import("./manufacturing");
    const result = await disassembleFinishedGood({
      finishedGoodId: "prod_from_other_org",
      quantity: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("component stock update uses orgId guard", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit
      .mockResolvedValueOnce([{ id: "bom_1", finishedGoodId: "fg_1", quantity: 10, isActive: true, status: "active" }])
      .mockResolvedValueOnce([{ id: "fg_1", name: "FG", currentStock: "20", costPrice: "100" }])
      .mockResolvedValueOnce([{ componentId: "comp_1", quantityRequired: "2", component: { id: "comp_1", name: "Comp", currentStock: "50" } }]);
    mockDb.select.mockReturnValue(selectChain);

    const updateChain = chainable();
    updateChain.where.mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const { disassembleFinishedGood } = await import("./manufacturing");
    const result = await disassembleFinishedGood({
      finishedGoodId: "fg_1",
      quantity: 5,
    });

    expect(result.success).toBe(true);
  });
});
