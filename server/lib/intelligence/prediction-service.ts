import { getDb } from "../../db";
import {
  campsites,
  campsitePredictionSnapshots,
  campsiteHistoricalStats,
  InsertCampsitePredictionSnapshot,
  InsertCampsiteHistoricalStats,
} from "../../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { predictCancellationProbability } from "./cancellation-model";
import { predictBookingLikelihood } from "./booking-model";
import { calculateGeoDemandScore } from "./demand-model";
import { computeHistoricalStats } from "./feature-engineering";

export interface IntelligenceScore {
  intelligenceScore: number; // 0-100
  components: {
    demandScore: number;
    bookingVelocityScore: number;
    cancellationVolatility: number;
    providerReliability: number;
    priceMomentum: number;
  };
}

/**
 * Generate and store prediction snapshot for a campsite on a specific date
 */
export async function generatePredictionSnapshot(
  campsiteId: number,
  targetDate: Date,
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Get campsite location for geo demand
    const [campsite] = await db
      .select({
        id: campsites.id,
        campgroundId: campsites.campgroundId,
      })
      .from(campsites)
      .where(eq(campsites.id, campsiteId))
      .limit(1);

    if (!campsite) {
      console.error(`Campsite ${campsiteId} not found`);
      return;
    }

    // Run predictions
    const [cancellationPred, bookingPred] = await Promise.all([
      predictCancellationProbability(campsiteId, targetDate),
      predictBookingLikelihood(campsiteId, targetDate),
    ]);

    // Calculate composite intelligence score
    const intelligenceScore = calculateIntelligenceScore({
      demandScore: bookingPred.factors.demandScore * 100,
      bookingVelocityScore: bookingPred.factors.bookingVelocity * 100,
      cancellationVolatility: cancellationPred.factors.historicalFrequency * 100,
      providerReliability: cancellationPred.factors.providerReliability * 100,
      priceMomentum: 50, // Placeholder
    });

    // Store snapshot
    const dateStr = targetDate.toISOString().split("T")[0];
    const snapshot: InsertCampsitePredictionSnapshot = {
      campsiteId,
      date: dateStr as any,
      cancellationProbability: cancellationPred.cancellationProbability,
      bookingLikelihoodScore: bookingPred.bookingLikelihoodScore,
      estimatedHoursUntilBooked: bookingPred.estimatedHoursUntilBooked ?? undefined,
      geoDemandScore: bookingPred.factors.demandScore * 100,
      volatilityIndex: cancellationPred.factors.historicalFrequency,
      intelligenceScore: intelligenceScore.intelligenceScore,
      confidenceScore: cancellationPred.confidenceScore,
    };

    await db.insert(campsitePredictionSnapshots).values(snapshot);

    console.log(`Generated prediction snapshot for campsite ${campsiteId} on ${dateStr}`);
  } catch (error) {
    console.error(`Failed to generate prediction for campsite ${campsiteId}:`, error);
    throw error;
  }
}

/**
 * Calculate composite intelligence score
 */
function calculateIntelligenceScore(
  components: IntelligenceScore["components"],
): IntelligenceScore {
  const weights = {
    demandScore: 0.30,
    bookingVelocityScore: 0.25,
    cancellationVolatility: 0.20,
    providerReliability: 0.15,
    priceMomentum: 0.10,
  };

  const score =
    (components.demandScore / 100) * weights.demandScore +
    (components.bookingVelocityScore / 100) * weights.bookingVelocityScore +
    (components.cancellationVolatility / 100) * weights.cancellationVolatility +
    (components.providerReliability / 100) * weights.providerReliability +
    (components.priceMomentum / 100) * weights.priceMomentum;

  return {
    intelligenceScore: Math.round(score * 100),
    components,
  };
}

/**
 * Compute and store historical stats for a campsite
 */
export async function updateHistoricalStats(campsiteId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const stats = await computeHistoricalStats(campsiteId);

    const entry: InsertCampsiteHistoricalStats = {
      campsiteId,
      avgDaysBookedInAdvance: stats.avgDaysBookedInAdvance ?? undefined,
      cancellationFrequency: stats.cancellationFrequency ?? 0,
      weekendFillRate: stats.weekendFillRate ?? 0,
      holidayFillRate: stats.holidayFillRate ?? 0,
      avgTimeOpenBeforeBooked: stats.avgTimeOpenBeforeBooked ?? undefined,
      volatilityScore: stats.volatilityScore ?? 0,
      providerReliabilityAdjustment: stats.providerReliabilityAdjustment ?? 1.0,
      geoDemandPercentile: stats.geoDemandPercentile ?? 50,
      sampleSize: stats.sampleSize ?? 0,
    };

    // Upsert (insert or update)
    const [existing] = await db
      .select()
      .from(campsiteHistoricalStats)
      .where(eq(campsiteHistoricalStats.campsiteId, campsiteId))
      .limit(1);

    if (existing) {
      await db
        .update(campsiteHistoricalStats)
        .set(entry)
        .where(eq(campsiteHistoricalStats.campsiteId, campsiteId));
    } else {
      await db.insert(campsiteHistoricalStats).values(entry);
    }

    console.log(`Updated historical stats for campsite ${campsiteId}`);
  } catch (error) {
    console.error(`Failed to update historical stats for campsite ${campsiteId}:`, error);
    throw error;
  }
}

/**
 * Backfill predictions for all campsites for the next N days
 */
export async function backfillPredictions(
  daysAhead: number = 30,
  batchSize: number = 10,
): Promise<{ processed: number; errors: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log(`Starting backfill for ${daysAhead} days ahead...`);

  // Get all campsites
  const allCampsites = await db.select({ id: campsites.id }).from(campsites);

  let processed = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < allCampsites.length; i += batchSize) {
    const batch = allCampsites.slice(i, i + batchSize);

    // Update historical stats for each campsite in batch
    for (const campsite of batch) {
      try {
        await updateHistoricalStats(campsite.id);
      } catch (error) {
        console.error(`Failed to update stats for campsite ${campsite.id}:`, error);
        errors++;
      }
    }

    // Generate predictions for next N days
    for (let day = 0; day < daysAhead; day++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + day);

      for (const campsite of batch) {
        try {
          await generatePredictionSnapshot(campsite.id, targetDate);
          processed++;
        } catch (error) {
          console.error(
            `Failed to generate prediction for campsite ${campsite.id} on ${targetDate.toISOString()}:`,
            error,
          );
          errors++;
        }
      }
    }

    console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allCampsites.length / batchSize)}`);
  }

  console.log(`Backfill complete: ${processed} predictions generated, ${errors} errors`);

  return { processed, errors };
}

/**
 * Incremental update: generate predictions for new dates only
 */
export async function incrementalUpdate(
  daysAhead: number = 30,
): Promise<{ processed: number; errors: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log(`Starting incremental update for ${daysAhead} days ahead...`);

  const allCampsites = await db.select({ id: campsites.id }).from(campsites);

  let processed = 0;
  let errors = 0;

  for (const campsite of allCampsites) {
    // Update historical stats
    try {
      await updateHistoricalStats(campsite.id);
    } catch (error) {
      console.error(`Failed to update stats for campsite ${campsite.id}:`, error);
      errors++;
    }

    // Check which dates need predictions
    for (let day = 0; day < daysAhead; day++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + day);
      const dateStr = targetDate.toISOString().split("T")[0];

      // Check if prediction already exists for today
      const [existing] = await db
        .select()
        .from(campsitePredictionSnapshots)
        .where(
          sql`${campsitePredictionSnapshots.campsiteId} = ${campsite.id} AND ${campsitePredictionSnapshots.date} = ${dateStr} AND DATE(${campsitePredictionSnapshots.computedAt}) = CURDATE()`,
        )
        .limit(1);

      if (!existing) {
        try {
          await generatePredictionSnapshot(campsite.id, targetDate);
          processed++;
        } catch (error) {
          console.error(
            `Failed to generate prediction for campsite ${campsite.id} on ${dateStr}:`,
            error,
          );
          errors++;
        }
      }
    }
  }

  console.log(`Incremental update complete: ${processed} predictions generated, ${errors} errors`);

  return { processed, errors };
}
