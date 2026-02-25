CREATE TABLE `alertSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`savedSearchId` int,
	`alertType` enum('availability_opened','score_improved','cancellation_detected','price_dropped') NOT NULL,
	`channel` enum('email','push','sms') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`minScoreThreshold` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `availabilitySnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campsiteId` int NOT NULL,
	`date` date NOT NULL,
	`isAvailable` boolean NOT NULL,
	`price` float,
	`availabilityScore` float DEFAULT 0,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availabilitySnapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `availabilitySnapshots_campsiteId_date_capturedAt_unique` UNIQUE(`campsiteId`,`date`,`capturedAt`)
);
--> statement-breakpoint
CREATE TABLE `campgrounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` enum('recreation_gov','reserve_california','mock') NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`locationLat` float NOT NULL,
	`locationLng` float NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campgrounds_id` PRIMARY KEY(`id`),
	CONSTRAINT `campgrounds_provider_externalId_unique` UNIQUE(`provider`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `campsites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campgroundId` int NOT NULL,
	`siteNumber` varchar(50) NOT NULL,
	`siteType` enum('tent','rv','cabin','group','other') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campsites_id` PRIMARY KEY(`id`),
	CONSTRAINT `campsites_campgroundId_siteNumber_unique` UNIQUE(`campgroundId`,`siteNumber`)
);
--> statement-breakpoint
CREATE TABLE `notificationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('email','push','sms') NOT NULL,
	`status` enum('pending','sent','failed','bounced') NOT NULL,
	`subject` varchar(255),
	`body` text NOT NULL,
	`metadata` text,
	`sentAt` timestamp,
	`failedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savedSearches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`locationLat` float NOT NULL,
	`locationLng` float NOT NULL,
	`radiusMiles` float NOT NULL,
	`startDate` date,
	`endDate` date,
	`siteTypes` text,
	`minScore` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedSearches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_enabled_idx` ON `alertSubscriptions` (`userId`,`enabled`);--> statement-breakpoint
CREATE INDEX `saved_search_idx` ON `alertSubscriptions` (`savedSearchId`);--> statement-breakpoint
CREATE INDEX `campsite_date_idx` ON `availabilitySnapshots` (`campsiteId`,`date`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `availabilitySnapshots` (`date`);--> statement-breakpoint
CREATE INDEX `score_idx` ON `availabilitySnapshots` (`availabilityScore`);--> statement-breakpoint
CREATE INDEX `location_idx` ON `campgrounds` (`locationLat`,`locationLng`);--> statement-breakpoint
CREATE INDEX `campground_idx` ON `campsites` (`campgroundId`);--> statement-breakpoint
CREATE INDEX `user_created_idx` ON `notificationHistory` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `notificationHistory` (`status`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `savedSearches` (`userId`);