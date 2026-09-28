import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { giaiNghiaCaiDatQuanLyLo, type GhiDeQuanLyLo } from '../../shared/cai-dat/giai-nghia';
import { quyDoiSangCoSo } from '../../shared/don-vi/quy-doi';
import { soLuongHienThi } from '../../shared/kieu/so-luong';
import { caiDat, loHang, phieuNhap, phieuNhapDong, sanPham } from '../db/schema';
import { ghiMotDongTheKho, type TxTheKho } from '../kho/so-cai';

type Db = ReturnType<typeof drizzle>;

export type TrangThaiPhieuNhap = 'PHIEU_TAM' | 'HOAN_THANH';

export class DongPhieuNhapRongError extends Error {
  constructor() {
    super('Phiếu nhập phải có ít nhất một dòng');
    this.name = 'DongPhieuNhapRongError';
  }
}

export class SoLuongKhongHopLeError extends Error {
  constructor(public readonly dongId: string) {
    super(`Số lượng dòng ${dongId} phải là số nguyên dương`);
    this.name = 'SoLuongKhongHopLeError';
  }
}

// Một trong hai (số lô, HSD) được khai mà thiếu vế còn lại — không đủ để xác
// định một lô thật, bất kể sản phẩm đang bật hay tắt quản lý lô.
export class LoHsdKhongDayDuError extends Error {
  constructor(public readonly dongId: string) {
    super(`Dòng ${dongId}: đã khai số lô hoặc HSD thì phải khai đủ cả hai`);
    this.name = 'LoHsdKhongDayDuError';
  }
}

export class ThieuLoHsdError extends Error {
  constructor(public readonly dongId: string) {
    super(`Dòng ${dongId}: sản phẩm đang bật quản lý theo lô, bắt buộc khai số lô và HSD`);
    this.name = 'ThieuLoHsdError';
  }
}

export class SanPhamKhongTonTaiError extends Error {
  constructor(public readonly sanPhamId: string) {
    super(`Không tìm thấy sản phẩm ${sanPhamId}`);
    this.name = 'SanPhamKhongTonTaiError';
  }
}

export class PhieuNhapKhongTonTaiError extends Error {
  constructor(public readonly phieuId: string) {
    super(`Không tìm thấy phiếu nhập ${phieuId}`);
    this.name = 'PhieuNhapKhongTonTaiError';
  }
}

export class PhieuDaHoanThanhError extends Error {
  constructor(public readonly phieuId: string) {
    super(`Phiếu nhập ${phieuId} đã hoàn thành, không thể hoàn thành lại`);
    this.name = 'PhieuDaHoanThanhError';
  }
}

export interface DongPhieuNhapInput {
  id: string;
  sanPhamId: string;
  /** Tên đơn vị đã chọn — sao chép vào chứng từ, không tham chiếu `don_vi_tinh` (SPEC.md §5.4). */
  donViTen: string;
  /** Hệ số quy đổi của đơn vị đã chọn, tại thời điểm nhập. */
  heSo: number;
  /** Đơn giá của đơn vị đã chọn (không phải đơn vị cơ sở), tại thời điểm nhập. */
  donGia: number;
  /** Số lượng theo đơn vị đã chọn (`donViTen`), KHÔNG phải đơn vị cơ sở. */
  soLuong: number;
  /** Lô mong muốn — cho phép rỗng khi sản phẩm tắt quản lý lô (SPEC.md §3.2). */
  soLo?: string | null;
  hsd?: string | null;
}

export interface TaoPhieuNhapInput {
  id: string;
  chiNhanhId: string;
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: string;
  /** true = hoàn thành ngay (ghi kho ngay trong cùng transaction); mặc định false = lưu tạm, không ghi kho. */
  hoanThanhNgay?: boolean;
  dong: readonly DongPhieuNhapInput[];
}

export interface PhieuNhapDaTao {
  id: string;
  ma: string;
  trangThai: TrangThaiPhieuNhap;
}

function laLoiTrungMaPhieuNhap(loi: unknown): boolean {
  return loi instanceof Error && /UNIQUE constraint failed: phieu_nhap\.ma/.test(loi.message);
}

/** "PN" + số thứ tự 6 chữ số, tính trên tổng số phiếu nhập hiện có + số lần đã thử lại. */
function sinhMaPhieuNhapTuDong(db: Db, soLanDaThu: number): string {
  const hang = db.select({ id: phieuNhap.id }).from(phieuNhap).all();
  return `PN${String(hang.length + 1 + soLanDaThu).padStart(6, '0')}`;
}

function chuanHoaChuoi(gia: string | null | undefined): string | null {
  const cat = gia?.trim();
  return cat ? cat : null;
}

function timLoNgamDinh(tx: TxTheKho, sanPhamId: string): string {
  const [lo] = tx
    .select({ id: loHang.id })
    .from(loHang)
    .where(and(eq(loHang.sanPhamId, sanPhamId), eq(loHang.laLoMacDinh, true)))
    .all();
  if (!lo) throw new Error(`Sản phẩm ${sanPhamId} không có lô ngầm định — vi phạm bất biến trigger (T-004b)`);
  return lo.id;
}

// Get-or-create đúng một lô thật theo khoá tự nhiên (sanPhamId, soLo, hsd) — cả
// hai đều đã được xác nhận không null trước khi gọi hàm này (xem
// `LoHsdKhongDayDuError`), nên ràng buộc unique `lo_hang_san_pham_so_lo_hsd_unique`
// hoạt động đáng tin cậy (không rơi vào ngữ nghĩa NULL != NULL của SQLite).
// `onConflictDoNothing` + select lại theo khoá tự nhiên: hai lần nhập cùng
// (sản phẩm, số lô, HSD) luôn ra cùng một lô, không tạo lô trùng.
function layHoacTaoLoThat(tx: TxTheKho, sanPhamId: string, soLo: string, hsd: string, idUngVien: string): string {
  tx.insert(loHang).values({ id: idUngVien, sanPhamId, soLo, hsd }).onConflictDoNothing().run();
  const [lo] = tx
    .select({ id: loHang.id })
    .from(loHang)
    .where(and(eq(loHang.sanPhamId, sanPhamId), eq(loHang.soLo, soLo), eq(loHang.hsd, hsd)))
    .all();
  if (!lo) throw new Error(`get-or-create lô thất bại cho sản phẩm ${sanPhamId} (${soLo}/${hsd})`);
  return lo.id;
}

function docCaiDatToanCuc(tx: TxTheKho): boolean {
  const [row] = tx.select({ quanLyLo: caiDat.quanLyLo }).from(caiDat).all();
  return row?.quanLyLo ?? false;
}

/**
 * Ghi kho thật cho một phiếu nhập đang `PHIEU_TAM`: mỗi dòng get-or-create đúng
 * một lô theo `(san_pham_id, so_lo, hsd)` — dùng lô ngầm định khi không khai lô
 * (SPEC.md §3.2) — rồi ghi thẻ kho `NHAP` dương bằng số lượng cơ sở, với
 * `gia_tri` là tổng tiền nhập của dòng (đơn giá × số lượng theo đơn vị đã chọn —
 * KHÔNG nhân với số lượng cơ sở: đó sẽ sai đơn vị đo trừ khi có phép chia, mà
 * SPEC.md §3.4 cấm phép chia ở bước này; công thức đúng khớp bảng "Nhập sl với
 * tổng tiền T" của SPEC.md §3.4). Không có nhánh nào theo cài đặt quản lý lô
 * trong hàm này (ARCHITECTURE.md §5) — cờ chỉ quyết định có BẮT BUỘC khai lô hay
 * không, không quyết định CÁCH ghi.
 *
 * Chạy trong `tx` đã mở sẵn của caller (`taoPhieuNhap` khi hoàn thành ngay, hoặc
 * `hoanThanhPhieuNhap`) — toàn bộ một phiếu chạy trong một transaction.
 */
function hoanThanhTrongTx(tx: TxTheKho, phieuId: string, chiNhanhId: string, thoiGian: string): void {
  const toanCuc = docCaiDatToanCuc(tx);
  const cacDong = tx.select().from(phieuNhapDong).where(eq(phieuNhapDong.phieuId, phieuId)).all();

  for (const dong of cacDong) {
    const [spRow] = tx
      .select({ quanLyLoGhiDe: sanPham.quanLyLoGhiDe })
      .from(sanPham)
      .where(eq(sanPham.id, dong.sanPhamId))
      .all();
    if (!spRow) throw new SanPhamKhongTonTaiError(dong.sanPhamId);

    const ghiDe: GhiDeQuanLyLo = spRow.quanLyLoGhiDe ?? 'KE_THUA';
    const batQuanLyLo = giaiNghiaCaiDatQuanLyLo(toanCuc, ghiDe);

    const { soLo, hsd } = dong;
    if ((soLo !== null) !== (hsd !== null)) throw new LoHsdKhongDayDuError(dong.id);
    const caCoLo = soLo !== null && hsd !== null;
    if (batQuanLyLo && !caCoLo) throw new ThieuLoHsdError(dong.id);

    const loId = caCoLo
      ? layHoacTaoLoThat(tx, dong.sanPhamId, soLo, hsd, `${dong.id}-lo`)
      : timLoNgamDinh(tx, dong.sanPhamId);

    const soLuongCoSo = quyDoiSangCoSo(soLuongHienThi(dong.soLuong), dong.heSo);
    // Tổng tiền nhập của dòng — nhân duy nhất, không phép chia (SPEC.md §3.4).
    const giaTri = dong.donGia * dong.soLuong;

    ghiMotDongTheKho(tx, {
      id: `${dong.id}-tk`,
      chiNhanhId,
      loId,
      loai: 'NHAP',
      soLuong: soLuongCoSo,
      giaTri,
      thoiGian,
    });
  }

  tx.update(phieuNhap).set({ trangThai: 'HOAN_THANH' }).where(eq(phieuNhap.id, phieuId)).run();
}

/**
 * Tạo phiếu nhập (T-040a, SPEC.md §6.2): luôn lưu dòng ở trạng thái `PHIEU_TAM`
 * trước (không ghi kho), rồi hoàn thành ngay trong CÙNG transaction khi
 * `hoanThanhNgay` — không có đường ghi kho nào khác ngoài `hoanThanhTrongTx`.
 */
export function taoPhieuNhap(db: Db, input: TaoPhieuNhapInput): PhieuNhapDaTao {
  if (input.dong.length === 0) throw new DongPhieuNhapRongError();
  for (const d of input.dong) {
    if (!Number.isInteger(d.soLuong) || d.soLuong <= 0) throw new SoLuongKhongHopLeError(d.id);
  }

  const soLanThuToiDa = 5;
  for (let lanThu = 0; lanThu < soLanThuToiDa; lanThu++) {
    const ma = sinhMaPhieuNhapTuDong(db, lanThu);
    let trangThai: TrangThaiPhieuNhap = 'PHIEU_TAM';

    try {
      db.transaction((tx) => {
        tx.insert(phieuNhap)
          .values({ id: input.id, chiNhanhId: input.chiNhanhId, ma, trangThai: 'PHIEU_TAM', thoiGian: input.thoiGian })
          .run();

        for (const d of input.dong) {
          tx.insert(phieuNhapDong)
            .values({
              id: d.id,
              phieuId: input.id,
              sanPhamId: d.sanPhamId,
              donViTen: d.donViTen,
              heSo: d.heSo,
              donGia: d.donGia,
              soLuong: d.soLuong,
              soLo: chuanHoaChuoi(d.soLo),
              hsd: chuanHoaChuoi(d.hsd),
            })
            .run();
        }

        if (input.hoanThanhNgay) {
          hoanThanhTrongTx(tx, input.id, input.chiNhanhId, input.thoiGian);
          trangThai = 'HOAN_THANH';
        }
      });

      return { id: input.id, ma, trangThai };
    } catch (loi) {
      if (!laLoiTrungMaPhieuNhap(loi)) throw loi;
      // Mã tự sinh đụng UNIQUE do đua giữa hai lần tạo gần nhau — thử mã kế tiếp.
    }
  }

  throw new Error('không sinh được mã phiếu nhập tự động sau nhiều lần thử');
}

/** Hoàn thành một phiếu đang `PHIEU_TAM` — idempotent: phiếu đã `HOAN_THANH` bị từ chối, không ghi kho lần hai. */
export function hoanThanhPhieuNhap(db: Db, phieuId: string, thoiGian: string): void {
  db.transaction((tx) => {
    const [phieu] = tx.select().from(phieuNhap).where(eq(phieuNhap.id, phieuId)).all();
    if (!phieu) throw new PhieuNhapKhongTonTaiError(phieuId);
    if (phieu.trangThai === 'HOAN_THANH') throw new PhieuDaHoanThanhError(phieuId);

    hoanThanhTrongTx(tx, phieuId, phieu.chiNhanhId, thoiGian);
  });
}
