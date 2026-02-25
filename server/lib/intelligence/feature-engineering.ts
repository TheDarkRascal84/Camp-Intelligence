import { getDb } from "../../db";
import {
  campsites,
  campgrounds,
  availabilitySnapshots,
  campsiteHistoricalStats,
} from "../../../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface CampsiteFeatureVector {
  // Historical features
  avgDaysBookedInAdvance: number | null;
  cancellationFrequency: number;
  weekendFillRate: number;
  holidayFillRate: number;
  avgTimeOpenBeforeBooked: number | null;
  volatilityScore: number;
  providerReliabilityAdjustment: number;
  geoDemandPercentile: number;
  
  // Temporal features
  daysUntilCheckIn: number;
  isWeekend: boolean;
  isHoliday: boolean;
  seasonalityFactor: number;
  
  // Context features
  campgroundPopularityScore: number;
  siteType: string;
  currentAvailability: boolean;
  
  // Metadata
  sampleSize: number;
  confidenceScore: number;
}

/**
 * Build a complete feature vector for a campsite on a specific date
 */
export async function buildCampsiteFeatureVector(
  campsiteId: number,
  targetDate: Date,
): Promise<CampsiteFeatureVector> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get historical stats
  const [stats] = await db
    .select()
    .from(campsiteHistoricalStats)
    .where(eq(campsiteHistoricalStats.campsiteId, campsiteId))
    .limit(1);

  // Get campsite and campground info
  const [campsite] = await db
    .select({
      siteType: campsites.siteType,
      campgroundId: campsites.campgroundId,
      provider: campgrounds.provider,
    })
    .from(campsites)
    .innerJoin(campgrounds, eq(campsites.campgroundId, campgrounds.id))
    .where(eq(campsites.id, campsiteId))
    .limit(1);

  if (!campsite) {
    throw new Error(`Campsite ${campsiteId} not found`);
  }

  // Get current availability for target date
  const dateStr = targetDate.toISOString().split("T")[0];
  const [availability] = await db
    .select()
    .from(availabilitySnapshots)
    .where(
      and(
        eq(availabilitySnapshots.campsiteId, campsiteId),
        sql`${availabilitySnapshots.date} = ${dateStr}`,
      ),
    )
    .orderBy(sql`${availabilitySnapshots.capturedAt} DESC`)
    .limit(1);

  // Calculate temporal features
  const now = new Date();
  const daysUntilCheckIn = Math.floor(
    (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dayOfWeek = targetDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = checkIfHoliday(targetDate);
  const seasonalityFactor = calculateSeasonalityFactor(targetDate);

  // Calculate campground popularity (simplified)
  const campgroundPopularityScore = await calculateCampgroundPopularity(
    campsite.campgroundId,
  );

  // Provider reliability adjustment
  const providerReliabilityMap: Record<string, number> = {
    recreation_gov: 0.95,
    reserve_california: 0.90,
    mock: 1.0,
  };
  const providerReliability =
    providerReliabilityMap[campsite.provider] || 1.0;

  // Calculate confidence score based on sample size
  const sampleSize = stats?.sampleSize || 0;
  const confidenceScore = Math.min(1.0, sampleSize / 100);

  return {
    // Historical features
    avgDaysBookedInAdvance: stats?.avgDaysBookedInAdvance || null,
    cancellationFrequency: stats?.cancellationFrequency || 0,
    weekendFillRate: stats?.weekendFillRate || 0,
    holidayFillRate: stats?.holidayFillRate || 0,
    avgTimeOpenBeforeBooked: stats?.avgTimeOpenBeforeBooked || null,
    volatilityScore: stats?.volatilityScore || 0,
    providerReliabilityAdjustment: providerReliability,
    geoDemandPercentile: stats?.geoDemandPercentile || 50,
    
    // Temporal features
    daysUntilCheckIn,
    isWeekend,
    isHoliday,
    seasonalityFactor,
    
    // Context features
    campgroundPopularityScore,
    siteType: campsite.siteType,
    currentAvailability: availability?.isAvailable || false,
    
    // Metadata
    sampleSize,
    confidenceScore,
  };
}

/**
 * Check if a date is a US federal holiday
 */
function checkIfHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Major US holidays (simplified)
  const holidays = [
    { month: 1, day: 1 }, // New Year's Day
    { month: 7, day: 4 }, // Independence Day
    { month: 12, day: 25 }, // Christmas
  ];

  // Check fixed holidays
  for (const holiday of holidays) {
    if (month === holiday.month && day === holiday.day) {
      return true;
    }
  }

  // Memorial Day (last Monday of May)
  if (month === 5 && dayOfWeek === 1 && day >= 25) {
    return true;
  }

  // Labor Day (first Monday of September)
  if (month === 9 && dayOfWeek === 1 && day <= 7) {
    return true;
  }

  // Thanksgiving (fourth Thursday of November)
  if (month === 11 && dayOfWeek === 4 && day >= 22 && day <= 28) {
    return true;
  }

  return false;
}

/**
 * Calculate seasonality factor (0-1) based on month
 */
function calculateSeasonalityFactor(date: Date): number {
  const month = date.getMonth() + 1;
  
  // Peak camping season: May-September
  const peakMonths = [5, 6, 7, 8, 9];
  if (peakMonths.includes(month)) {
    return 1.0;
  }
  
  // Shoulder season: April, October
  if (month === 4 || month === 10) {
    return 0.7;
  }
  
  // Off-season: November-March
  return 0.3;
}

/**
 * Calculate campground popularity score based on booking patterns
 */
async function calculateCampgroundPopularity(
  campgroundId: number,
): Promise<number> {
  const db = await getDb();
  if (!db) {
    return 50; // Default middle score
  }

  // Get average fill rate across all campsites in this campground
  const result = await db
    .select({
      avgFillRate: sql<number>`AVG(CASE WHEN ${availabilitySnapshots.isAvailable} = 0 THEN 1 ELSE 0 END)`,
      totalSnapshots: sql<number>`COUNT(*)`,
    })
    .from(availabilitySnapshots)
    .innerJoin(campsites, eq(availabilitySnapshots.campsiteId, campsites.id))
    .where(eq(campsites.campgroundId, campgroundId))
    .groupBy(campsites.campgroundId);

  if (!result || result.length === 0) {
    return 50;
  }

  const avgFillRate = result[0]?.avgFillRate || 0;
  return Math.round(avgFillRate * 100);
}

/**
 * Compute historical stats for a campsite
 */
export async function computeHistoricalStats(
  campsiteId: number,
): Promise<Partial<CampsiteFeatureVector>> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all historical availability snapshots
  const snapshots = await db
    .select()
    .from(availabilitySnapshots)
    .where(eq(availabilitySnapshots.campsiteId, campsiteId))
    .orderBy(availabilitySnapshots.date);

  if (snapshots.length === 0) {
    return {
      cancellationFrequency: 0,
      weekendFillRate: 0,
      holidayFillRate: 0,
      volatilityScore: 0,
      sampleSize: 0,
      confidenceScore: 0,
    };
  }

  // Calculate cancellation frequency (availability flips from false to true)
  let cancellations = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    if (
      prev &&
      curr &&
      prev.date === curr.date &&
      !prev.isAvailable &&
      curr.isAvailable
    ) {
      cancellations++;
    }
  }
  const cancellationFrequency = cancellations / snapshots.length;

  // Calculate weekend fill rate
  const weekendSnapshots = snapshots.filter((s) => {
    const date = new Date(s.date);
    const day = date.getDay();
    return day === 0 || day === 6;
  });
  const weekendBooked = weekendSnapshots.filter((s) => !s.isAvailable).length;
  const weekendFillRate =
    weekendSnapshots.length > 0 ? weekendBooked / weekendSnapshots.length : 0;

  // Calculate holiday fill rate
  const holidaySnapshots = snapshots.filter((s) =>
    checkIfHoliday(new Date(s.date)),
  );
  const holidayBooked = holidaySnapshots.filter((s) => !s.isAvailable).length;
  const holidayFillRate =
    holidaySnapshots.length > 0 ? holidayBooked / holidaySnapshots.length : 0;

  // Calculate volatility (frequency of availability changes)
  let changes = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    if (prev && curr && prev.date === curr.date) {
      if (prev.isAvailable !== curr.isAvailable) {
        changes++;
      }
    }
  }
  const volatilityScore = changes / snapshots.length;

  return {
    cancellationFrequency,
    weekendFillRate,
    holidayFillRate,
    volatilityScore,
    sampleSize: snapshots.length,
    confidenceScore: Math.min(1.0, snapshots.length / 100),
  };
}
