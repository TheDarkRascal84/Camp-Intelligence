CREATE TABLE `campsiteHistoricalStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campsiteId` int NOT NULL,
	`avgDaysBookedInAdvance` float,
	`cancellationFrequency` float DEFAULT 0,
	`weekendFillRate` float DEFAULT 0,
	`holidayFillRate` float DEFAULT 0,
	`avgTimeOpenBeforeBooked` float,
	`volatilityScore` float DEFAULT 0,
	`providerReliabilityAdjustment` float DEFAULT 1,
	`geoDemandPercentile` float DEFAULT 50,
	`sampleSize` int DEFAULT 0,
	`computedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campsiteHistoricalStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `campsiteHistoricalStats_campsiteId_unique` UNIQUE(`campsiteId`)
);
--> statement-breakpoint
CREATE TABLE `campsitePredictionSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campsiteId` int NOT NULL,
	`date` date NOT NULL,
	`cancellationProbability` float DEFAULT 0,
	`bookingLikelihoodScore` float DEFAULT 0,
	`estimatedHoursUntilBooked` float,
	`geoDemandScore` float DEFAULT 0,
	`volatilityIndex` float DEFAULT 0,
	`intelligenceScore` float DEFAULT 0,
	`confidenceScore` float DEFAULT 0,
	`computedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campsitePredictionSnapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `campsitePredictionSnapshots_campsiteId_date_computedAt_unique` UNIQUE(`campsiteId`,`date`,`computedAt`)
);
--> statement-breakpoint
CREATE TABLE `campsitePriceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campsiteId` int NOT NULL,
	`date` date NOT NULL,
	`price` float NOT NULL,
	`priceChange` float,
	`priceChangePercent` float,
	`isWeekend` boolean DEFAULT false,
	`isHoliday` boolean DEFAULT false,
	`eventType` enum('price_spike','price_drop','normal') DEFAULT 'normal',
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campsitePriceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `predictionEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`predictionSnapshotId` int NOT NULL,
	`campsiteId` int NOT NULL,
	`predictionType` enum('cancellation','booking_time','demand') NOT NULL,
	`predictedValue` float NOT NULL,
	`actualValue` float,
	`error` float,
	`absoluteError` float,
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `predictionEvaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `campsite_idx` ON `campsiteHistoricalStats` (`campsiteId`);--> statement-breakpoint
CREATE INDEX `campsite_idx` ON `campsitePredictionSnapshots` (`campsiteId`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `campsitePredictionSnapshots` (`date`);--> statement-breakpoint
CREATE INDEX `intelligence_score_idx` ON `campsitePredictionSnapshots` (`intelligenceScore`);--> statement-breakpoint
CREATE INDEX `campsite_date_idx` ON `campsitePriceHistory` (`campsiteId`,`date`);--> statement-breakpoint
CREATE INDEX `event_type_idx` ON `campsitePriceHistory` (`eventType`);--> statement-breakpoint
CREATE INDEX `snapshot_idx` ON `predictionEvaluations` (`predictionSnapshotId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `predictionEvaluations` (`predictionType`);