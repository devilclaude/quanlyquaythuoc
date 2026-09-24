CREATE TABLE `hoa_don` (
	`id` text PRIMARY KEY NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ma` text NOT NULL,
	`phuong_thuc_thanh_toan` text NOT NULL,
	`tong_tien_hang` integer NOT NULL,
	`giam_gia` integer DEFAULT 0 NOT NULL,
	`thu_khac` integer DEFAULT 0 NOT NULL,
	`lam_tron` integer DEFAULT 0 NOT NULL,
	`khach_can_tra` integer NOT NULL,
	`thoi_gian` text NOT NULL,
	`thoi_gian_may_chu` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hoa_don_phuong_thuc_thanh_toan_hop_le" CHECK("hoa_don"."phuong_thuc_thanh_toan" IN ('TIEN_MAT', 'CHUYEN_KHOAN', 'THE', 'VI')),
	CONSTRAINT "hoa_don_tong_tien_hang_khong_am" CHECK("hoa_don"."tong_tien_hang" >= 0),
	CONSTRAINT "hoa_don_giam_gia_khong_am" CHECK("hoa_don"."giam_gia" >= 0),
	CONSTRAINT "hoa_don_giam_gia_khong_vuot_tong" CHECK("hoa_don"."giam_gia" <= "hoa_don"."tong_tien_hang")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hoa_don_ma_unique` ON `hoa_don` (`ma`);--> statement-breakpoint
CREATE TABLE `hoa_don_dong` (
	`id` text PRIMARY KEY NOT NULL,
	`hoa_don_id` text NOT NULL,
	`san_pham_id` text NOT NULL,
	`don_vi_ten` text NOT NULL,
	`he_so` integer NOT NULL,
	`don_gia` integer NOT NULL,
	`so_luong` integer NOT NULL,
	`thanh_tien` integer NOT NULL,
	`giam_gia_phan_bo` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`hoa_don_id`) REFERENCES `hoa_don`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`san_pham_id`) REFERENCES `san_pham`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hoa_don_dong_he_so_toi_thieu" CHECK("hoa_don_dong"."he_so" >= 1),
	CONSTRAINT "hoa_don_dong_don_gia_khong_am" CHECK("hoa_don_dong"."don_gia" >= 0),
	CONSTRAINT "hoa_don_dong_so_luong_duong" CHECK("hoa_don_dong"."so_luong" > 0),
	CONSTRAINT "hoa_don_dong_thanh_tien_khong_am" CHECK("hoa_don_dong"."thanh_tien" >= 0),
	CONSTRAINT "hoa_don_dong_giam_gia_phan_bo_khong_am" CHECK("hoa_don_dong"."giam_gia_phan_bo" >= 0)
);
--> statement-breakpoint
CREATE TABLE `hoa_don_dong_lo` (
	`id` text PRIMARY KEY NOT NULL,
	`hoa_don_dong_id` text NOT NULL,
	`lo_id` text NOT NULL,
	`so_luong` integer NOT NULL,
	FOREIGN KEY (`hoa_don_dong_id`) REFERENCES `hoa_don_dong`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lo_id`) REFERENCES `lo_hang`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hoa_don_dong_lo_so_luong_duong" CHECK("hoa_don_dong_lo"."so_luong" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hoa_don_dong_lo_dong_lo_unique` ON `hoa_don_dong_lo` (`hoa_don_dong_id`,`lo_id`);