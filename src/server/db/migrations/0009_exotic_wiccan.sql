PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_san_pham` (
	`id` text PRIMARY KEY NOT NULL,
	`ma_hang` text NOT NULL,
	`ten` text NOT NULL,
	`ngay_tao` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`trang_thai` text DEFAULT 'HOAT_DONG' NOT NULL,
	CONSTRAINT "san_pham_trang_thai_hop_le" CHECK("__new_san_pham"."trang_thai" IN ('HOAT_DONG', 'NGUNG_HOAT_DONG'))
);
--> statement-breakpoint
INSERT INTO `__new_san_pham`("id", "ma_hang", "ten", "ngay_tao") SELECT "id", "ma_hang", "ten", "ngay_tao" FROM `san_pham`;--> statement-breakpoint
DROP TABLE `san_pham`;--> statement-breakpoint
ALTER TABLE `__new_san_pham` RENAME TO `san_pham`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `san_pham_ma_hang_unique` ON `san_pham` (`ma_hang`);--> statement-breakpoint
-- Rebuild bảng san_pham (thêm cột trang_thai + CHECK) làm mất trigger cũ — SQLite
-- tự xoá mọi trigger gắn với một bảng khi DROP TABLE nó, kể cả sau khi bảng mới
-- được RENAME lại đúng tên cũ. Tạo lại nguyên văn trigger từ migration 0002.
CREATE TRIGGER san_pham_tao_lo_mac_dinh
AFTER INSERT ON san_pham
BEGIN
	INSERT INTO lo_hang (id, san_pham_id, so_lo, hsd, la_lo_mac_dinh)
	VALUES (lower(hex(randomblob(16))), NEW.id, NULL, NULL, 1);
END;