import { getDb } from '../db';
import { campgrounds, campsites, availabilitySnapshots } from '../../drizzle/schema';
import { searchCampgroundsByRadius, type GeoPoint } from './geo';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

export const SearchParamsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(1).max(500).default(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  siteTypes: z.array(z.enum(['tent', 'rv', 'cabin', 'group', 'other'])).optional(),
  minScore: z.number().min(0).max(100).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export interface SearchResult {
  campgroundId: number;
  campgroundName: string;
  provider: string;
  externalId: string;
  locationLat: number;
  locationLng: number;
  distance: number;
  availableSites: Array<{
    campsiteId: number;
    siteNumber: string;
    siteType: string;
    availableDates: Array<{
      date: string;
      price: number | null;
      score: number;
    }>;
  }>;
  totalAvailableSites: number;
  avgScore: number;
}

export interface SearchResponse {
  results: SearchResult[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    params: SearchParams;
  };
}

/**
 * Search for campsites with availability
 */
export async function search(params: SearchParams): Promise<SearchResponse> {
  const db = await getDb();
  if (!db) {
    return {
      results: [],
      meta: {
        total: 0,
        limit: params.limit,
        offset: params.offset,
        params,
      },
    };
  }

  const center: GeoPoint = { lat: params.lat, lng: params.lng };
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Find campgrounds within radius
  const campgroundsWithDistance = await searchCampgroundsByRadius(center, params.radius);

  if (campgroundsWithDistance.length === 0) {
    return {
      results: [],
      meta: {
        total: 0,
        limit: params.limit,
        offset: params.offset,
        params,
      },
    };
  }

  const campgroundIds = campgroundsWithDistance.map((c) => c.id);

  // Build campsite query conditions
  const campsiteConditions = [inArray(campsites.campgroundId, campgroundIds)];
  if (params.siteTypes && params.siteTypes.length > 0) {
    campsiteConditions.push(inArray(campsites.siteType, params.siteTypes as any[]));
  }

  // Query campsites
  const campsiteResults = await db
    .select()
    .from(campsites)
    .where(and(...campsiteConditions));

  if (campsiteResults.length === 0) {
    return {
      results: [],
      meta: {
        total: 0,
        limit: params.limit,
        offset: params.offset,
        params,
      },
    };
  }

  const campsiteIds = campsiteResults.map((c) => c.id);

  // Build availability query conditions
  const availabilityConditions = [
    inArray(availabilitySnapshots.campsiteId, campsiteIds),
    gte(availabilitySnapshots.date, startDate),
    lte(availabilitySnapshots.date, endDate),
    eq(availabilitySnapshots.isAvailable, true),
  ];

  if (params.minScore !== undefined) {
    availabilityConditions.push(gte(availabilitySnapshots.availabilityScore, params.minScore));
  }

  // Query availability snapshots
  const snapshotResults = await db
    .select()
    .from(availabilitySnapshots)
    .where(and(...availabilityConditions))
    .orderBy(availabilitySnapshots.date);

  // Group by campground
  const campgroundMap = new Map<number, SearchResult>();

  for (const snapshot of snapshotResults) {
    const campsite = campsiteResults.find((c) => c.id === snapshot.campsiteId);
    if (!campsite) continue;

    const campgroundId = campsite.campgroundId;

    if (!campgroundMap.has(campgroundId)) {
      const campgroundWithDistance = campgroundsWithDistance.find((c) => c.id === campgroundId);
      if (!campgroundWithDistance) continue;

      campgroundMap.set(campgroundId, {
        campgroundId,
        campgroundName: campgroundWithDistance.name,
        provider: campgroundWithDistance.provider,
        externalId: campgroundWithDistance.externalId,
        locationLat: campgroundWithDistance.locationLat,
        locationLng: campgroundWithDistance.locationLng,
        distance: campgroundWithDistance.distance,
        availableSites: [],
        totalAvailableSites: 0,
        avgScore: 0,
      });
    }

    const result = campgroundMap.get(campgroundId)!;

    // Find or create site entry
    let siteEntry = result.availableSites.find((s) => s.campsiteId === campsite.id);
    if (!siteEntry) {
      siteEntry = {
        campsiteId: campsite.id,
        siteNumber: campsite.siteNumber,
        siteType: campsite.siteType,
        availableDates: [],
      };
      result.availableSites.push(siteEntry);
      result.totalAvailableSites++;
    }

    siteEntry.availableDates.push({
      date: snapshot.date.toISOString().split('T')[0],
      price: snapshot.price,
      score: snapshot.availabilityScore || 0,
    });
  }

  // Calculate average scores
  const results = Array.from(campgroundMap.values()).map((result) => {
    const allScores = result.availableSites.flatMap((site) =>
      site.availableDates.map((d) => d.score),
    );
    result.avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
        : 0;
    return result;
  });

  // Sort by distance
  results.sort((a, b) => a.distance - b.distance);

  // Apply pagination
  const total = results.length;
  const paginatedResults = results.slice(params.offset, params.offset + params.limit);

  return {
    results: paginatedResults,
    meta: {
      total,
      limit: params.limit,
      offset: params.offset,
      params,
    },
  };
}
