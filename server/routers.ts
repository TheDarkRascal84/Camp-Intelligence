import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { savedSearches, alertSubscriptions, notificationHistory } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { search, SearchParamsSchema } from "./lib/search";
import { predictCancellationProbability } from "./lib/intelligence/cancellation-model";
import { predictBookingLikelihood } from "./lib/intelligence/booking-model";
import { generateDemandHeatmap } from "./lib/intelligence/demand-model";
import { getPriceTrend } from "./lib/intelligence/pricing-model";
import { campsitePredictionSnapshots } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Search router
  search: router({
    // Public search endpoint
    query: publicProcedure
      .input(SearchParamsSchema)
      .query(async ({ input }) => {
        return await search(input);
      }),
  }),

  // Saved searches router
  savedSearches: router({
    // List user's saved searches
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(savedSearches)
        .where(eq(savedSearches.userId, ctx.user.id))
        .orderBy(desc(savedSearches.createdAt));
    }),

    // Create saved search
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          locationLat: z.number(),
          locationLng: z.number(),
          radiusMiles: z.number(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          siteTypes: z.array(z.string()).optional(),
          minScore: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [result] = await db.insert(savedSearches).values({
          userId: ctx.user.id,
          name: input.name,
          locationLat: input.locationLat,
          locationLng: input.locationLng,
          radiusMiles: input.radiusMiles,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          siteTypes: input.siteTypes ? JSON.stringify(input.siteTypes) : null,
          minScore: input.minScore ?? null,
        } as any);

        return { id: result.insertId };
      }),

    // Delete saved search
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .delete(savedSearches)
          .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userId, ctx.user.id)));

        return { success: true };
      }),
  }),

  // Alert subscriptions router
  alerts: router({
    // List user's alert subscriptions
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(alertSubscriptions)
        .where(eq(alertSubscriptions.userId, ctx.user.id))
        .orderBy(desc(alertSubscriptions.createdAt));
    }),

    // Create alert subscription
    create: protectedProcedure
      .input(
        z.object({
          savedSearchId: z.number().optional(),
          alertType: z.enum(["availability_opened", "score_improved", "cancellation_detected", "price_dropped"]),
          channel: z.enum(["email", "push", "sms"]),
          minScoreThreshold: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [result] = await db.insert(alertSubscriptions).values({
          userId: ctx.user.id,
          savedSearchId: input.savedSearchId || null,
          alertType: input.alertType,
          channel: input.channel,
          enabled: true,
          minScoreThreshold: input.minScoreThreshold || null,
        });

        return { id: result.insertId };
      }),

    // Update alert subscription
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          enabled: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(alertSubscriptions)
          .set({ enabled: input.enabled })
          .where(and(eq(alertSubscriptions.id, input.id), eq(alertSubscriptions.userId, ctx.user.id)));

        return { success: true };
      }),

    // Delete alert subscription
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .delete(alertSubscriptions)
          .where(and(eq(alertSubscriptions.id, input.id), eq(alertSubscriptions.userId, ctx.user.id)));

        return { success: true };
      }),
  }),

  // Analytics router (intelligence layer)
  analytics: router({
    // Get cancellation risk for a campsite
    cancellationRisk: protectedProcedure
      .input(
        z.object({
          campsiteId: z.number(),
          date: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        const targetDate = input.date ? new Date(input.date) : new Date();
        return await predictCancellationProbability(input.campsiteId, targetDate);
      }),

    // Get booking urgency for a campsite
    bookingUrgency: protectedProcedure
      .input(
        z.object({
          campsiteId: z.number(),
          date: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        const targetDate = input.date ? new Date(input.date) : new Date();
        return await predictBookingLikelihood(input.campsiteId, targetDate);
      }),

    // Get demand heatmap for an area
    demandHeatmap: protectedProcedure
      .input(
        z.object({
          lat: z.number(),
          lng: z.number(),
          radiusMiles: z.number().default(50),
          gridSize: z.number().default(10),
        }),
      )
      .query(async ({ input }) => {
        return await generateDemandHeatmap(
          input.lat,
          input.lng,
          input.radiusMiles,
          input.gridSize,
        );
      }),

    // Get price trend for a campsite
    priceTrend: protectedProcedure
      .input(
        z.object({
          campsiteId: z.number(),
          lookbackDays: z.number().default(90),
        }),
      )
      .query(async ({ input }) => {
        return await getPriceTrend(input.campsiteId, input.lookbackDays);
      }),

    // Get prediction snapshot for a campsite
    predictionSnapshot: protectedProcedure
      .input(
        z.object({
          campsiteId: z.number(),
          date: z.string(),
        }),
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [snapshot] = await db
          .select()
          .from(campsitePredictionSnapshots)
          .where(
            and(
              eq(campsitePredictionSnapshots.campsiteId, input.campsiteId),
              eq(campsitePredictionSnapshots.date, input.date as any),
            ),
          )
          .orderBy(desc(campsitePredictionSnapshots.computedAt))
          .limit(1);

        return snapshot || null;
      }),
  }),

  // Notifications router
  notifications: router({
    // Get notification history
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(notificationHistory)
          .where(eq(notificationHistory.userId, ctx.user.id))
          .orderBy(desc(notificationHistory.createdAt))
          .limit(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
