import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("alerts", () => {
  it("lists alert subscriptions for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alerts.list();

    expect(result).toBeInstanceOf(Array);
  });

  it("creates a new alert subscription", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alerts.create({
      alertType: "availability_opened",
      channel: "email",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("updates alert subscription enabled status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create an alert
    const created = await caller.alerts.create({
      alertType: "availability_opened",
      channel: "email",
    });

    // Then update it
    const result = await caller.alerts.update({
      id: created.id,
      enabled: false,
    });

    expect(result.success).toBe(true);
  });
});
