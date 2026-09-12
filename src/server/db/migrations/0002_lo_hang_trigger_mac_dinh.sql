-- Tự cấp lô ngầm định ngay khi một dòng san_pham được insert (SPEC.md §3.2,
-- ARCHITECTURE.md §6). Đặt ở tầng CSDL, không phải ở code ứng dụng, để bất
-- biến "mỗi sản phẩm luôn có ít nhất một lô" không phụ thuộc đường tạo sản
-- phẩm nào ra đời sau này.
CREATE TRIGGER san_pham_tao_lo_mac_dinh
AFTER INSERT ON san_pham
BEGIN
	INSERT INTO lo_hang (id, san_pham_id, so_lo, hsd, la_lo_mac_dinh)
	VALUES (lower(hex(randomblob(16))), NEW.id, NULL, NULL, 1);
END;
