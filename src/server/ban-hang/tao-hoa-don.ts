import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import { dong } from '../../shared/kieu/dong';
import { soLuongHienThi } from '../../shared/kieu/so-luong';
import { quyDoiSangCoSo } from '../../shared/don-vi/quy-doi';
import { phanBoSoDuLonNhat } from '../../shared/tien/phan-bo';
import { hoaDon, hoaDonDong, hoaDonDongLo } from '../db/schema';
import { chonLoXuatKho } from '../kho/fefo';
import { ghiMotDongTheKho } from '../kho/so-cai';

type Db = ReturnType<typeof drizzle>;

export type PhuongThucThanhToan = 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'THE' | 'VI';

export class GioHangRongError extends Error {
  constructor() {
    super('Giỏ hàng rỗng, không thể tạo hoá đơn');
    this.name = 'GioHangRongError';
  }
}

export class SoLuongKhongHopLeError extends Error {
  constructor(public readonly dongId: string) {
    super(`Số lượng dòng ${dongId} phải là số nguyên dương`);
    this.name = 'SoLuongKhongHopLeError';
  }
}

export class GiamGiaVuotTongError extends Error {
  constructor() {
    super('Giảm giá hoá đơn không được vượt quá tổng tiền hàng');
    this.name = 'GiamGiaVuotTongError';
  }
}

export interface DongGioHang {
  id: string;
  sanPhamId: string;
  /** Tên đơn vị đã chọn — sao chép vào chứng từ, không tham chiếu `don_vi_tinh` (SPEC.md §5.4). */
  donViTen: string;
  /** Hệ số quy đổi của đơn vị đã chọn, tại thời điểm bán. */
  heSo: number;
  /** Giá bán của đơn vị đã chọn, tại thời điểm bán — không nhân hệ số (T-021). */
  donGia: number;
  /** Số lượng theo đơn vị đã chọn (`donViTen`), KHÔNG phải đơn vị cơ sở. */
  soLuong: number;
  /** Ghi đè FEFO — chọn lô thủ công (SPEC.md §4.1). */
  loUuTienThuCong?: readonly string[];
}

export interface TaoHoaDonInput {
  id: string;
  chiNhanhId: string;
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: string;
  phuongThucThanhToan: PhuongThucThanhToan;
  /** Giảm giá toàn hoá đơn, đồng. Mặc định 0. */
  giamGia?: number;
  /** Thu khác, đồng. Mặc định 0. */
  thuKhac?: number;
  /** Làm tròn hoá đơn, đồng — mặc định TẮT (luôn 0) ở slice này (SPEC.md §3.4). */
  lamTron?: number;
  dong: readonly DongGioHang[];
  /**
   * Mã hoá đơn đã cấp sẵn (SPEC.md §5.3: đơn offline dùng mã do client cấp qua
   * T-032, dạng `HD<mã máy>-<số tăng dần>`) — dùng thẳng thay vì tự sinh tuần
   * tự, và không thử lại khi trùng (trùng nghĩa là đã áp dụng, do tầng gọi
   * T-033 xử lý idempotency trước khi gọi tới đây).
   */
  maDaCap?: string;
  /**
   * Cho phép tồn âm khi bán vượt tồn (SPEC.md §4.4 — "máy chủ không bao giờ
   * từ chối một đơn đã bán và đã in"). Chỉ đường đồng bộ offline (T-033) bật
   * cờ này; mặc định false nên đường bán hàng trực tuyến (T-022b) vẫn từ chối
   * bán vượt tồn như cũ.
   */
  choPhepTonAm?: boolean;
}

export interface HoaDonDaTao {
  id: string;
  ma: string;
  tongTienHang: number;
  giamGia: number;
  thuKhac: number;
  lamTron: number;
  khachCanTra: number;
  /** Giờ thiết bị lúc bán (ISO) — trả lại để T-023 in đúng giờ đã ghi, không phải giờ lúc in. */
  thoiGian: string;
}

function laLoiTrungMaHoaDon(loi: unknown): boolean {
  return loi instanceof Error && /UNIQUE constraint failed: hoa_don\.ma/.test(loi.message);
}

/** "HD" + số thứ tự 6 chữ số, tính trên tổng số hoá đơn hiện có + số lần đã thử lại. */
function sinhMaHoaDonTuDong(db: Db, soLanDaThu: number): string {
  const [hang] = db.select({ dem: sql<number>`count(*)` }).from(hoaDon).all();
  return `HD${String(Number(hang?.dem ?? 0) + 1 + soLanDaThu).padStart(6, '0')}`;
}

interface DongDaTinh extends DongGioHang {
  soLuongCoSo: number;
  thanhTien: number;
}

/**
 * Trừ kho theo FEFO cho từng dòng giỏ hàng và tạo chứng từ hoá đơn, trong MỘT
 * transaction nguyên tử (T-022a). Bán vượt tồn ở bất kỳ dòng nào ném
 * `KhongDuTonKhoError` và rollback toàn bộ — không có hoá đơn "một nửa"
 * (better-sqlite3 tự rollback khi callback transaction ném lỗi).
 *
 * Không tự tính giá vốn: `ghiMotDongTheKho` (src/server/kho/so-cai.ts) lo phần
 * đó qua bình quân gia quyền hiện có của từng lô — tầng này chỉ biết "bán bao
 * nhiêu, từ lô nào".
 */
export function taoHoaDonTuGioHang(db: Db, input: TaoHoaDonInput): HoaDonDaTao {
  if (input.dong.length === 0) throw new GioHangRongError();

  for (const d of input.dong) {
    if (!Number.isInteger(d.soLuong) || d.soLuong <= 0) throw new SoLuongKhongHopLeError(d.id);
  }

  const giamGia = input.giamGia ?? 0;
  const thuKhac = input.thuKhac ?? 0;
  const lamTron = input.lamTron ?? 0;

  const dongDaTinh: DongDaTinh[] = input.dong.map((d) => ({
    ...d,
    soLuongCoSo: quyDoiSangCoSo(soLuongHienThi(d.soLuong), d.heSo),
    thanhTien: d.donGia * d.soLuong,
  }));

  const tongTienHang = dongDaTinh.reduce((tong, d) => tong + d.thanhTien, 0);
  if (giamGia > tongTienHang) throw new GiamGiaVuotTongError();

  const giamGiaPhanBoTheoDong = phanBoSoDuLonNhat(
    dong(giamGia),
    dongDaTinh.map((d) => dong(d.thanhTien)),
  );

  const khachCanTra = tongTienHang - giamGia + thuKhac + lamTron;

  const soLanThuToiDa = input.maDaCap ? 1 : 5;
  for (let lanThu = 0; lanThu < soLanThuToiDa; lanThu++) {
    const ma = input.maDaCap ?? sinhMaHoaDonTuDong(db, lanThu);

    try {
      db.transaction((tx) => {
        tx.insert(hoaDon)
          .values({
            id: input.id,
            chiNhanhId: input.chiNhanhId,
            ma,
            phuongThucThanhToan: input.phuongThucThanhToan,
            tongTienHang,
            giamGia,
            thuKhac,
            lamTron,
            khachCanTra,
            thoiGian: input.thoiGian,
          })
          .run();

        dongDaTinh.forEach((d, chiSo) => {
          tx.insert(hoaDonDong)
            .values({
              id: d.id,
              hoaDonId: input.id,
              sanPhamId: d.sanPhamId,
              donViTen: d.donViTen,
              heSo: d.heSo,
              donGia: d.donGia,
              soLuong: d.soLuong,
              thanhTien: d.thanhTien,
              giamGiaPhanBo: giamGiaPhanBoTheoDong[chiSo],
            })
            .run();

          const phanBoLo = chonLoXuatKho(
            tx,
            d.sanPhamId,
            input.chiNhanhId,
            d.soLuongCoSo,
            d.loUuTienThuCong ?? [],
            { choPhepTonAm: input.choPhepTonAm ?? false },
          );

          phanBoLo.forEach((pb, thuTu) => {
            tx.insert(hoaDonDongLo)
              .values({ id: `${d.id}-${pb.loId}`, hoaDonDongId: d.id, loId: pb.loId, soLuong: pb.soLuong, thuTu })
              .run();

            ghiMotDongTheKho(tx, {
              id: `${d.id}-${pb.loId}-tk`,
              chiNhanhId: input.chiNhanhId,
              loId: pb.loId,
              loai: 'BAN',
              soLuong: -pb.soLuong,
              thoiGian: input.thoiGian,
            });
          });
        });
      });

      return { id: input.id, ma, tongTienHang, giamGia, thuKhac, lamTron, khachCanTra, thoiGian: input.thoiGian };
    } catch (loi) {
      // maDaCap là mã cố định (T-033) — thử lại với mã khác không có ý nghĩa,
      // luôn ném thẳng lỗi gốc lên tầng gọi (đã xử lý idempotency riêng).
      if (input.maDaCap || !laLoiTrungMaHoaDon(loi)) throw loi;
      // Mã tự sinh đụng UNIQUE do đua giữa hai lần tạo gần nhau — thử mã kế tiếp.
    }
  }

  throw new Error('không sinh được mã hoá đơn tự động sau nhiều lần thử');
}
