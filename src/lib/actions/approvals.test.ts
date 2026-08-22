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

describe("SEC-03/04: Approvals IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approveRequest uses orgId in WHERE clause", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const updateChain = chainable();
    updateChain.where.mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const { approveRequest } = await import("./approvals");
    const result = await approveRequest("req_123", "Looks good");

    expect(result.success).toBe(true);
    const whereArg = updateChain.where.mock.calls[0][0];
    expect(whereArg).toBeDefined();
  });

  it("rejectRequest uses orgId in WHERE clause", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const updateChain = chainable();
    updateChain.where.mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const { rejectRequest } = await import("./approvals");
    const result = await rejectRequest("req_123", "Denied");

    expect(result.success).toBe(true);
    const whereArg = updateChain.where.mock.calls[0][0];
    expect(whereArg).toBeDefined();
  });

  it("deleteWorkflow uses orgId in WHERE clause", async () => {
    mockRequireRole.mockResolvedValue(undefined);
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const deleteChain = chainable();
    deleteChain.where.mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue(deleteChain);

    const { deleteWorkflow } = await import("./approvals");
    const result = await deleteWorkflow("wf_123");

    expect(result.success).toBe(true);
    const whereArg = deleteChain.where.mock.calls[0][0];
    expect(whereArg).toBeDefined();
  });

  it("approveRequest fails when no org found", async () => {
    mockGetCurrentOrgId.mockResolvedValue(null);

    const { approveRequest } = await import("./approvals");
    const result = await approveRequest("req_123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("organization");
  });

  it("deleteWorkflow: Org B cannot delete Org A's workflow", async () => {
    mockRequireRole.mockResolvedValue(undefined);
    mockGetCurrentOrgId.mockResolvedValue("org_B");

    const deleteChain = chainable();
    deleteChain.where.mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue(deleteChain);

    const { deleteWorkflow } = await import("./approvals");
    const result = await deleteWorkflow("workflow_owned_by_org_A");

    expect(result.success).toBe(true);

    const whereCall = deleteChain.where.mock.calls[0][0];
    expect(whereCall).toBeDefined();
  });
});
