CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`specification` text NOT NULL,
	`status` text DEFAULT 'Needs Review' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
