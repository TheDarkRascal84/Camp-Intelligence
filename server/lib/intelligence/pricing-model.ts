import { getDb } from "../../db";
import {
  campsitePriceHistory,
  availabilitySnapshots,
  InsertCampsitePriceHistory,
} from "../../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface PriceChangeEvent {
  campsiteId: number;
  date: string;
  oldPrice: number;
  newPrice: number;
  priceChange: number;
  priceChangePercent: number;
  eventType: "price_spike" | "price_drop" | "normal";
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface PriceTrend {
  campsiteId: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceVolatility: number;
  recentTrend: "increasing" | "decreasing" | "stable";
  weekendPremium: number;
  priceHistory: Array<{
    date: string;
    price: number;
    eventType: string;
  }>;
}

/**
 * Detect price changes and classify them as spikes, drops, or normal
 */
export async function detectPriceChanges(
  campsiteId: number,
  date: string,
  currentPrice: number,
): Promise<PriceChangeEvent | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get previous price for this campsite and date
  const [previousEntry] = await db
    .select()
    .from(campsitePriceHistory)
    .where(
      and(
        eq(campsitePriceHistory.campsiteId, campsiteId),
        sql`${campsitePriceHistory.date} = ${date}`,
      ),
    )
    .orderBy(desc(campsitePriceHistory.capturedAt))
    .limit(1);

  // If no previous price, this is the first entry
  if (!previousEntry) {
    return null;
  }

  const oldPrice = previousEntry.price;
  const priceChange = currentPrice - oldPrice;
  const priceChangePercent = (priceChange / oldPrice) * 100;

  // Classify event type
  let eventType: "price_spike" | "price_drop" | "normal" = "normal";
  if (priceChangePercent >= 20) {
    eventType = "price_spike";
  } else if (priceChangePercent <= -20) {
    eventType = "price_drop";
  }

  // Check if weekend or holiday
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = checkIfHoliday(targetDate);

  return {
    campsiteId,
    date,
    oldPrice,
    newPrice: currentPrice,
    priceChange,
    priceChangePercent,
    eventType,
    isWeekend,
    isHoliday,
  };
}

/**
 * Store price change in history table
 */
export async function storePriceHistory(
  campsiteId: number,
  date: string,
  price: number,
  eventType: "price_spike" | "price_drop" | "normal" = "normal",
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get previous price to calculate change
  const [previousEntry] = await db
    .select()
    .from(campsitePriceHistory)
    .where(
      and(
        eq(campsitePriceHistory.campsiteId, campsiteId),
        sql`${campsitePriceHistory.date} < ${date}`,
      ),
    )
    .orderBy(desc(campsitePriceHistory.date))
    .limit(1);

  let priceChange: number | null = null;
  let priceChangePercent: number | null = null;

  if (previousEntry) {
    priceChange = price - previousEntry.price;
    priceChangePercent = (priceChange / previousEntry.price) * 100;
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = checkIfHoliday(targetDate);

  const entry: InsertCampsitePriceHistory = {
    campsiteId,
    date: date as any,
    price,
    priceChange: priceChange ?? undefined,
    priceChangePercent: priceChangePercent ?? undefined,
    isWeekend,
    isHoliday,
    eventType,
  };

  await db.insert(campsitePriceHistory).values(entry);
}

/**
 * Get price trend analysis for a campsite
 */
export async function getPriceTrend(
  campsiteId: number,
  lookbackDays: number = 90,
): Promise<PriceTrend> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get price history
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  const history = await db
    .select()
    .from(campsitePriceHistory)
    .where(
      and(
        eq(campsitePriceHistory.campsiteId, campsiteId),
        sql`${campsitePriceHistory.date} >= ${lookbackDate.toISOString().split("T")[0]}`,
      ),
    )
    .orderBy(campsitePriceHistory.date);

  if (history.length === 0) {
    return {
      campsiteId,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      priceVolatility: 0,
      recentTrend: "stable",
      weekendPremium: 0,
      priceHistory: [],
    };
  }

  // Calculate statistics
  const prices = history.map((h) => h.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Calculate volatility (standard deviation)
  const variance =
    prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
    prices.length;
  const priceVolatility = Math.sqrt(variance);

  // Determine recent trend (last 30 days)
  const recentHistory = history.slice(-30);
  let recentTrend: "increasing" | "decreasing" | "stable" = "stable";
  if (recentHistory.length >= 2) {
    const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
    const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));
    const firstAvg =
      firstHalf.reduce((sum, h) => sum + h.price, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, h) => sum + h.price, 0) / secondHalf.length;

    const trendChange = ((secondAvg - firstAvg) / firstAvg) * 100;
    if (trendChange > 5) {
      recentTrend = "increasing";
    } else if (trendChange < -5) {
      recentTrend = "decreasing";
    }
  }

  // Calculate weekend premium
  const weekendPrices = history.filter((h) => h.isWeekend).map((h) => h.price);
  const weekdayPrices = history.filter((h) => !h.isWeekend).map((h) => h.price);
  let weekendPremium = 0;
  if (weekendPrices.length > 0 && weekdayPrices.length > 0) {
    const weekendAvg =
      weekendPrices.reduce((a, b) => a + b, 0) / weekendPrices.length;
    const weekdayAvg =
      weekdayPrices.reduce((a, b) => a + b, 0) / weekdayPrices.length;
    weekendPremium = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;
  }

  return {
    campsiteId,
    avgPrice: Math.round(avgPrice * 100) / 100,
    minPrice,
    maxPrice,
    priceVolatility: Math.round(priceVolatility * 100) / 100,
    recentTrend,
    weekendPremium: Math.round(weekendPremium * 100) / 100,
    priceHistory: history.map((h) => ({
      date: typeof h.date === 'string' ? h.date : h.date.toISOString().split('T')[0],
      price: h.price,
      eventType: h.eventType || 'normal',
    })),
  };
}

/**
 * Sync price history from availability snapshots
 */
export async function syncPriceHistoryFromSnapshots(
  campsiteId: number,
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all availability snapshots with prices
  const snapshots = await db
    .select()
    .from(availabilitySnapshots)
    .where(
      and(
        eq(availabilitySnapshots.campsiteId, campsiteId),
        sql`${availabilitySnapshots.price} IS NOT NULL`,
      ),
    )
    .orderBy(availabilitySnapshots.date, availabilitySnapshots.capturedAt);

  let synced = 0;
  for (const snapshot of snapshots) {
    if (snapshot.price) {
      try {
        // Check if already exists
        const [existing] = await db
          .select()
          .from(campsitePriceHistory)
          .where(
            and(
              eq(campsitePriceHistory.campsiteId, campsiteId),
              sql`${campsitePriceHistory.date} = ${snapshot.date}`,
            ),
          )
          .limit(1);

        if (!existing) {
          const dateStr = typeof snapshot.date === 'string' ? snapshot.date : snapshot.date.toISOString().split('T')[0];
          await storePriceHistory(campsiteId, dateStr, snapshot.price);
          synced++;
        }
      } catch (error) {
        console.error(`Failed to sync price for ${campsiteId} on ${snapshot.date}:`, error);
      }
    }
  }

  return synced;
}

/**
 * Check if a date is a US federal holiday
 */
function checkIfHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  const holidays = [
    { month: 1, day: 1 },
    { month: 7, day: 4 },
    { month: 12, day: 25 },
  ];

  for (const holiday of holidays) {
    if (month === holiday.month && day === holiday.day) {
      return true;
    }
  }

  if (month === 5 && dayOfWeek === 1 && day >= 25) return true;
  if (month === 9 && dayOfWeek === 1 && day <= 7) return true;
  if (month === 11 && dayOfWeek === 4 && day >= 22 && day <= 28) return true;

  return false;
}
