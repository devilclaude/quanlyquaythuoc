import { z } from 'zod';
import { PhuongThucThanhToanSchema } from '../../../shared/hop-dong/hoa-don';
import { DonViTinhResSchema } from '../../../shared/hop-dong/hang-hoa';

// Các tab hoá đơn đang mở (giỏ hàng + panel thanh toán gõ dở) giữ ở localStorage theo
// từng tài khoản, để F5/đóng nhầm tab/hết phiên không làm mất hoá đơn chưa thanh toán.
// Chỉ là tiện ích phía trình duyệt: dữ liệu hỏng hoặc kho bị chặn thì coi như không có.

const DongGioHangSchema = z.object({
  sanPhamId: z.string(),
  maHang: z.string(),
  ten: z.string(),
  donViTinhId: z.string(),
  donViTen: z.string(),
  heSo: z.number(),
  giaBan: z.number(),
  soLuong: z.number(),
  dsDonVi: z.array(DonViTinhResSchema),
});

const TabSchema = z.object({
  id: z.string(),
  soThuTu: z.number(),
  gioHang: z.array(DongGioHangSchema),
  chiSoDongChon: z.number(),
  thanhToan: z.object({
    giamGia: z.string(),
    thuKhac: z.string(),
    phuongThucThanhToan: PhuongThucThanhToanSchema,
    khachThanhToan: z.string(),
  }),
  dangThanhToan: z.boolean(),
});

const LuuSchema = z.object({ tabs: z.array(TabSchema).min(1), tabDangChonId: z.string() });

export type HoaDonTabLuu = z.infer<typeof TabSchema> & {
  loiThanhToan: string | undefined;
  thongBaoThanhToan: string | undefined;
};

export interface HoaDonDangMo {
  tabs: HoaDonTabLuu[];
  tabDangChonId: string;
}

export interface KhoLuu {
  getItem(khoa: string): string | null;
  setItem(khoa: string, giaTri: string): void;
  removeItem(khoa: string): void;
}

const TIEN_TO_KHOA = 'quaythuoc.hoa-don-dang-mo.';
const CANH_BAO_DANG_GUI =
  'Lần trước trang bị tải lại khi đang thanh toán — hãy kiểm tra danh sách hoá đơn xem đơn này đã được tạo chưa trước khi thanh toán lại.';

function khoMacDinh(): KhoLuu | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function docHoaDonDangMo(nguoiId: string, kho: KhoLuu | undefined = khoMacDinh()): HoaDonDangMo | undefined {
  try {
    const tho = kho?.getItem(TIEN_TO_KHOA + nguoiId);
    if (!tho) return undefined;
    const kq = LuuSchema.safeParse(JSON.parse(tho));
    if (!kq.success) return undefined;
    const tabs = kq.data.tabs.map(
      (t): HoaDonTabLuu => ({
        ...t,
        dangThanhToan: false,
        loiThanhToan: t.dangThanhToan ? CANH_BAO_DANG_GUI : undefined,
        thongBaoThanhToan: undefined,
      }),
    );
    const tabDangChonId = tabs.some((t) => t.id === kq.data.tabDangChonId) ? kq.data.tabDangChonId : tabs[0]!.id;
    return { tabs, tabDangChonId };
  } catch {
    return undefined;
  }
}

/** Chỉ còn một hoá đơn rỗng thì không có gì đáng giữ — xoá bản đã lưu. */
export function luuHoaDonDangMo(
  nguoiId: string,
  trangThai: HoaDonDangMo,
  kho: KhoLuu | undefined = khoMacDinh(),
): void {
  try {
    const khoa = TIEN_TO_KHOA + nguoiId;
    const conGiDoDang = trangThai.tabs.length > 1 || trangThai.tabs.some((t) => t.gioHang.length > 0);
    if (!conGiDoDang) {
      kho?.removeItem(khoa);
      return;
    }
    kho?.setItem(
      khoa,
      JSON.stringify({
        tabs: trangThai.tabs.map((t) => TabSchema.parse(t)),
        tabDangChonId: trangThai.tabDangChonId,
      }),
    );
  } catch {
    // Kho đầy hoặc bị chặn: bỏ qua, giỏ hàng trên màn hình vẫn dùng bình thường.
  }
}
