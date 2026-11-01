CREATE TABLE `routine_completions` (
	`owner_id` text NOT NULL,
	`routine_id` text NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`owner_id`, `routine_id`, `date`)
);
--> statement-breakpoint
CREATE INDEX `idx_routine_completions_owner_date` ON `routine_completions` (`owner_id`,`date`);
--> statement-breakpoint
CREATE TRIGGER `routine_completion_record` AFTER UPDATE OF `completed_date` ON `routines`
WHEN NEW.`completed_date` IS NOT NULL AND NEW.`completed_date` IS NOT OLD.`completed_date`
BEGIN
  INSERT OR IGNORE INTO `routine_completions` (`owner_id`, `routine_id`, `date`) VALUES (NEW.`owner_id`, NEW.`id`, NEW.`completed_date`);
END;
--> statement-breakpoint
CREATE TRIGGER `routine_completion_undo` AFTER UPDATE OF `completed_date` ON `routines`
WHEN OLD.`completed_date` IS NOT NULL AND NEW.`completed_date` IS NULL
BEGIN
  DELETE FROM `routine_completions` WHERE `owner_id` = OLD.`owner_id` AND `routine_id` = OLD.`id` AND `date` = OLD.`completed_date`;
END;
