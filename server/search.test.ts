import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("search.query", () => {
  it("returns search results for valid parameters", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.query({
      lat: 37.7749,
      lng: -119.5934,
      radius: 50,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);
    expect(result.meta).toBeDefined();
    expect(result.meta.total).toBeGreaterThanOrEqual(0);
  });

  it("filters by site types when provided", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.query({
      lat: 37.7749,
      lng: -119.5934,
      radius: 50,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      siteTypes: ["tent"],
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);
  });

  it("filters by minimum score when provided", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.query({
      lat: 37.7749,
      lng: -119.5934,
      radius: 50,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      minScore: 70,
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);
    // All results should have avgScore >= 70
    result.results.forEach((r) => {
      expect(r.avgScore).toBeGreaterThanOrEqual(70);
    });
  });
});
