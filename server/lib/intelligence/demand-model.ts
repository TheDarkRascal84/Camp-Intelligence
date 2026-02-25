import { getDb } from "../../db";
import {
  campgrounds,
  campsites,
  availabilitySnapshots,
  savedSearches,
} from "../../../drizzle/schema";
import { sql, and, gte } from "drizzle-orm";
import { calculateDistance } from "../geo";

export interface GeoDemandScore {
  lat: number;
  lng: number;
  geoDemandScore: number; // 0-100
  demandPercentile: number; // 0-100
  factors: {
    searchVolume: number;
    savedSearchCount: number;
    bookingVelocity: number;
    cancellationVolatility: number;
    providerSaturation: number;
  };
}

export interface DemandHeatmapTile {
  tileLat: number;
  tileLng: number;
  demandScore: number;
  campgroundCount: number;
}

/**
 * Calculate geo demand score for a specific location
 */
export async function calculateGeoDemandScore(
  lat: number,
  lng: number,
  radiusMiles: number = 25,
): Promise<GeoDemandScore> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all campgrounds within radius
  const allCampgrounds = await db.select().from(campgrounds);
  const nearbyCampgrounds = allCampgrounds.filter((cg) => {
    const distance = calculateDistance({ lat, lng }, { lat: cg.locationLat, lng: cg.locationLng });
    return distance <= radiusMiles;
  });

  if (nearbyCampgrounds.length === 0) {
    return {
      lat,
      lng,
      geoDemandScore: 0,
      demandPercentile: 0,
      factors: {
        searchVolume: 0,
        savedSearchCount: 0,
        bookingVelocity: 0,
        cancellationVolatility: 0,
        providerSaturation: 0,
      },
    };
  }

  // Calculate individual factors
  const factors = await calculateDemandFactors(lat, lng, radiusMiles, nearbyCampgrounds);

  // Compute overall demand score
  const geoDemandScore = computeDemandScore(factors);

  // Calculate percentile (simplified - would need global distribution in production)
  const demandPercentile = Math.min(100, geoDemandScore);

  return {
    lat,
    lng,
    geoDemandScore,
    demandPercentile,
    factors,
  };
}

/**
 * Calculate individual demand factors for a geographic area
 */
async function calculateDemandFactors(
  lat: number,
  lng: number,
  radiusMiles: number,
  nearbyCampgrounds: any[],
): Promise<GeoDemandScore["factors"]> {
  const db = await getDb();
  if (!db) {
    return {
      searchVolume: 0,
      savedSearchCount: 0,
      bookingVelocity: 0,
      cancellationVolatility: 0,
      providerSaturation: 0,
    };
  }

  // Search volume (count of saved searches in this area)
  const allSavedSearches = await db.select().from(savedSearches);
  const nearbySearches = allSavedSearches.filter((search) => {
    const distance = calculateDistance(
      { lat, lng },
      { lat: search.locationLat, lng: search.locationLng },
    );
    return distance <= radiusMiles;
  });
  const searchVolume = Math.min(100, nearbySearches.length * 10);

  // Saved search count
  const savedSearchCount = nearbySearches.length;

  // Booking velocity (average fill rate in this area)
  const campgroundIds = nearbyCampgrounds.map((cg) => cg.id);
  let totalFillRate = 0;
  let siteCount = 0;

  for (const cgId of campgroundIds) {
    const sites = await db
      .select({ id: campsites.id })
      .from(campsites)
      .where(sql`${campsites.campgroundId} = ${cgId}`);

    for (const site of sites) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const snapshots = await db
        .select()
        .from(availabilitySnapshots)
        .where(
          and(
            sql`${availabilitySnapshots.campsiteId} = ${site.id}`,
            gte(availabilitySnapshots.capturedAt, thirtyDaysAgo),
          ),
        );

      if (snapshots.length > 0) {
        const booked = snapshots.filter((s) => !s.isAvailable).length;
        const fillRate = booked / snapshots.length;
        totalFillRate += fillRate;
        siteCount++;
      }
    }
  }

  const bookingVelocity = siteCount > 0 ? (totalFillRate / siteCount) * 100 : 0;

  // Cancellation volatility (average volatility in area)
  const cancellationVolatility = 20; // Simplified - would calculate from historical data

  // Provider saturation (diversity of providers)
  const providers = new Set(nearbyCampgrounds.map((cg) => cg.provider));
  const providerSaturation = (providers.size / 3) * 100; // 3 providers max

  return {
    searchVolume,
    savedSearchCount,
    bookingVelocity,
    cancellationVolatility,
    providerSaturation,
  };
}

/**
 * Compute overall demand score from factors
 */
function computeDemandScore(factors: GeoDemandScore["factors"]): number {
  const weights = {
    searchVolume: 0.30,
    bookingVelocity: 0.30,
    cancellationVolatility: 0.20,
    providerSaturation: 0.20,
  };

  const score =
    (factors.searchVolume / 100) * weights.searchVolume +
    (factors.bookingVelocity / 100) * weights.bookingVelocity +
    (factors.cancellationVolatility / 100) * weights.cancellationVolatility +
    (factors.providerSaturation / 100) * weights.providerSaturation;

  return Math.round(Math.max(0, Math.min(100, score * 100)));
}

/**
 * Generate demand heatmap tiles for a geographic area
 * 
 * Divides the area into a grid and calculates demand score for each tile
 */
export async function generateDemandHeatmap(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  gridSize: number = 10,
): Promise<DemandHeatmapTile[]> {
  const tiles: DemandHeatmapTile[] = [];

  // Convert radius to approximate lat/lng degrees
  // 1 degree latitude ≈ 69 miles
  // 1 degree longitude ≈ 69 * cos(latitude) miles
  const latDegrees = radiusMiles / 69;
  const lngDegrees = radiusMiles / (69 * Math.cos((centerLat * Math.PI) / 180));

  // Calculate grid step size
  const latStep = (latDegrees * 2) / gridSize;
  const lngStep = (lngDegrees * 2) / gridSize;

  // Generate tiles
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const tileLat = centerLat - latDegrees + i * latStep + latStep / 2;
      const tileLng = centerLng - lngDegrees + j * lngStep + lngStep / 2;

      try {
        const demandScore = await calculateGeoDemandScore(
          tileLat,
          tileLng,
          radiusMiles / gridSize,
        );

        // Count campgrounds in this tile
        const db = await getDb();
        const allCampgrounds = db ? await db.select().from(campgrounds) : [];
        const campgroundCount = allCampgrounds.filter((cg) => {
          const distance = calculateDistance(
            { lat: tileLat, lng: tileLng },
            { lat: cg.locationLat, lng: cg.locationLng },
          );
          return distance <= radiusMiles / gridSize;
        }).length;

        tiles.push({
          tileLat,
          tileLng,
          demandScore: demandScore.geoDemandScore,
          campgroundCount,
        });
      } catch (error) {
        console.error(`Failed to calculate demand for tile (${tileLat}, ${tileLng}):`, error);
      }
    }
  }

  return tiles;
}
