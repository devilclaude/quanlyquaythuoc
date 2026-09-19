CREATE TABLE `phieu_xuat_huy` (
	`id` text PRIMARY KEY NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ly_do` text NOT NULL,
	`nguoi_thuc_hien` text NOT NULL,
	`thoi_gian` text NOT NULL,
	`thoi_gian_may_chu` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "phieu_xuat_huy_ly_do_khong_rong" CHECK(length(trim("phieu_xuat_huy"."ly_do")) > 0),
	CONSTRAINT "phieu_xuat_huy_nguoi_thuc_hien_khong_rong" CHECK(length(trim("phieu_xuat_huy"."nguoi_thuc_hien")) > 0)
);
--> statement-breakpoint
CREATE TABLE `phieu_xuat_huy_dong` (
	`id` text PRIMARY KEY NOT NULL,
	`phieu_id` text NOT NULL,
	`lo_id` text NOT NULL,
	`so_luong` integer NOT NULL,
	FOREIGN KEY (`phieu_id`) REFERENCES `phieu_xuat_huy`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lo_id`) REFERENCES `lo_hang`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "phieu_xuat_huy_dong_so_luong_duong" CHECK("phieu_xuat_huy_dong"."so_luong" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phieu_xuat_huy_dong_phieu_lo_unique` ON `phieu_xuat_huy_dong` (`phieu_id`,`lo_id`);