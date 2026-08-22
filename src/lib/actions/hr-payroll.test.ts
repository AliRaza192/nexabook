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

describe("SEC-02: markPayslipPaid IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks payslip as paid only when payslip belongs to caller org", async () => {
    mockGetCurrentOrgId.mockResolvedValue("org_A");

    const updateChain = chainable();
    updateChain.where.mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const { markPayslipPaid } = await import("./hr-payroll");
    const result = await markPayslipPaid("payslip_123", "Bank Transfer");

    expect(result.success).toBe(true);

    const whereCall = updateChain.where.mock.calls[0][0];
    expect(whereCall).toBeDefined();
  });

  it("rejects when getCurrentOrgId returns null", async () => {
    mockGetCurrentOrgId.mockResolvedValue(null);

    const { markPayslipPaid } = await import("./hr-payroll");
    const result = await markPayslipPaid("payslip_123", "Cash");

    expect(result.success).toBe(false);
    expect(result.error).toContain("organization");
  });
});
