import { buildCampsiteFeatureVector, CampsiteFeatureVector } from "./feature-engineering";

export interface CancellationPrediction {
  cancellationProbability: number; // 0-1
  confidenceScore: number; // 0-1
  factors: {
    historicalFrequency: number;
    daysUntilCheckIn: number;
    popularityScore: number;
    holidayProximity: number;
    weekendFactor: number;
    providerReliability: number;
  };
}

/**
 * Predict the likelihood that a booked campsite will reopen due to cancellation
 * 
 * This is a deterministic model based on historical patterns and temporal factors.
 * Higher scores indicate higher likelihood of cancellation.
 */
export async function predictCancellationProbability(
  campsiteId: number,
  targetDate: Date,
): Promise<CancellationPrediction> {
  // Build feature vector
  const features = await buildCampsiteFeatureVector(campsiteId, targetDate);

  // Calculate individual factor scores
  const factors = calculateCancellationFactors(features);

  // Compute weighted cancellation probability
  const cancellationProbability = computeCancellationScore(factors);

  // Confidence is based on sample size and data quality
  const confidenceScore = features.confidenceScore;

  return {
    cancellationProbability,
    confidenceScore,
    factors,
  };
}

/**
 * Calculate individual factors contributing to cancellation probability
 */
function calculateCancellationFactors(features: CampsiteFeatureVector) {
  // Historical cancellation frequency (0-1)
  const historicalFrequency = features.cancellationFrequency;

  // Days until check-in factor
  // Cancellations are more likely closer to check-in date
  // Peak cancellation window: 3-7 days before
  let daysUntilCheckInScore = 0;
  if (features.daysUntilCheckIn < 0) {
    daysUntilCheckInScore = 0; // Past dates
  } else if (features.daysUntilCheckIn <= 3) {
    daysUntilCheckInScore = 0.9; // Very close to check-in
  } else if (features.daysUntilCheckIn <= 7) {
    daysUntilCheckInScore = 1.0; // Peak cancellation window
  } else if (features.daysUntilCheckIn <= 14) {
    daysUntilCheckInScore = 0.7;
  } else if (features.daysUntilCheckIn <= 30) {
    daysUntilCheckInScore = 0.5;
  } else {
    daysUntilCheckInScore = 0.3; // Far future
  }

  // Popularity score (inverse relationship)
  // More popular campgrounds have lower cancellation rates
  const popularityScore = 1.0 - (features.campgroundPopularityScore / 100);

  // Holiday proximity
  // Cancellations are less likely near holidays
  const holidayProximity = features.isHoliday ? 0.5 : 1.0;

  // Weekend factor
  // Weekend bookings have slightly lower cancellation rates
  const weekendFactor = features.isWeekend ? 0.8 : 1.0;

  // Provider reliability
  // More reliable providers have more accurate booking data
  const providerReliability = features.providerReliabilityAdjustment;

  return {
    historicalFrequency,
    daysUntilCheckIn: daysUntilCheckInScore,
    popularityScore,
    holidayProximity,
    weekendFactor,
    providerReliability,
  };
}

/**
 * Compute final cancellation probability score using weighted factors
 */
function computeCancellationScore(factors: CancellationPrediction["factors"]): number {
  // Weighted combination of factors
  const weights = {
    historicalFrequency: 0.35,
    daysUntilCheckIn: 0.25,
    popularityScore: 0.15,
    holidayProximity: 0.10,
    weekendFactor: 0.10,
    providerReliability: 0.05,
  };

  const score =
    factors.historicalFrequency * weights.historicalFrequency +
    factors.daysUntilCheckIn * weights.daysUntilCheckIn +
    factors.popularityScore * weights.popularityScore +
    factors.holidayProximity * weights.holidayProximity +
    factors.weekendFactor * weights.weekendFactor +
    factors.providerReliability * weights.providerReliability;

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, score));
}

/**
 * Batch predict cancellation probabilities for multiple campsites
 */
export async function batchPredictCancellations(
  campsiteIds: number[],
  targetDate: Date,
): Promise<Map<number, CancellationPrediction>> {
  const results = new Map<number, CancellationPrediction>();

  for (const campsiteId of campsiteIds) {
    try {
      const prediction = await predictCancellationProbability(campsiteId, targetDate);
      results.set(campsiteId, prediction);
    } catch (error) {
      console.error(`Failed to predict cancellation for campsite ${campsiteId}:`, error);
      // Set default prediction on error
      results.set(campsiteId, {
        cancellationProbability: 0,
        confidenceScore: 0,
        factors: {
          historicalFrequency: 0,
          daysUntilCheckIn: 0,
          popularityScore: 0,
          holidayProximity: 0,
          weekendFactor: 0,
          providerReliability: 0,
        },
      });
    }
  }

  return results;
}
