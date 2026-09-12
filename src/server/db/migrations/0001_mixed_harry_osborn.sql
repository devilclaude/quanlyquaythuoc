CREATE TABLE `lo_hang` (
	`id` text PRIMARY KEY NOT NULL,
	`san_pham_id` text NOT NULL,
	`so_lo` text,
	`hsd` text,
	`la_lo_mac_dinh` integer DEFAULT false NOT NULL,
	`ngay_tao` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`san_pham_id`) REFERENCES `san_pham`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lo_hang_mot_lo_mac_dinh_moi_san_pham` ON `lo_hang` (`san_pham_id`) WHERE "lo_hang"."la_lo_mac_dinh" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `lo_hang_san_pham_so_lo_hsd_unique` ON `lo_hang` (`san_pham_id`,`so_lo`,`hsd`);