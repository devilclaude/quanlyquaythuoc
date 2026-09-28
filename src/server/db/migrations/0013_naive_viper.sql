CREATE TABLE `tra_hang` (
	`id` text PRIMARY KEY NOT NULL,
	`hoa_don_id` text NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ma` text NOT NULL,
	`thoi_gian` text NOT NULL,
	`thoi_gian_may_chu` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`hoa_don_id`) REFERENCES `hoa_don`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tra_hang_ma_unique` ON `tra_hang` (`ma`);--> statement-breakpoint
CREATE TABLE `tra_hang_dong` (
	`id` text PRIMARY KEY NOT NULL,
	`tra_hang_id` text NOT NULL,
	`hoa_don_dong_id` text NOT NULL,
	`so_luong` integer NOT NULL,
	`tien_hoan` integer NOT NULL,
	FOREIGN KEY (`tra_hang_id`) REFERENCES `tra_hang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hoa_don_dong_id`) REFERENCES `hoa_don_dong`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tra_hang_dong_so_luong_duong" CHECK("tra_hang_dong"."so_luong" > 0),
	CONSTRAINT "tra_hang_dong_tien_hoan_khong_am" CHECK("tra_hang_dong"."tien_hoan" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tra_hang_dong_tra_hang_hoa_don_dong_unique` ON `tra_hang_dong` (`tra_hang_id`,`hoa_don_dong_id`);--> statement-breakpoint
CREATE TABLE `tra_hang_dong_lo` (
	`id` text PRIMARY KEY NOT NULL,
	`tra_hang_dong_id` text NOT NULL,
	`lo_id` text NOT NULL,
	`so_luong` integer NOT NULL,
	FOREIGN KEY (`tra_hang_dong_id`) REFERENCES `tra_hang_dong`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lo_id`) REFERENCES `lo_hang`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tra_hang_dong_lo_so_luong_duong" CHECK("tra_hang_dong_lo"."so_luong" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tra_hang_dong_lo_dong_lo_unique` ON `tra_hang_dong_lo` (`tra_hang_dong_id`,`lo_id`);--> statement-breakpoint
ALTER TABLE `hoa_don_dong_lo` ADD `thu_tu` integer DEFAULT 0 NOT NULL;