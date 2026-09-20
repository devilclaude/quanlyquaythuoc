CREATE TABLE `cai_dat` (
	`id` integer PRIMARY KEY NOT NULL,
	`quan_ly_lo` integer DEFAULT false NOT NULL,
	CONSTRAINT "cai_dat_mot_dong_duy_nhat" CHECK("cai_dat"."id" = 1)
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_san_pham` (
	`id` text PRIMARY KEY NOT NULL,
	`ma_hang` text NOT NULL,
	`ten` text NOT NULL,
	`ngay_tao` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`trang_thai` text DEFAULT 'HOAT_DONG' NOT NULL,
	`quan_ly_lo_ghi_de` text,
	CONSTRAINT "san_pham_trang_thai_hop_le" CHECK("__new_san_pham"."trang_thai" IN ('HOAT_DONG', 'NGUNG_HOAT_DONG')),
	CONSTRAINT "san_pham_quan_ly_lo_ghi_de_hop_le" CHECK("__new_san_pham"."quan_ly_lo_ghi_de" IS NULL OR "__new_san_pham"."quan_ly_lo_ghi_de" IN ('BAT', 'TAT'))
);
--> statement-breakpoint
-- `quan_ly_lo_ghi_de` KHÔNG có trong SELECT nguồn: cột này chưa tồn tại ở bảng
-- `san_pham` cũ (đây chính là migration thêm nó) — drizzle-kit generate sai
-- khi tự đưa nó vào cả hai vế, cùng lỗi đã gặp ở migration 0009 với trang_thai.
-- Bỏ qua để nhận mặc định NULL (kế thừa cài đặt toàn cục) cho dữ liệu cũ.
INSERT INTO `__new_san_pham`("id", "ma_hang", "ten", "ngay_tao", "trang_thai") SELECT "id", "ma_hang", "ten", "ngay_tao", "trang_thai" FROM `san_pham`;--> statement-breakpoint
DROP TABLE `san_pham`;--> statement-breakpoint
ALTER TABLE `__new_san_pham` RENAME TO `san_pham`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `san_pham_ma_hang_unique` ON `san_pham` (`ma_hang`);--> statement-breakpoint
-- Rebuild bảng san_pham (thêm cột quan_ly_lo_ghi_de + CHECK) làm mất trigger cũ
-- — SQLite tự xoá mọi trigger gắn với một bảng khi DROP TABLE nó, kể cả sau khi
-- bảng mới được RENAME lại đúng tên cũ. Tạo lại nguyên văn trigger từ migration
-- 0002 (đã tái tạo một lần ở migration 0009 vì cùng lý do).
CREATE TRIGGER san_pham_tao_lo_mac_dinh
AFTER INSERT ON san_pham
BEGIN
	INSERT INTO lo_hang (id, san_pham_id, so_lo, hsd, la_lo_mac_dinh)
	VALUES (lower(hex(randomblob(16))), NEW.id, NULL, NULL, 1);
END;--> statement-breakpoint
-- Bảo đảm luôn có đúng một dòng cài đặt toàn cục ngay sau khi bảng được tạo,
-- mặc định TẮT (SPEC.md §3.2). `INSERT OR IGNORE` để migration này idempotent
-- nếu drizzle chạy lại trên một CSDL đã có dòng (không nên xảy ra trong vận
-- hành bình thường, nhưng rẻ để phòng ngừa).
INSERT OR IGNORE INTO `cai_dat` (`id`, `quan_ly_lo`) VALUES (1, 0);