import { vi } from "vitest";

// Mock drizzle DB to avoid DATABASE_URL requirement
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(async (fn: any) => fn({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    query: {},
  },
}));
