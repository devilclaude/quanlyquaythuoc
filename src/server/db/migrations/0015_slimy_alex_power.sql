CREATE TABLE `nguoi_dung` (
	`id` text PRIMARY KEY NOT NULL,
	`ten_dang_nhap` text NOT NULL,
	`ten_hien_thi` text NOT NULL,
	`mat_khau_bam` text NOT NULL,
	`vai_tro` text NOT NULL,
	`hoat_dong` integer DEFAULT true NOT NULL,
	`ngay_tao` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "nguoi_dung_vai_tro_hop_le" CHECK("nguoi_dung"."vai_tro" IN ('ADMIN', 'NHAN_VIEN')),
	CONSTRAINT "nguoi_dung_ten_dang_nhap_chu_thuong_da_trim" CHECK(length("nguoi_dung"."ten_dang_nhap") > 0 AND "nguoi_dung"."ten_dang_nhap" = lower(trim("nguoi_dung"."ten_dang_nhap")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nguoi_dung_ten_dang_nhap_unique` ON `nguoi_dung` (`ten_dang_nhap`);--> statement-breakpoint
CREATE TABLE `phien` (
	`id_bam` text PRIMARY KEY NOT NULL,
	`nguoi_dung_id` text NOT NULL,
	`het_han` text NOT NULL,
	`ngay_tao` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung`(`id`) ON UPDATE no action ON DELETE no action
);
