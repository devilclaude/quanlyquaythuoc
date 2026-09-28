import { desc, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { soLuongHienThi } from '../../shared/kieu/so-luong';
import { quyDoiSangCoSo } from '../../shared/don-vi/quy-doi';
import { chiaLamTronNuaLen } from '../../shared/tien/lam-tron';
import { hoaDon, hoaDonDong, hoaDonDongLo, traHang, traHangDong, traHangDongLo } from '../db/schema';
import { ghiMotDongTheKho } from '../kho/so-cai';

type Db = ReturnType<typeof drizzle>;

export class DongTraHangRongError extends Error {
  constructor() {
    super('Phiếu trả hàng phải có ít nhất một dòng');
    this.name = 'DongTraHangRongError';
  }
}

export class SoLuongKhongHopLeError extends Error {
  constructor(public readonly dongId: string) {
    super(`Số lượng trả của dòng ${dongId} phải là số nguyên dương`);
    this.name = 'SoLuongKhongHopLeError';
  }
}

export class HoaDonKhongTonTaiError extends Error {
  constructor(public readonly hoaDonId: string) {
    super(`Không tìm thấy hoá đơn ${hoaDonId}`);
    this.name = 'HoaDonKhongTonTaiError';
  }
}

export class HoaDonDongKhongTonTaiError extends Error {
  constructor(public readonly hoaDonDongId: string) {
    super(`Không tìm thấy dòng hoá đơn ${hoaDonDongId}`);
    this.name = 'HoaDonDongKhongTonTaiError';
  }
}

export class HoaDonDongKhongThuocHoaDonError extends Error {
  constructor(
    public readonly hoaDonDongId: string,
    public readonly hoaDonId: string,
  ) {
    super(`Dòng hoá đơn ${hoaDonDongId} không thuộc hoá đơn ${hoaDonId}`);
    this.name = 'HoaDonDongKhongThuocHoaDonError';
  }
}

export class VuotSoLuongDaBanError extends Error {
  constructor(
    public readonly hoaDonDongId: string,
    public readonly conLaiToiDa: number,
  ) {
    super(`Dòng hoá đơn ${hoaDonDongId}: chỉ còn trả được tối đa ${conLaiToiDa} (đơn vị cơ sở)`);
    this.name = 'VuotSoLuongDaBanError';
  }
}

export interface DongTraHangInput {
  id: string;
  hoaDonDongId: string;
  /** Số lượng trả, đơn vị CƠ SỞ (không phải đơn vị đã chọn lúc bán — SPEC.md §3.2). */
  soLuong: number;
}

export interface TaoPhieuTraHangInput {
  id: string;
  hoaDonId: string;
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: string;
  dong: readonly DongTraHangInput[];
}

export interface PhieuTraHangDaTao {
  id: string;
  ma: string;
  tongTienHoan: number;
}

function laLoiTrungMaTraHang(loi: unknown): boolean {
  return loi instanceof Error && /UNIQUE constraint failed: tra_hang\.ma/.test(loi.message);
}

/** "TH" + số thứ tự 6 chữ số, tính trên tổng số phiếu trả hàng hiện có + số lần đã thử lại. */
function sinhMaTraHangTuDong(db: Db, soLanDaThu: number): string {
  const [hang] = db.select({ dem: sql<number>`count(*)` }).from(traHang).all();
  return `TH${String(Number(hang?.dem ?? 0) + 1 + soLanDaThu).padStart(6, '0')}`;
}

interface PhanBoHoan {
  loId: string;
  soLuong: number;
}

/**
 * Phân bổ số lượng cần hoàn của một dòng qua các lô đã trừ lúc bán, theo LIFO
 * (SPEC.md §4.2: "lô bị trừ sau cùng được hoàn trước") — `danhSachLoDaTru` phải
 * được sắp theo LIFO trước (thứ tự trừ giảm dần) và mỗi phần tử mang PHẦN CÒN
 * LẠI có thể hoàn của lô đó (đã trừ − đã hoàn ở các phiếu trả trước), không
 * phải tổng đã trừ gốc. Caller đã kiểm tổng số lượng còn trả được trước khi gọi
 * (`VuotSoLuongDaBanError`) nên hàm thuần này không bao giờ thiếu chỗ hoàn nếu
 * dữ liệu đầu vào nhất quán.
 */
function phanBoHoanLifo(danhSachLoDaTru: readonly PhanBoHoan[], soLuongCanHoan: number): PhanBoHoan[] {
  const ketQua: PhanBoHoan[] = [];
  let conLai = soLuongCanHoan;
  for (const lo of danhSachLoDaTru) {
    if (conLai <= 0) break;
    if (lo.soLuong <= 0) continue;
    const lay = Math.min(lo.soLuong, conLai);
    ketQua.push({ loId: lo.loId, soLuong: lay });
    conLai -= lay;
  }
  if (conLai > 0) {
    throw new Error(`hoàn hàng thiếu chỗ chứa lô — lỗi bất biến nội bộ, còn thiếu ${conLai}`);
  }
  return ketQua;
}

/**
 * Tạo phiếu trả hàng (T-052a, SPEC.md §4.2/§6.4): với mỗi dòng, hoàn kho theo
 * LIFO trên chính các dòng `hoa_don_dong_lo` đã trừ lúc bán của dòng hoá đơn
 * gốc đó — không suy lại FEFO, vì lô ưu tiên thủ công (SPEC.md §4.1) có thể đã
 * làm thứ tự thật lúc bán khác thứ tự FEFO hiện tại. Toàn bộ một phiếu chạy
 * trong MỘT transaction nguyên tử. Không có nhánh nào theo cài đặt quản lý lô:
 * ở chế độ phẳng, `hoa_don_dong_lo` của dòng gốc chỉ có đúng một lô (lô ngầm
 * định) nên LIFO tự suy biến thành "hoàn về lô ngầm định" — cùng một đường code.
 */
export function taoPhieuTraHang(db: Db, input: TaoPhieuTraHangInput): PhieuTraHangDaTao {
  if (input.dong.length === 0) throw new DongTraHangRongError();
  for (const d of input.dong) {
    if (!Number.isInteger(d.soLuong) || d.soLuong <= 0) throw new SoLuongKhongHopLeError(d.id);
  }

  const soLanThuToiDa = 5;
  for (let lanThu = 0; lanThu < soLanThuToiDa; lanThu++) {
    const ma = sinhMaTraHangTuDong(db, lanThu);
    let tongTienHoan = 0;

    try {
      db.transaction((tx) => {
        const [hoaDonRow] = tx.select().from(hoaDon).where(eq(hoaDon.id, input.hoaDonId)).all();
        if (!hoaDonRow) throw new HoaDonKhongTonTaiError(input.hoaDonId);

        tx.insert(traHang)
          .values({ id: input.id, hoaDonId: input.hoaDonId, chiNhanhId: hoaDonRow.chiNhanhId, ma, thoiGian: input.thoiGian })
          .run();

        for (const d of input.dong) {
          const [hddRow] = tx.select().from(hoaDonDong).where(eq(hoaDonDong.id, d.hoaDonDongId)).all();
          if (!hddRow) throw new HoaDonDongKhongTonTaiError(d.hoaDonDongId);
          if (hddRow.hoaDonId !== input.hoaDonId) {
            throw new HoaDonDongKhongThuocHoaDonError(d.hoaDonDongId, input.hoaDonId);
          }

          const soLuongDaBanCoSo = quyDoiSangCoSo(soLuongHienThi(hddRow.soLuong), hddRow.heSo);

          const [daTraTruoc] = tx
            .select({ tong: sql<number>`coalesce(sum(${traHangDong.soLuong}), 0)` })
            .from(traHangDong)
            .where(eq(traHangDong.hoaDonDongId, d.hoaDonDongId))
            .all();
          const tongDaTraTruoc = Number(daTraTruoc?.tong ?? 0);
          const conLaiToiDa = soLuongDaBanCoSo - tongDaTraTruoc;

          if (d.soLuong > conLaiToiDa) throw new VuotSoLuongDaBanError(d.hoaDonDongId, conLaiToiDa);

          const tienHoan = chiaLamTronNuaLen((hddRow.thanhTien - hddRow.giamGiaPhanBo) * d.soLuong, soLuongDaBanCoSo);
          tongTienHoan += tienHoan;

          tx.insert(traHangDong)
            .values({ id: d.id, traHangId: input.id, hoaDonDongId: d.hoaDonDongId, soLuong: d.soLuong, tienHoan })
            .run();

          // Các lô đã trừ lúc bán, LIFO = thuTu giảm dần (trừ sau cùng hoàn trước).
          const cacLoDaTru = tx
            .select()
            .from(hoaDonDongLo)
            .where(eq(hoaDonDongLo.hoaDonDongId, d.hoaDonDongId))
            .orderBy(desc(hoaDonDongLo.thuTu))
            .all();

          // Đã hoàn theo từng lô ở các phiếu trả trước của CHÍNH dòng hoá đơn này.
          const hangDaHoanTheoLo = tx
            .select({ loId: traHangDongLo.loId, tong: sql<number>`sum(${traHangDongLo.soLuong})` })
            .from(traHangDongLo)
            .innerJoin(traHangDong, eq(traHangDong.id, traHangDongLo.traHangDongId))
            .where(eq(traHangDong.hoaDonDongId, d.hoaDonDongId))
            .groupBy(traHangDongLo.loId)
            .all();
          const daHoanTheoLo = new Map(hangDaHoanTheoLo.map((r) => [r.loId, Number(r.tong)]));

          const danhSachLoConLai = cacLoDaTru.map((lo) => ({
            loId: lo.loId,
            soLuong: lo.soLuong - (daHoanTheoLo.get(lo.loId) ?? 0),
          }));

          const phanBo = phanBoHoanLifo(danhSachLoConLai, d.soLuong);

          for (const pb of phanBo) {
            tx.insert(traHangDongLo).values({ id: `${d.id}-${pb.loId}`, traHangDongId: d.id, loId: pb.loId, soLuong: pb.soLuong }).run();

            ghiMotDongTheKho(tx, {
              id: `${d.id}-${pb.loId}-tk`,
              chiNhanhId: hoaDonRow.chiNhanhId,
              loId: pb.loId,
              loai: 'TRA_HANG',
              soLuong: pb.soLuong,
              thoiGian: input.thoiGian,
            });
          }
        }
      });

      return { id: input.id, ma, tongTienHoan };
    } catch (loi) {
      if (!laLoiTrungMaTraHang(loi)) throw loi;
      // Mã tự sinh đụng UNIQUE do đua giữa hai lần tạo gần nhau — thử mã kế tiếp.
    }
  }

  throw new Error('không sinh được mã trả hàng tự động sau nhiều lần thử');
}
