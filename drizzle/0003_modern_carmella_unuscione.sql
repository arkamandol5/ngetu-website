CREATE TABLE `payment_events` (
	`transaction_id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`received_at` text NOT NULL
);
