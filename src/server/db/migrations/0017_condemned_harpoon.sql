-- Thêm mã vạch nhà sản xuất (tuỳ chọn). Viết tay thay cho bản drizzle-kit sinh: bản đó
-- DROP + tạo lại cả bảng `san_pham`, làm mất trigger cấp lô ngầm định (migration 0002) và
-- khiến INSERT tham chiếu cột chưa có. ALTER TABLE ADD COLUMN giữ nguyên trigger và dữ liệu.
ALTER TABLE `san_pham` ADD `ma_vach` text CONSTRAINT "san_pham_ma_vach_khong_rong_da_trim" CHECK(`ma_vach` IS NULL OR (length(`ma_vach`) > 0 AND `ma_vach` = trim(`ma_vach`)));--> statement-breakpoint
CREATE UNIQUE INDEX `san_pham_ma_vach_unique` ON `san_pham` (`ma_vach`);
