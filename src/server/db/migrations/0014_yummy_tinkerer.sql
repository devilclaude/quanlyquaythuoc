CREATE TABLE `tra_hang_nhap` (
	`id` text PRIMARY KEY NOT NULL,
	`phieu_nhap_id` text NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ma` text NOT NULL,
	`thoi_gian` text NOT NULL,
	`thoi_gian_may_chu` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`phieu_nhap_id`) REFERENCES `phieu_nhap`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tra_hang_nhap_ma_unique` ON `tra_hang_nhap` (`ma`);--> statement-breakpoint
CREATE TABLE `tra_hang_nhap_dong` (
	`id` text PRIMARY KEY NOT NULL,
	`tra_hang_nhap_id` text NOT NULL,
	`phieu_nhap_dong_id` text NOT NULL,
	`so_luong` integer NOT NULL,
	`tien_hoan` integer NOT NULL,
	FOREIGN KEY (`tra_hang_nhap_id`) REFERENCES `tra_hang_nhap`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`phieu_nhap_dong_id`) REFERENCES `phieu_nhap_dong`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tra_hang_nhap_dong_so_luong_duong" CHECK("tra_hang_nhap_dong"."so_luong" > 0),
	CONSTRAINT "tra_hang_nhap_dong_tien_hoan_khong_am" CHECK("tra_hang_nhap_dong"."tien_hoan" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tra_hang_nhap_dong_tra_hang_nhap_phieu_nhap_dong_unique` ON `tra_hang_nhap_dong` (`tra_hang_nhap_id`,`phieu_nhap_dong_id`);