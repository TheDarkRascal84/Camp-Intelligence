import { buildCampsiteFeatureVector, CampsiteFeatureVector } from "./feature-engineering";

export interface BookingLikelihoodPrediction {
  bookingLikelihoodScore: number; // 0-100
  estimatedHoursUntilBooked: number | null;
  urgencyLevel: "low" | "medium" | "high" | "critical";
  factors: {
    demandScore: number;
    seasonalMultiplier: number;
    weekendMultiplier: number;
    bookingVelocity: number;
    popularityScore: number;
  };
}

/**
 * Predict how quickly an available campsite will be booked
 * 
 * This model estimates booking velocity based on demand patterns,
 * seasonality, and historical booking behavior.
 */
export async function predictBookingLikelihood(
  campsiteId: number,
  targetDate: Date,
): Promise<BookingLikelihoodPrediction> {
  // Build feature vector
  const features = await buildCampsiteFeatureVector(campsiteId, targetDate);

  // Only predict for available sites
  if (!features.currentAvailability) {
    return {
      bookingLikelihoodScore: 0,
      estimatedHoursUntilBooked: null,
      urgencyLevel: "low",
      factors: {
        demandScore: 0,
        seasonalMultiplier: 0,
        weekendMultiplier: 0,
        bookingVelocity: 0,
        popularityScore: 0,
      },
    };
  }

  // Calculate individual factors
  const factors = calculateBookingFactors(features);

  // Compute booking likelihood score (0-100)
  const bookingLikelihoodScore = computeBookingLikelihoodScore(factors);

  // Estimate hours until booked
  const estimatedHoursUntilBooked = estimateTimeToBook(
    bookingLikelihoodScore,
    features,
  );

  // Determine urgency level
  const urgencyLevel = determineUrgencyLevel(bookingLikelihoodScore);

  return {
    bookingLikelihoodScore,
    estimatedHoursUntilBooked,
    urgencyLevel,
    factors,
  };
}

/**
 * Calculate individual factors contributing to booking likelihood
 */
function calculateBookingFactors(features: CampsiteFeatureVector) {
  // Demand score based on geo demand percentile
  const demandScore = features.geoDemandPercentile / 100;

  // Seasonal multiplier (peak season = higher booking likelihood)
  const seasonalMultiplier = features.seasonalityFactor;

  // Weekend multiplier (weekends book faster)
  const weekendMultiplier = features.isWeekend ? 1.5 : 1.0;

  // Booking velocity based on historical fill rates
  const avgFillRate = (features.weekendFillRate + features.holidayFillRate) / 2;
  const bookingVelocity = avgFillRate;

  // Popularity score
  const popularityScore = features.campgroundPopularityScore / 100;

  return {
    demandScore,
    seasonalMultiplier,
    weekendMultiplier,
    bookingVelocity,
    popularityScore,
  };
}

/**
 * Compute booking likelihood score (0-100)
 */
function computeBookingLikelihoodScore(
  factors: BookingLikelihoodPrediction["factors"],
): number {
  // Weighted combination
  const weights = {
    demandScore: 0.30,
    seasonalMultiplier: 0.20,
    weekendMultiplier: 0.15,
    bookingVelocity: 0.20,
    popularityScore: 0.15,
  };

  const score =
    factors.demandScore * weights.demandScore +
    factors.seasonalMultiplier * weights.seasonalMultiplier +
    (factors.weekendMultiplier - 1.0) * 0.5 * weights.weekendMultiplier +
    factors.bookingVelocity * weights.bookingVelocity +
    factors.popularityScore * weights.popularityScore;

  // Scale to 0-100
  return Math.round(Math.max(0, Math.min(100, score * 100)));
}

/**
 * Estimate hours until the site will be booked
 */
function estimateTimeToBook(
  bookingLikelihoodScore: number,
  features: CampsiteFeatureVector,
): number | null {
  if (bookingLikelihoodScore === 0) {
    return null;
  }

  // Base time-to-book distribution
  // High score = faster booking
  let baseHours: number;

  if (bookingLikelihoodScore >= 90) {
    baseHours = 6; // 6 hours
  } else if (bookingLikelihoodScore >= 75) {
    baseHours = 24; // 1 day
  } else if (bookingLikelihoodScore >= 60) {
    baseHours = 72; // 3 days
  } else if (bookingLikelihoodScore >= 40) {
    baseHours = 168; // 1 week
  } else if (bookingLikelihoodScore >= 20) {
    baseHours = 336; // 2 weeks
  } else {
    baseHours = 720; // 1 month
  }

  // Adjust based on days until check-in
  // Sites closer to check-in date book faster
  if (features.daysUntilCheckIn <= 7) {
    baseHours *= 0.5;
  } else if (features.daysUntilCheckIn <= 14) {
    baseHours *= 0.7;
  } else if (features.daysUntilCheckIn >= 60) {
    baseHours *= 1.5;
  }

  // Adjust for historical average time open before booked
  if (features.avgTimeOpenBeforeBooked) {
    // Blend historical data with model prediction
    baseHours = (baseHours + features.avgTimeOpenBeforeBooked) / 2;
  }

  return Math.round(baseHours);
}

/**
 * Determine urgency level for user-facing display
 */
function determineUrgencyLevel(
  bookingLikelihoodScore: number,
): BookingLikelihoodPrediction["urgencyLevel"] {
  if (bookingLikelihoodScore >= 85) {
    return "critical"; // Book immediately
  } else if (bookingLikelihoodScore >= 70) {
    return "high"; // Book soon
  } else if (bookingLikelihoodScore >= 40) {
    return "medium"; // Moderate urgency
  } else {
    return "low"; // Low urgency
  }
}

/**
 * Batch predict booking likelihood for multiple campsites
 */
export async function batchPredictBookingLikelihood(
  campsiteIds: number[],
  targetDate: Date,
): Promise<Map<number, BookingLikelihoodPrediction>> {
  const results = new Map<number, BookingLikelihoodPrediction>();

  for (const campsiteId of campsiteIds) {
    try {
      const prediction = await predictBookingLikelihood(campsiteId, targetDate);
      results.set(campsiteId, prediction);
    } catch (error) {
      console.error(`Failed to predict booking likelihood for campsite ${campsiteId}:`, error);
      results.set(campsiteId, {
        bookingLikelihoodScore: 0,
        estimatedHoursUntilBooked: null,
        urgencyLevel: "low",
        factors: {
          demandScore: 0,
          seasonalMultiplier: 0,
          weekendMultiplier: 0,
          bookingVelocity: 0,
          popularityScore: 0,
        },
      });
    }
  }

  return results;
}
