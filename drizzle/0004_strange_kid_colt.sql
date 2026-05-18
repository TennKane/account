CREATE TABLE `receivables` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`remaining_amount` real NOT NULL,
	`person` text NOT NULL,
	`description` text DEFAULT '',
	`date` integer NOT NULL,
	`settled_date` integer,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
