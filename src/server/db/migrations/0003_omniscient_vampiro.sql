CREATE TABLE `the_kho` (
	`id` text PRIMARY KEY NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`lo_id` text NOT NULL,
	`loai` text NOT NULL,
	`so_luong` integer NOT NULL,
	`thoi_gian` text NOT NULL,
	`thoi_gian_may_chu` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lo_id`) REFERENCES `lo_hang`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "the_kho_loai_hop_le" CHECK("the_kho"."loai" IN ('BAN', 'NHAP', 'TRA_HANG', 'TRA_NCC', 'KIEM_KE', 'XUAT_HUY', 'DOI_CHE_DO'))
);
--> statement-breakpoint
CREATE TABLE `ton_kho_lo` (
	`lo_id` text NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ton` integer NOT NULL,
	PRIMARY KEY(`lo_id`, `chi_nhanh_id`),
	FOREIGN KEY (`lo_id`) REFERENCES `lo_hang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action
);
