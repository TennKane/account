ALTER TABLE `accounts` ADD `is_default_tx` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `is_default_repay` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `is_default_receive` integer DEFAULT 0 NOT NULL;