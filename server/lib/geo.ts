import { getDb } from '../db';
import { campgrounds } from '../../drizzle/schema';
import { and, gte, lte, sql } from 'drizzle-orm';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface CampgroundWithDistance {
  id: number;
  name: string;
  provider: string;
  externalId: string;
  locationLat: number;
  locationLng: number;
  distance: number; // in miles
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 3958.8; // Earth's radius in miles
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bounding box for a given center point and radius
 */
export function calculateBoundingBox(center: GeoPoint, radiusMiles: number): BoundingBox {
  const latDelta = radiusMiles / 69.0;
  const lngDelta = radiusMiles / (69.0 * Math.cos((center.lat * Math.PI) / 180));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/**
 * Search for campgrounds within a radius
 */
export async function searchCampgroundsByRadius(
  center: GeoPoint,
  radiusMiles: number,
): Promise<CampgroundWithDistance[]> {
  const db = await getDb();
  if (!db) return [];

  const bbox = calculateBoundingBox(center, radiusMiles);

  const results = await db
    .select()
    .from(campgrounds)
    .where(
      and(
        gte(campgrounds.locationLat, bbox.minLat),
        lte(campgrounds.locationLat, bbox.maxLat),
        gte(campgrounds.locationLng, bbox.minLng),
        lte(campgrounds.locationLng, bbox.maxLng),
      ),
    );

  const withDistance = results
    .map((campground) => {
      const distance = calculateDistance(center, {
        lat: campground.locationLat,
        lng: campground.locationLng,
      });

      return {
        id: campground.id,
        name: campground.name,
        provider: campground.provider,
        externalId: campground.externalId,
        locationLat: campground.locationLat,
        locationLng: campground.locationLng,
        distance,
      };
    })
    .filter((result) => result.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance);

  return withDistance;
}
