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

vi.mock("@/lib/actions/audit", () => ({
  createAuditLog: vi.fn(),
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

describe("SEC-11: MiscContactSettlement IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approveMiscContactSettlement rejects when settlement not found in org", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const { approveMiscContactSettlement } = await import("./adjustments");
    const result = await approveMiscContactSettlement("settlement_other_org");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("approveMiscContactSettlement uses orgId on bank account lookup", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit
      .mockResolvedValueOnce([{ id: "set_1", orgId: "org_A", approvalStatus: "pending_approval", bankAccountId: "bank_1", settledAmount: "5000" }])
      .mockResolvedValueOnce([{ currentBalance: "10000" }]);
    mockDb.select.mockReturnValue(selectChain);

    const updateChain = chainable();
    updateChain.where.mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const { approveMiscContactSettlement } = await import("./adjustments");
    const result = await approveMiscContactSettlement("set_1");

    expect(result.success).toBe(true);
  });
});
