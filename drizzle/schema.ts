import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, boolean, date, unique, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Campground tables
export const campgrounds = mysqlTable("campgrounds", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  provider: mysqlEnum("provider", ["recreation_gov", "reserve_california", "mock"]).notNull(),
  externalId: varchar("externalId", { length: 255 }).notNull(),
  locationLat: float("locationLat").notNull(),
  locationLng: float("locationLng").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerExternalIdx: unique().on(table.provider, table.externalId),
  locationIdx: index("location_idx").on(table.locationLat, table.locationLng),
}));

export type Campground = typeof campgrounds.$inferSelect;
export type InsertCampground = typeof campgrounds.$inferInsert;

export const campsites = mysqlTable("campsites", {
  id: int("id").autoincrement().primaryKey(),
  campgroundId: int("campgroundId").notNull(),
  siteNumber: varchar("siteNumber", { length: 50 }).notNull(),
  siteType: mysqlEnum("siteType", ["tent", "rv", "cabin", "group", "other"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  campgroundSiteIdx: unique().on(table.campgroundId, table.siteNumber),
  campgroundIdx: index("campground_idx").on(table.campgroundId),
}));

export type Campsite = typeof campsites.$inferSelect;
export type InsertCampsite = typeof campsites.$inferInsert;

export const availabilitySnapshots = mysqlTable("availabilitySnapshots", {
  id: int("id").autoincrement().primaryKey(),
  campsiteId: int("campsiteId").notNull(),
  date: date("date").notNull(),
  isAvailable: boolean("isAvailable").notNull(),
  price: float("price"),
  availabilityScore: float("availabilityScore").default(0),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
}, (table) => ({
  campsiteDateCapturedIdx: unique().on(table.campsiteId, table.date, table.capturedAt),
  campsiteDateIdx: index("campsite_date_idx").on(table.campsiteId, table.date),
  dateIdx: index("date_idx").on(table.date),
  scoreIdx: index("score_idx").on(table.availabilityScore),
}));

export type AvailabilitySnapshot = typeof availabilitySnapshots.$inferSelect;
export type InsertAvailabilitySnapshot = typeof availabilitySnapshots.$inferInsert;

// Saved searches
export const savedSearches = mysqlTable("savedSearches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  locationLat: float("locationLat").notNull(),
  locationLng: float("locationLng").notNull(),
  radiusMiles: float("radiusMiles").notNull(),
  startDate: date("startDate"),
  endDate: date("endDate"),
  siteTypes: text("siteTypes"), // JSON array
  minScore: float("minScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
}));

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;

// Alert subscriptions
export const alertSubscriptions = mysqlTable("alertSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  savedSearchId: int("savedSearchId"),
  alertType: mysqlEnum("alertType", ["availability_opened", "score_improved", "cancellation_detected", "price_dropped"]).notNull(),
  channel: mysqlEnum("channel", ["email", "push", "sms"]).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  minScoreThreshold: float("minScoreThreshold"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userEnabledIdx: index("user_enabled_idx").on(table.userId, table.enabled),
  savedSearchIdx: index("saved_search_idx").on(table.savedSearchId),
}));

export type AlertSubscription = typeof alertSubscriptions.$inferSelect;
export type InsertAlertSubscription = typeof alertSubscriptions.$inferInsert;

// Notification history
export const notificationHistory = mysqlTable("notificationHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channel: mysqlEnum("channel", ["email", "push", "sms"]).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "bounced"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  metadata: text("metadata"), // JSON
  sentAt: timestamp("sentAt"),
  failedAt: timestamp("failedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("user_created_idx").on(table.userId, table.createdAt),
  statusIdx: index("status_idx").on(table.status),
}));

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;

// Intelligence layer tables
export const campsiteHistoricalStats = mysqlTable("campsiteHistoricalStats", {
  id: int("id").autoincrement().primaryKey(),
  campsiteId: int("campsiteId").notNull().unique(),
  avgDaysBookedInAdvance: float("avgDaysBookedInAdvance"),
  cancellationFrequency: float("cancellationFrequency").default(0),
  weekendFillRate: float("weekendFillRate").default(0),
  holidayFillRate: float("holidayFillRate").default(0),
  avgTimeOpenBeforeBooked: float("avgTimeOpenBeforeBooked"),
  volatilityScore: float("volatilityScore").default(0),
  providerReliabilityAdjustment: float("providerReliabilityAdjustment").default(1.0),
  geoDemandPercentile: float("geoDemandPercentile").default(50),
  sampleSize: int("sampleSize").default(0),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  campsiteIdx: index("campsite_idx").on(table.campsiteId),
}));

export type CampsiteHistoricalStats = typeof campsiteHistoricalStats.$inferSelect;
export type InsertCampsiteHistoricalStats = typeof campsiteHistoricalStats.$inferInsert;

export const campsitePredictionSnapshots = mysqlTable("campsitePredictionSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  campsiteId: int("campsiteId").notNull(),
  date: date("date").notNull(),
  cancellationProbability: float("cancellationProbability").default(0),
  bookingLikelihoodScore: float("bookingLikelihoodScore").default(0),
  estimatedHoursUntilBooked: float("estimatedHoursUntilBooked"),
  geoDemandScore: float("geoDemandScore").default(0),
  volatilityIndex: float("volatilityIndex").default(0),
  intelligenceScore: float("intelligenceScore").default(0),
  confidenceScore: float("confidenceScore").default(0),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (table) => ({
  campsiteDateIdx: unique().on(table.campsiteId, table.date, table.computedAt),
  campsiteIdx: index("campsite_idx").on(table.campsiteId),
  dateIdx: index("date_idx").on(table.date),
  intelligenceScoreIdx: index("intelligence_score_idx").on(table.intelligenceScore),
}));

export type CampsitePredictionSnapshot = typeof campsitePredictionSnapshots.$inferSelect;
export type InsertCampsitePredictionSnapshot = typeof campsitePredictionSnapshots.$inferInsert;

export const campsitePriceHistory = mysqlTable("campsitePriceHistory", {
  id: int("id").autoincrement().primaryKey(),
  campsiteId: int("campsiteId").notNull(),
  date: date("date").notNull(),
  price: float("price").notNull(),
  priceChange: float("priceChange"),
  priceChangePercent: float("priceChangePercent"),
  isWeekend: boolean("isWeekend").default(false),
  isHoliday: boolean("isHoliday").default(false),
  eventType: mysqlEnum("eventType", ["price_spike", "price_drop", "normal"]).default("normal"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
}, (table) => ({
  campsiteDateIdx: index("campsite_date_idx").on(table.campsiteId, table.date),
  eventTypeIdx: index("event_type_idx").on(table.eventType),
}));

export type CampsitePriceHistory = typeof campsitePriceHistory.$inferSelect;
export type InsertCampsitePriceHistory = typeof campsitePriceHistory.$inferInsert;

export const predictionEvaluations = mysqlTable("predictionEvaluations", {
  id: int("id").autoincrement().primaryKey(),
  predictionSnapshotId: int("predictionSnapshotId").notNull(),
  campsiteId: int("campsiteId").notNull(),
  predictionType: mysqlEnum("predictionType", ["cancellation", "booking_time", "demand"]).notNull(),
  predictedValue: float("predictedValue").notNull(),
  actualValue: float("actualValue"),
  error: float("error"),
  absoluteError: float("absoluteError"),
  evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
}, (table) => ({
  snapshotIdx: index("snapshot_idx").on(table.predictionSnapshotId),
  typeIdx: index("type_idx").on(table.predictionType),
}));

export type PredictionEvaluation = typeof predictionEvaluations.$inferSelect;
export type InsertPredictionEvaluation = typeof predictionEvaluations.$inferInsert;
