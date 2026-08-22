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

describe("SEC-05: Consolidation IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("linkChildOrg rejects self-linking", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const { linkChildOrg } = await import("./consolidation");
    const result = await linkChildOrg("org_A");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot link yourself");
  });

  it("linkChildOrg rejects non-existent child", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const { linkChildOrg } = await import("./consolidation");
    const result = await linkChildOrg("nonexistent_org");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("unlinkChildOrg rejects when child belongs to different parent", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([{ id: "org_B", parentOrgId: "org_C" }]);
    mockDb.select.mockReturnValue(selectChain);

    const { unlinkChildOrg } = await import("./consolidation");
    const result = await unlinkChildOrg("org_B");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not linked");
  });
});
