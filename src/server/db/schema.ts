import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, unique, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const chiNhanh = sqliteTable('chi_nhanh', {
  id: text('id').primaryKey(),
  ten: text('ten').notNull(),
});

export const sanPham = sqliteTable('san_pham', {
  id: text('id').primaryKey(),
  maHang: text('ma_hang').notNull().unique(),
  ten: text('ten').notNull(),
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
