ALTER TABLE `the_kho` ADD `gia_tri` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ton_kho_lo` (
	`lo_id` text NOT NULL,
	`chi_nhanh_id` text NOT NULL,
	`ton` integer NOT NULL,
	`gia_tri_ton` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`lo_id`, `chi_nhanh_id`),
	FOREIGN KEY (`lo_id`) REFERENCES `lo_hang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chi_nhanh_id`) REFERENCES `chi_nhanh`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ton_kho_lo_gia_tri_ton_khong_am" CHECK("__new_ton_kho_lo"."gia_tri_ton" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_ton_kho_lo`("lo_id", "chi_nhanh_id", "ton", "gia_tri_ton") SELECT "lo_id", "chi_nhanh_id", "ton", 0 FROM `ton_kho_lo`;--> statement-breakpoint
DROP TABLE `ton_kho_lo`;--> statement-breakpoint
ALTER TABLE `__new_ton_kho_lo` RENAME TO `ton_kho_lo`;--> statement-breakpoint
PRAGMA foreign_keys=ON;