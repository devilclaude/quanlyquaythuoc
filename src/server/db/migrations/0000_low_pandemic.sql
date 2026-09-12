CREATE TABLE `chi_nhanh` (
	`id` text PRIMARY KEY NOT NULL,
	`ten` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `don_vi_tinh` (
	`id` text PRIMARY KEY NOT NULL,
	`san_pham_id` text NOT NULL,
	`ten` text NOT NULL,
	`he_so` integer NOT NULL,
	`la_co_so` integer DEFAULT false NOT NULL,
	`gia_ban` integer NOT NULL,
	FOREIGN KEY (`san_pham_id`) REFERENCES `san_pham`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "don_vi_tinh_he_so_toi_thieu" CHECK("don_vi_tinh"."he_so" >= 1),
	CONSTRAINT "don_vi_tinh_gia_ban_khong_am" CHECK("don_vi_tinh"."gia_ban" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `don_vi_tinh_mot_co_so_moi_san_pham` ON `don_vi_tinh` (`san_pham_id`) WHERE "don_vi_tinh"."la_co_so" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `don_vi_tinh_san_pham_ten_unique` ON `don_vi_tinh` (`san_pham_id`,`ten`);--> statement-breakpoint
CREATE TABLE `san_pham` (
	`id` text PRIMARY KEY NOT NULL,
	`ma_hang` text NOT NULL,
	`ten` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `san_pham_ma_hang_unique` ON `san_pham` (`ma_hang`);