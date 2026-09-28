CREATE TABLE `phieu_nhap` (
	`id` text PRIMARY KEY NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ma` text NOT NULL,
	`trang_thai` text DEFAULT 'PHIEU_TAM' NOT NULL,
	`thoi_gian` text NOT NULL,
	`thoi_gian_may_chu` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "phieu_nhap_trang_thai_hop_le" CHECK("phieu_nhap"."trang_thai" IN ('PHIEU_TAM', 'HOAN_THANH'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phieu_nhap_ma_unique` ON `phieu_nhap` (`ma`);--> statement-breakpoint
CREATE TABLE `phieu_nhap_dong` (
	`id` text PRIMARY KEY NOT NULL,
	`phieu_id` text NOT NULL,
	`san_pham_id` text NOT NULL,
	`don_vi_ten` text NOT NULL,
	`he_so` integer NOT NULL,
	`don_gia` integer NOT NULL,
	`so_luong` integer NOT NULL,
	`so_lo` text,
	`hsd` text,
	FOREIGN KEY (`phieu_id`) REFERENCES `phieu_nhap`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`san_pham_id`) REFERENCES `san_pham`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "phieu_nhap_dong_he_so_toi_thieu" CHECK("phieu_nhap_dong"."he_so" >= 1),
	CONSTRAINT "phieu_nhap_dong_don_gia_khong_am" CHECK("phieu_nhap_dong"."don_gia" >= 0),
	CONSTRAINT "phieu_nhap_dong_so_luong_duong" CHECK("phieu_nhap_dong"."so_luong" > 0)
);
