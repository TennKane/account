CREATE TABLE `credit_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`remaining_amount` real NOT NULL,
	`description` text DEFAULT '',
	`source` text NOT NULL,
	`date` integer NOT NULL,
	`category_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
