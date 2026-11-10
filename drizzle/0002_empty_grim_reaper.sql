CREATE TABLE `commerce_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`reference` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`document_id` text,
	`document_number` text,
	`uncertain` integer DEFAULT 0 NOT NULL,
	`uncertain_sequence` integer DEFAULT 0 NOT NULL,
	`error` text,
	`last_attempt` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`token_hash` text NOT NULL,
	`reference` text NOT NULL,
	`snapshot` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`payment_id` text,
	`provider_mode` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`paid_at` text,
	`fulfilment` text DEFAULT 'Unfulfilled' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_request_unique` ON `orders` (`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `order_payment_unique` ON `orders` (`payment_id`);