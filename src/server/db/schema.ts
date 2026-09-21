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

export const sanPham = sqliteTable(
  'san_pham',
  {
    id: text('id').primaryKey(),
    maHang: text('ma_hang').notNull().unique(),
    ten: text('ten').notNull(),
    // Dùng để sắp xếp cột "Thời gian tạo" ở màn danh sách hàng hoá (T-009a).
    ngayTao: text('ngay_tao')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    // "Ngừng hoạt động" thay cho xoá cứng khi sản phẩm đã phát sinh thẻ kho
    // (SPEC.md §3.5, T-009c) — xoá cứng chỉ hợp lệ khi CHƯA có dòng thẻ kho nào.
    trangThai: text('trang_thai').notNull().default('HOAT_DONG').$type<'HOAT_DONG' | 'NGUNG_HOAT_DONG'>(),
  },
  (t) => [
    check('san_pham_trang_thai_hop_le', sql`${t.trangThai} IN ('HOAT_DONG', 'NGUNG_HOAT_DONG')`),
  ],
);

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

// Chứng từ xuất huỷ (T-051, DOMAIN-NOTES.md B2) — chứng từ giao dịch, không xoá
// cứng (SPEC.md §3.5). `ly_do` và `nguoi_thuc_hien` bắt buộc: xuất huỷ luôn phải
// giải thích được vì sao và ai làm.
export const phieuXuatHuy = sqliteTable(
  'phieu_xuat_huy',
  {
    id: text('id').primaryKey(),
    chiNhanhId: text('chi_nhanh_id')
      .notNull()
      .references(() => chiNhanh.id),
    lyDo: text('ly_do').notNull(),
    nguoiThucHien: text('nguoi_thuc_hien').notNull(),
    thoiGian: text('thoi_gian').notNull(),
    thoiGianMayChu: text('thoi_gian_may_chu')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check('phieu_xuat_huy_ly_do_khong_rong', sql`length(trim(${t.lyDo})) > 0`),
    check('phieu_xuat_huy_nguoi_thuc_hien_khong_rong', sql`length(trim(${t.nguoiThucHien})) > 0`),
  ],
);

// Từng dòng xuất huỷ theo lô của một phiếu. `so_luong` là số lượng xuất huỷ,
// đơn vị cơ sở, luôn dương (chiều trừ kho do lớp ghi thẻ kho tự áp — không lưu
// dấu ở đây). Một lô chỉ xuất huỷ một lần trong cùng một phiếu.
export const phieuXuatHuyDong = sqliteTable(
  'phieu_xuat_huy_dong',
  {
    id: text('id').primaryKey(),
    phieuId: text('phieu_id')
      .notNull()
      .references(() => phieuXuatHuy.id),
    loId: text('lo_id')
      .notNull()
      .references(() => loHang.id),
    soLuong: integer('so_luong').notNull(),
  },
  (t) => [
    unique('phieu_xuat_huy_dong_phieu_lo_unique').on(t.phieuId, t.loId),
    check('phieu_xuat_huy_dong_so_luong_duong', sql`${t.soLuong} > 0`),
  ],
);

// Chứng từ bán hàng (T-022a, SPEC.md §3.4/§5.3) — chứng từ giao dịch, không xoá
// cứng (SPEC.md §3.5). `ma` sinh tuần tự (HD000001...) ở tầng ứng dụng — đây là
// quy ước TRƯỚC khi có hàng đợi offline (T-032 sẽ đổi sang cấp số tại client,
// dạng `HD<mã máy>-<số>`; task đó tự thay cách sinh, không migrate ngược số cũ).
// `khach_can_tra` lưu sẵn (không suy ra khi đọc) vì đẳng thức SPEC.md §3.4 phải
// khớp với đúng con số đã hiển thị/in cho khách, kể cả khi tỷ lệ giảm giá % thay
// đổi ý nghĩa về sau.
export const hoaDon = sqliteTable(
  'hoa_don',
  {
    id: text('id').primaryKey(),
    chiNhanhId: text('chi_nhanh_id')
      .notNull()
      .references(() => chiNhanh.id),
    ma: text('ma').notNull().unique(),
    phuongThucThanhToan: text('phuong_thuc_thanh_toan')
      .notNull()
      .$type<'TIEN_MAT' | 'CHUYEN_KHOAN' | 'THE' | 'VI'>(),
    tongTienHang: integer('tong_tien_hang').notNull(),
    giamGia: integer('giam_gia').notNull().default(0),
    thuKhac: integer('thu_khac').notNull().default(0),
    lamTron: integer('lam_tron').notNull().default(0),
    khachCanTra: integer('khach_can_tra').notNull(),
    thoiGian: text('thoi_gian').notNull(),
    thoiGianMayChu: text('thoi_gian_may_chu')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check(
      'hoa_don_phuong_thuc_thanh_toan_hop_le',
      sql`${t.phuongThucThanhToan} IN ('TIEN_MAT', 'CHUYEN_KHOAN', 'THE', 'VI')`,
    ),
    check('hoa_don_tong_tien_hang_khong_am', sql`${t.tongTienHang} >= 0`),
    check('hoa_don_giam_gia_khong_am', sql`${t.giamGia} >= 0`),
    check('hoa_don_giam_gia_khong_vuot_tong', sql`${t.giamGia} <= ${t.tongTienHang}`),
  ],
);

// Từng dòng bán của một hoá đơn. Snapshot đơn vị/giá tại thời điểm bán — KHÔNG
// tham chiếu `don_vi_tinh` bằng FK: đơn vị có thể bị xoá khi sửa hàng hoá sau
// này (T-009c thay TOÀN BỘ đơn vị khác), và SPEC.md §5.4 quy định rõ chứng từ
// "sao chép giá lúc bán, không tham chiếu". `giam_gia_phan_bo` lưu sẵn để trả
// hàng một phần dùng lại đúng số đã phân bổ, không tính lại từ % (SPEC.md §3.4).
export const hoaDonDong = sqliteTable(
  'hoa_don_dong',
  {
    id: text('id').primaryKey(),
    hoaDonId: text('hoa_don_id')
      .notNull()
      .references(() => hoaDon.id),
    sanPhamId: text('san_pham_id')
      .notNull()
      .references(() => sanPham.id),
    donViTen: text('don_vi_ten').notNull(),
    heSo: integer('he_so').notNull(),
    donGia: integer('don_gia').notNull(),
    /** Số lượng theo đơn vị đã chọn (`don_vi_ten`), KHÔNG phải đơn vị cơ sở. */
    soLuong: integer('so_luong').notNull(),
    thanhTien: integer('thanh_tien').notNull(),
    giamGiaPhanBo: integer('giam_gia_phan_bo').notNull().default(0),
  },
  (t) => [
    check('hoa_don_dong_he_so_toi_thieu', sql`${t.heSo} >= 1`),
    check('hoa_don_dong_don_gia_khong_am', sql`${t.donGia} >= 0`),
    check('hoa_don_dong_so_luong_duong', sql`${t.soLuong} > 0`),
    check('hoa_don_dong_thanh_tien_khong_am', sql`${t.thanhTien} >= 0`),
    check('hoa_don_dong_giam_gia_phan_bo_khong_am', sql`${t.giamGiaPhanBo} >= 0`),
  ],
);

// Lô nào đã bị trừ, bao nhiêu, cho từng dòng hoá đơn — một dòng có thể tràn
// sang nhiều lô do FEFO (SPEC.md §9 bất biến 10). Bảng này là thứ duy nhất cho
// biết "dòng này đã trừ đúng những lô nào" — `the_kho` chỉ biết lô, không biết
// dòng hoá đơn nào gây ra nó. T-052 (trả hàng, LIFO "trên chính các dòng đã
// trừ") cần bảng này để hoàn đúng lô; không đụng tới thiết kế tham chiếu chứng
// từ chung của `the_kho` (đang BLOCKED — xem BLOCKED.md mục T-054).
export const hoaDonDongLo = sqliteTable(
  'hoa_don_dong_lo',
  {
    id: text('id').primaryKey(),
    hoaDonDongId: text('hoa_don_dong_id')
      .notNull()
      .references(() => hoaDonDong.id),
    loId: text('lo_id')
      .notNull()
      .references(() => loHang.id),
    /** Dương, đơn vị cơ sở — số lượng đã trừ từ đúng lô này cho dòng này. */
    soLuong: integer('so_luong').notNull(),
  },
  (t) => [
    unique('hoa_don_dong_lo_dong_lo_unique').on(t.hoaDonDongId, t.loId),
    check('hoa_don_dong_lo_so_luong_duong', sql`${t.soLuong} > 0`),
  ],
);
