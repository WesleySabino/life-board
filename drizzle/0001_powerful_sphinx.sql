CREATE TABLE `calendar_snapshots` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL,
	`stale` integer DEFAULT 0 NOT NULL,
	`stale_reason` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_calendar_links` (
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `task_id`)
);
