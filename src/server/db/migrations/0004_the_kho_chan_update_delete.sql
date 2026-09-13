-- the_kho là sổ cái chỉ-ghi-thêm (SPEC.md §3.1, §9.2). Sai thì ghi dòng đảo,
-- không sửa/xoá dòng cũ. Chặn ở tầng CSDL bằng trigger, không phải quy ước ứng
-- dụng (ARCHITECTURE.md §6) — không thể vô tình bỏ qua từ một đường code mới.
CREATE TRIGGER the_kho_chan_update
BEFORE UPDATE ON the_kho
BEGIN
	SELECT RAISE(ABORT, 'the_kho chỉ ghi thêm — không được UPDATE');
END;
--> statement-breakpoint
CREATE TRIGGER the_kho_chan_delete
BEFORE DELETE ON the_kho
BEGIN
	SELECT RAISE(ABORT, 'the_kho chỉ ghi thêm — không được DELETE');
END;
