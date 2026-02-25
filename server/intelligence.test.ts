import { describe, expect, it } from "vitest";
import { predictCancellationProbability } from "./lib/intelligence/cancellation-model";
import { predictBookingLikelihood } from "./lib/intelligence/booking-model";
import { calculateGeoDemandScore } from "./lib/intelligence/demand-model";

describe("Intelligence Layer", () => {
  describe("Cancellation Prediction", () => {
    it("should return valid cancellation probability", async () => {
      // This is a deterministic test with mock data
      // In production, this would use actual database data
      const result = await predictCancellationProbability(1, new Date());

      expect(result.cancellationProbability).toBeGreaterThanOrEqual(0);
      expect(result.cancellationProbability).toBeLessThanOrEqual(1);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("should have all required factors", async () => {
      const result = await predictCancellationProbability(1, new Date());

      expect(result.factors).toHaveProperty("historicalFrequency");
      expect(result.factors).toHaveProperty("daysUntilCheckIn");
      expect(result.factors).toHaveProperty("popularityScore");
      expect(result.factors).toHaveProperty("holidayProximity");
      expect(result.factors).toHaveProperty("weekendFactor");
      expect(result.factors).toHaveProperty("providerReliability");
    });
  });

  describe("Booking Likelihood Prediction", () => {
    it("should return valid booking likelihood score", async () => {
      const result = await predictBookingLikelihood(1, new Date());

      expect(result.bookingLikelihoodScore).toBeGreaterThanOrEqual(0);
      expect(result.bookingLikelihoodScore).toBeLessThanOrEqual(100);
    });

    it("should determine urgency level correctly", async () => {
      const result = await predictBookingLikelihood(1, new Date());

      expect(["low", "medium", "high", "critical"]).toContain(result.urgencyLevel);
    });

    it("should have all required factors", async () => {
      const result = await predictBookingLikelihood(1, new Date());

      expect(result.factors).toHaveProperty("demandScore");
      expect(result.factors).toHaveProperty("seasonalMultiplier");
      expect(result.factors).toHaveProperty("weekendMultiplier");
      expect(result.factors).toHaveProperty("bookingVelocity");
      expect(result.factors).toHaveProperty("popularityScore");
    });
  });

  describe("Geo Demand Score", () => {
    it("should return valid demand score", async () => {
      const result = await calculateGeoDemandScore(37.7749, -122.4194, 25);

      expect(result.geoDemandScore).toBeGreaterThanOrEqual(0);
      expect(result.geoDemandScore).toBeLessThanOrEqual(100);
      expect(result.demandPercentile).toBeGreaterThanOrEqual(0);
      expect(result.demandPercentile).toBeLessThanOrEqual(100);
    });

    it("should have all required factors", async () => {
      const result = await calculateGeoDemandScore(37.7749, -122.4194, 25);

      expect(result.factors).toHaveProperty("searchVolume");
      expect(result.factors).toHaveProperty("savedSearchCount");
      expect(result.factors).toHaveProperty("bookingVelocity");
      expect(result.factors).toHaveProperty("cancellationVolatility");
      expect(result.factors).toHaveProperty("providerSaturation");
    });

    it("should return zero scores for areas with no campgrounds", async () => {
      // Test a location in the middle of the ocean
      const result = await calculateGeoDemandScore(0, 0, 10);

      expect(result.geoDemandScore).toBe(0);
      expect(result.demandPercentile).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle past dates correctly", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      const cancellationResult = await predictCancellationProbability(1, pastDate);
      const bookingResult = await predictBookingLikelihood(1, pastDate);

      // Past dates should still return valid predictions
      expect(cancellationResult.cancellationProbability).toBeGreaterThanOrEqual(0);
      expect(bookingResult.bookingLikelihoodScore).toBeGreaterThanOrEqual(0);
    });

    it("should handle far future dates correctly", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365);

      const cancellationResult = await predictCancellationProbability(1, futureDate);
      const bookingResult = await predictBookingLikelihood(1, futureDate);

      // Far future dates should still return valid predictions
      expect(cancellationResult.cancellationProbability).toBeGreaterThanOrEqual(0);
      expect(bookingResult.bookingLikelihoodScore).toBeGreaterThanOrEqual(0);
    });

    it("should handle weekend dates correctly", async () => {
      // Find next Saturday
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7));

      const result = await predictBookingLikelihood(1, saturday);

      // Weekend should have higher booking velocity
      expect(result.factors.weekendMultiplier).toBeGreaterThan(1);
    });
  });
});
