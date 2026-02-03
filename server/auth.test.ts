import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./lib/context";
import type { User } from "../drizzle/schema";

function createMockContext(user: User | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    supabaseId: "test-supabase-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    lastSignedIn: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("auth.me", () => {
  it("returns null when user is not authenticated", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });

  it("returns user data when authenticated", async () => {
    const mockUser = createMockUser();
    const ctx = createMockContext(mockUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toEqual(mockUser);
    expect(result?.email).toBe("test@example.com");
    expect(result?.name).toBe("Test User");
  });

  it("returns admin user with correct role", async () => {
    const adminUser = createMockUser({ role: "admin" });
    const ctx = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result?.role).toBe("admin");
  });
});

describe("system.health", () => {
  it("returns ok status", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.system.health({ timestamp: Date.now() });

    expect(result).toEqual({ ok: true });
  });

  it("rejects negative timestamp", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.system.health({ timestamp: -1 })).rejects.toThrow();
  });
});
