CREATE TABLE `phieu_kiem_ke` (
	`id` text PRIMARY KEY NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ly_do` text NOT NULL,
	`thoi_gian` text NOT NULL,
	`thoi_gian_may_chu` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "phieu_kiem_ke_ly_do_khong_rong" CHECK(length(trim("phieu_kiem_ke"."ly_do")) > 0)
);
--> statement-breakpoint
CREATE TABLE `phieu_kiem_ke_dong` (
	`id` text PRIMARY KEY NOT NULL,
	`phieu_id` text NOT NULL,
	`lo_id` text NOT NULL,
	`so_luong_so_sach` integer NOT NULL,
	`so_luong_thuc_te` integer NOT NULL,
	FOREIGN KEY (`phieu_id`) REFERENCES `phieu_kiem_ke`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lo_id`) REFERENCES `lo_hang`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "phieu_kiem_ke_dong_so_luong_thuc_te_khong_am" CHECK("phieu_kiem_ke_dong"."so_luong_thuc_te" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phieu_kiem_ke_dong_phieu_lo_unique` ON `phieu_kiem_ke_dong` (`phieu_id`,`lo_id`);