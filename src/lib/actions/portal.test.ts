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
  };
  const thenFn = vi.fn((resolve) => resolve([]));
  self.then = thenFn;
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

describe("SEC-01: Portal token IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generatePortalToken rejects when customer not found in caller org", async () => {
    mockRequireRole.mockResolvedValue(undefined);
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const { generatePortalToken } = await import("./portal");
    const result = await generatePortalToken("customer_from_org_B");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("generatePortalToken succeeds for customer in same org", async () => {
    mockRequireRole.mockResolvedValue(undefined);
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([{ id: "customer_from_org_A" }]);
    mockDb.select.mockReturnValue(selectChain);

    const updateChain = chainable();
    updateChain.where.mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const { generatePortalToken } = await import("./portal");
    const result = await generatePortalToken("customer_from_org_A");

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it("generateVendorPortalToken rejects when vendor not found in caller org", async () => {
    mockRequireRole.mockResolvedValue(undefined);
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const selectChain = chainable();
    selectChain.limit.mockResolvedValue([]);
    mockDb.select.mockReturnValue(selectChain);

    const { generateVendorPortalToken } = await import("./portal");
    const result = await generateVendorPortalToken("vendor_from_org_B");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("generatePortalToken throws when requireRole rejects (non-admin)", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden: This action requires one of these roles: admin"));

    const { generatePortalToken } = await import("./portal");
    const result = await generatePortalToken("customer_123");

    expect(result.success).toBe(false);
  });
});
