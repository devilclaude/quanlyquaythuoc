import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const chiNhanh = sqliteTable('chi_nhanh', {
  id: text('id').primaryKey(),
  ten: text('ten').notNull(),
});

export const sanPham = sqliteTable('san_pham', {
  id: text('id').primaryKey(),
  maHang: text('ma_hang').notNull().unique(),
  ten: text('ten').notNull(),
  // Dùng để sắp xếp cột "Thời gian tạo" ở màn danh sách hàng hoá (T-009a).
  ngayTao: text('ngay_tao')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const donViTinh = sqliteTable(
  'don_vi_tinh',
  {
    id: text('id').primaryKey(),
    sanPhamId: text('san_pham_id')
      .notNull()
      .references(() => sanPham.id),
    ten: text('ten').notNull(),
    heSo: integer('he_so').notNull(),
    laCoSo: integer('la_co_so', { mode: 'boolean' }).notNull().default(false),
    giaBan: integer('gia_ban').notNull(),
  },
  (t) => [
    unique('don_vi_tinh_san_pham_ten_unique').on(t.sanPhamId, t.ten),
    uniqueIndex('don_vi_tinh_mot_co_so_moi_san_pham')
      .on(t.sanPhamId)
      .where(sql`${t.laCoSo} = 1`),
    check('don_vi_tinh_he_so_toi_thieu', sql`${t.heSo} >= 1`),
    check('don_vi_tinh_gia_ban_khong_am', sql`${t.giaBan} >= 0`),
  ],
);

// Không có `chi_nhanh_id`: một lô là một lô, không thuộc chi nhánh nào
// (SPEC.md §3.6). Mỗi san_pham có đúng một lô ngầm định (`so_lo`/`hsd` = NULL)
// do trigger CSDL tự cấp ngay lúc insert — xem migration 0002.
export const loHang = sqliteTable(
  'lo_hang',
  {
    id: text('id').primaryKey(),
    sanPhamId: text('san_pham_id')
      .notNull()
      .references(() => sanPham.id),
    soLo: text('so_lo'),
    hsd: text('hsd'),
    laLoMacDinh: integer('la_lo_mac_dinh', { mode: 'boolean' }).notNull().default(false),
    ngayTao: text('ngay_tao')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    uniqueIndex('lo_hang_mot_lo_mac_dinh_moi_san_pham')
      .on(t.sanPhamId)
      .where(sql`${t.laLoMacDinh} = 1`),
    unique('lo_hang_san_pham_so_lo_hsd_unique').on(t.sanPhamId, t.soLo, t.hsd),
  ],
);

// Sổ cái chỉ-ghi-thêm (SPEC.md §3.1). UPDATE/DELETE bị chặn bằng trigger CSDL —
// xem migration — vì đây là ràng buộc tầng dữ liệu, không phải quy ước ứng dụng.
// `thoi_gian` là giờ thiết bị lúc thao tác xảy ra (có thể trễ so với lúc máy chủ
// nhận, khi đồng bộ offline); `thoi_gian_may_chu` là lúc dòng này thực sự được
// ghi (SPEC.md §3.6).
export const theKho = sqliteTable(
  'the_kho',
  {
    id: text('id').primaryKey(),
    chiNhanhId: text('chi_nhanh_id')
      .notNull()
      .references(() => chiNhanh.id),
    loId: text('lo_id')
      .notNull()
      .references(() => loHang.id),
    loai: text('loai').notNull(),
    soLuong: integer('so_luong').notNull(),
    // Tổng tiền tường minh của dòng khi là dòng VÀO có giá vốn biết trước (vd.
    // NHAP với tổng tiền T, SPEC.md §3.4) — 0 với dòng RA, COGS của dòng ra
    // luôn suy ra từ bình quân gia quyền hiện có, không lưu tường minh.
    giaTri: integer('gia_tri').notNull().default(0),
    thoiGian: text('thoi_gian').notNull(),
    thoiGianMayChu: text('thoi_gian_may_chu')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check(
      'the_kho_loai_hop_le',
      sql`${t.loai} IN ('BAN', 'NHAP', 'TRA_HANG', 'TRA_NCC', 'KIEM_KE', 'XUAT_HUY', 'DOI_CHE_DO')`,
    ),
  ],
);

// Bản đệm suy ra từ the_kho (SPEC.md §3.1) — cập nhật trong cùng transaction với
// thẻ kho (ARCHITECTURE.md §6). Khoá tự nhiên (lo_id, chi_nhanh_id): mỗi lô có
// đúng một số dư tồn cho mỗi chi nhánh, không cần id riêng.
export const tonKhoLo = sqliteTable(
  'ton_kho_lo',
  {
    loId: text('lo_id')
      .notNull()
      .references(() => loHang.id),
    chiNhanhId: text('chi_nhanh_id')
      .notNull()
      .references(() => chiNhanh.id),
    ton: integer('ton').notNull(),
    // Vế còn lại của cặp bình quân gia quyền (SPEC.md §3.4) — hình chiếu suy ra
    // từ the_kho, gấp theo thứ tự đến máy chủ (src/server/kho/gia-von.ts).
    giaTriTon: integer('gia_tri_ton').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.loId, t.chiNhanhId] }),
    check('ton_kho_lo_gia_tri_ton_khong_am', sql`${t.giaTriTon} >= 0`),
  ],
);

// Chứng từ kiểm kê (T-050, SPEC.md §6.3) — chứng từ giao dịch, không xoá cứng
// (SPEC.md §3.5). `ly_do` bắt buộc: kiểm kê luôn phải giải thích vì sao chênh.
export const phieuKiemKe = sqliteTable(
  'phieu_kiem_ke',
  {
    id: text('id').primaryKey(),
    chiNhanhId: text('chi_nhanh_id')
      .notNull()
      .references(() => chiNhanh.id),
    lyDo: text('ly_do').notNull(),
    thoiGian: text('thoi_gian').notNull(),
    thoiGianMayChu: text('thoi_gian_may_chu')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [check('phieu_kiem_ke_ly_do_khong_rong', sql`length(trim(${t.lyDo})) > 0`)],
);

// Từng dòng đếm theo lô của một phiếu kiểm kê. `so_luong_so_sach` là tồn đệm
// TẠI THỜI ĐIỂM đếm — snapshot cho mục đích đối chiếu, được phép âm (tồn có thể
// đang lệch âm do bán khi offline, SPEC.md §4.4, và kiểm kê chính là cách sửa nó).
// `so_luong_thuc_te` là số đếm ngoài đời, không thể âm. Một lô chỉ đếm một lần
// trong cùng một phiếu.
export const phieuKiemKeDong = sqliteTable(
  'phieu_kiem_ke_dong',
  {
    id: text('id').primaryKey(),
    phieuId: text('phieu_id')
      .notNull()
      .references(() => phieuKiemKe.id),
    loId: text('lo_id')
      .notNull()
      .references(() => loHang.id),
    soLuongSoSach: integer('so_luong_so_sach').notNull(),
    soLuongThucTe: integer('so_luong_thuc_te').notNull(),
  },
  (t) => [
    unique('phieu_kiem_ke_dong_phieu_lo_unique').on(t.phieuId, t.loId),
    check('phieu_kiem_ke_dong_so_luong_thuc_te_khong_am', sql`${t.soLuongThucTe} >= 0`),
  ],
);
