import { and, desc, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { soLuongCoSo, soLuongHienThi } from '../../shared/kieu/so-luong';
import { quyDoiSangCoSo, quyDoiTuCoSo } from '../../shared/don-vi/quy-doi';
import { chiaLamTronNuaLen } from '../../shared/tien/lam-tron';
import { loHang, phieuNhap, phieuNhapDong, sanPham, tonKhoLo, traHangNhap, traHangNhapDong } from '../db/schema';
import { KhongDuTonKhoError } from '../kho/fefo';
import { ghiMotDongTheKho } from '../kho/so-cai';

type Db = ReturnType<typeof drizzle>;
/** `db` ngoài transaction hoặc `tx` bên trong — cùng API `.select()` (tiền lệ `DbOrTx` ở `tra-hang/tao-phieu-tra-hang.ts`). */
type DbOrTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

export class DongTraHangNhapRongError extends Error {
  constructor() {
    super('Phiếu trả hàng nhập phải có ít nhất một dòng');
    this.name = 'DongTraHangNhapRongError';
  }
}

export class SoLuongKhongHopLeError extends Error {
  constructor(public readonly dongId: string) {
    super(`Số lượng trả của dòng ${dongId} phải là số nguyên dương`);
    this.name = 'SoLuongKhongHopLeError';
  }
}

export class PhieuNhapKhongTonTaiError extends Error {
  constructor(public readonly phieuNhapId: string) {
    super(`Không tìm thấy phiếu nhập ${phieuNhapId}`);
    this.name = 'PhieuNhapKhongTonTaiError';
  }
}

export class PhieuNhapChuaHoanThanhError extends Error {
  constructor(public readonly phieuNhapId: string) {
    super(`Phiếu nhập ${phieuNhapId} chưa hoàn thành — chưa từng ghi kho nên chưa thể trả`);
    this.name = 'PhieuNhapChuaHoanThanhError';
  }
}

export class PhieuNhapDongKhongTonTaiError extends Error {
  constructor(public readonly phieuNhapDongId: string) {
    super(`Không tìm thấy dòng phiếu nhập ${phieuNhapDongId}`);
    this.name = 'PhieuNhapDongKhongTonTaiError';
  }
}

export class PhieuNhapDongKhongThuocPhieuError extends Error {
  constructor(
    public readonly phieuNhapDongId: string,
    public readonly phieuNhapId: string,
  ) {
    super(`Dòng phiếu nhập ${phieuNhapDongId} không thuộc phiếu nhập ${phieuNhapId}`);
    this.name = 'PhieuNhapDongKhongThuocPhieuError';
  }
}

export class VuotSoLuongDaNhapError extends Error {
  constructor(
    public readonly phieuNhapDongId: string,
    public readonly conLaiToiDa: number,
  ) {
    super(`Dòng phiếu nhập ${phieuNhapDongId}: chỉ còn trả được tối đa ${conLaiToiDa} (đơn vị cơ sở)`);
    this.name = 'VuotSoLuongDaNhapError';
  }
}

export interface DongTraHangNhapInput {
  id: string;
  phieuNhapDongId: string;
  /** Số lượng trả, đơn vị CƠ SỞ (không phải đơn vị đã chọn lúc nhập — SPEC.md §3.2). */
  soLuong: number;
}

export interface TaoPhieuTraHangNhapInput {
  id: string;
  phieuNhapId: string;
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: string;
  dong: readonly DongTraHangNhapInput[];
}

export interface PhieuTraHangNhapDaTao {
  id: string;
  ma: string;
  tongTienHoan: number;
}

export interface TraHangNhapDanhSachItem {
  id: string;
  ma: string;
  phieuNhapId: string;
  /** Mã phiếu nhập gốc — liên kết ngược (T-053b), tra qua JOIN lúc đọc. */
  phieuNhapMa: string;
  chiNhanhId: string;
  thoiGian: string;
  tongTienHoan: number;
}

export interface TraHangNhapDongChiTiet {
  id: string;
  phieuNhapDongId: string;
  sanPhamId: string;
  /** Mã/tên sản phẩm HIỆN TẠI, tra qua JOIN lúc đọc — không snapshot (cùng tiền lệ `tra_hang_dong`). */
  maHang: string;
  ten: string;
  soLuong: number;
  tienHoan: number;
}

export interface TraHangNhapChiTiet extends TraHangNhapDanhSachItem {
  dong: TraHangNhapDongChiTiet[];
}

export interface PhieuNhapDongDeTraHangNhap {
  /** `phieu_nhap_dong.id` — client gửi lại đúng id này khi gọi `POST /api/tra-hang-nhap`. */
  id: string;
  sanPhamId: string;
  maHang: string;
  ten: string;
  donViTen: string;
  heSo: number;
  /** Đã nhập, đơn vị ĐÃ CHỌN lúc nhập (giống cột "Số lượng" của `phieu_nhap_dong`). */
  soLuongDaNhap: number;
  /**
   * Còn trả được tối đa, quy đổi về đúng đơn vị đã nhập — LÀM TRÒN XUỐNG
   * (`quyDoiTuCoSo`, không làm tròn lên), cùng tiền lệ `HoaDonDongDeTraHang`
   * (T-052c) để một lần trả đủ số này không bao giờ vượt
   * `tinhConLaiToiDaNhapCoSo` thật ở tầng cơ sở.
   */
  conLaiToiDa: number;
}

export interface PhieuNhapDeTraHangNhap {
  id: string;
  ma: string;
  thoiGian: string;
  dong: PhieuNhapDongDeTraHangNhap[];
}

function laLoiTrungMaTraHangNhap(loi: unknown): boolean {
  return loi instanceof Error && /UNIQUE constraint failed: tra_hang_nhap\.ma/.test(loi.message);
}

/** "THN" + số thứ tự 6 chữ số, tính trên tổng số phiếu trả hàng nhập hiện có + số lần đã thử lại. */
function sinhMaTraHangNhapTuDong(db: Db, soLanDaThu: number): string {
  const [hang] = db.select({ dem: sql<number>`count(*)` }).from(traHangNhap).all();
  return `THN${String(Number(hang?.dem ?? 0) + 1 + soLanDaThu).padStart(6, '0')}`;
}

/**
 * Phần còn trả được tối đa của một dòng phiếu nhập, đơn vị CƠ SỞ — đã nhập trừ
 * tổng đã trả ở các phiếu trả hàng nhập trước (cộng dồn). Cùng tiền lệ
 * `tinhConLaiToiDaCoSo` ở `tra-hang/tao-phieu-tra-hang.ts`.
 */
function tinhConLaiToiDaNhapCoSo(dbOrTx: DbOrTx, phieuNhapDongId: string, soLuongDaNhapCoSo: number): number {
  const [daTraTruoc] = dbOrTx
    .select({ tong: sql<number>`coalesce(sum(${traHangNhapDong.soLuong}), 0)` })
    .from(traHangNhapDong)
    .where(eq(traHangNhapDong.phieuNhapDongId, phieuNhapDongId))
    .all();
  return soLuongDaNhapCoSo - Number(daTraTruoc?.tong ?? 0);
}

/**
 * Lô ĐÃ NHẬN của một dòng phiếu nhập — suy lại từ khoá tự nhiên
 * `(san_pham_id, so_lo, hsd)` giống lúc `hoanThanhTrongTx` (T-040a) get-or-create
 * lô đó, hoặc lô ngầm định khi dòng không khai lô. Không FEFO: trả hàng nhập
 * luôn về ĐÚNG lô đã nhận, không phải lô khác do FEFO chọn. Chỉ SELECT, không
 * tạo mới — phiếu nhập đã `HOAN_THANH` (đã kiểm ở caller) nên lô này chắc chắn
 * đã tồn tại; không tồn tại là vi phạm bất biến nội bộ.
 */
function timLoDaNhap(tx: DbOrTx, sanPhamId: string, soLo: string | null, hsd: string | null): string {
  if (soLo !== null && hsd !== null) {
    const [lo] = tx
      .select({ id: loHang.id })
      .from(loHang)
      .where(and(eq(loHang.sanPhamId, sanPhamId), eq(loHang.soLo, soLo), eq(loHang.hsd, hsd)))
      .all();
    if (!lo) {
      throw new Error(`Không tìm thấy lô đã nhập (${soLo}/${hsd}) cho sản phẩm ${sanPhamId} — vi phạm bất biến nội bộ`);
    }
    return lo.id;
  }

  const [lo] = tx.select({ id: loHang.id }).from(loHang).where(and(eq(loHang.sanPhamId, sanPhamId), eq(loHang.laLoMacDinh, true))).all();
  if (!lo) throw new Error(`Sản phẩm ${sanPhamId} không có lô ngầm định — vi phạm bất biến trigger (T-004b)`);
  return lo.id;
}

/**
 * Tạo phiếu trả hàng nhập (trả NCC, T-053a, SPEC.md §3.5/§6.4): với mỗi dòng,
 * trừ đúng LÔ ĐÃ NHẬN ở dòng phiếu nhập gốc đó (không FEFO — `timLoDaNhap`),
 * ghi thẻ kho `TRA_NCC` âm qua `ghiMotDongTheKho` đã có. Toàn bộ một phiếu
 * chạy trong MỘT transaction nguyên tử. Không có nhánh nào theo cài đặt quản
 * lý lô: ở chế độ phẳng, dòng phiếu nhập gốc chỉ có đúng một lô (lô ngầm
 * định) nên hàm này tự suy biến thành "trừ về lô ngầm định" — cùng một đường
 * code (ARCHITECTURE.md §5).
 */
export function taoPhieuTraHangNhap(db: Db, input: TaoPhieuTraHangNhapInput): PhieuTraHangNhapDaTao {
  if (input.dong.length === 0) throw new DongTraHangNhapRongError();
  for (const d of input.dong) {
    if (!Number.isInteger(d.soLuong) || d.soLuong <= 0) throw new SoLuongKhongHopLeError(d.id);
  }

  const soLanThuToiDa = 5;
  for (let lanThu = 0; lanThu < soLanThuToiDa; lanThu++) {
    const ma = sinhMaTraHangNhapTuDong(db, lanThu);
    let tongTienHoan = 0;

    try {
      db.transaction((tx) => {
        const [phieu] = tx.select().from(phieuNhap).where(eq(phieuNhap.id, input.phieuNhapId)).all();
        if (!phieu) throw new PhieuNhapKhongTonTaiError(input.phieuNhapId);
        if (phieu.trangThai !== 'HOAN_THANH') throw new PhieuNhapChuaHoanThanhError(input.phieuNhapId);

        tx.insert(traHangNhap)
          .values({ id: input.id, phieuNhapId: input.phieuNhapId, chiNhanhId: phieu.chiNhanhId, ma, thoiGian: input.thoiGian })
          .run();

        for (const d of input.dong) {
          const [pnd] = tx.select().from(phieuNhapDong).where(eq(phieuNhapDong.id, d.phieuNhapDongId)).all();
          if (!pnd) throw new PhieuNhapDongKhongTonTaiError(d.phieuNhapDongId);
          if (pnd.phieuId !== input.phieuNhapId) {
            throw new PhieuNhapDongKhongThuocPhieuError(d.phieuNhapDongId, input.phieuNhapId);
          }

          const soLuongDaNhapCoSo = quyDoiSangCoSo(soLuongHienThi(pnd.soLuong), pnd.heSo);
          const conLaiToiDa = tinhConLaiToiDaNhapCoSo(tx, d.phieuNhapDongId, soLuongDaNhapCoSo);
          if (d.soLuong > conLaiToiDa) throw new VuotSoLuongDaNhapError(d.phieuNhapDongId, conLaiToiDa);

          const loId = timLoDaNhap(tx, pnd.sanPhamId, pnd.soLo, pnd.hsd);

          const [tonRow] = tx.select().from(tonKhoLo).where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, phieu.chiNhanhId))).all();
          const tonHienTai = tonRow?.ton ?? 0;
          if (d.soLuong > tonHienTai) throw new KhongDuTonKhoError(d.soLuong - tonHienTai);

          // Tổng tiền dòng nhập gốc (đơn giá × số lượng, đơn vị ĐÃ CHỌN lúc
          // nhập — SPEC.md §3.4), phân bổ theo TỶ LỆ số lượng trả/đã nhập
          // (cả hai quy về cơ sở) — cùng `chiaLamTronNuaLen` dùng ở
          // `tra_hang_dong.tien_hoan` (T-052a), không phải công thức tiền mới.
          const tongTienDongGoc = pnd.donGia * pnd.soLuong;
          const tienHoan = chiaLamTronNuaLen(tongTienDongGoc * d.soLuong, soLuongDaNhapCoSo);
          tongTienHoan += tienHoan;

          tx.insert(traHangNhapDong)
            .values({ id: d.id, traHangNhapId: input.id, phieuNhapDongId: d.phieuNhapDongId, soLuong: d.soLuong, tienHoan })
            .run();

          ghiMotDongTheKho(tx, {
            id: `${d.id}-tk`,
            chiNhanhId: phieu.chiNhanhId,
            loId,
            loai: 'TRA_NCC',
            soLuong: -d.soLuong,
            thoiGian: input.thoiGian,
          });
        }
      });

      return { id: input.id, ma, tongTienHoan };
    } catch (loi) {
      if (!laLoiTrungMaTraHangNhap(loi)) throw loi;
      // Mã tự sinh đụng UNIQUE do đua giữa hai lần tạo gần nhau — thử mã kế tiếp.
    }
  }

  throw new Error('không sinh được mã trả hàng nhập tự động sau nhiều lần thử');
}

/**
 * Tìm một phiếu nhập theo mã để bắt đầu luồng tạo trả hàng nhập (T-053c2): trả
 * về từng dòng kèm `conLaiToiDa` — chỉ ĐỌC, không xác thực hay ghi gì. `POST
 * /api/tra-hang-nhap` (qua `taoPhieuTraHangNhap`) mới là nguồn sự thật cuối
 * cùng, dùng lại đúng `tinhConLaiToiDaNhapCoSo` nên không có hai công thức.
 * Phiếu còn `PHIEU_TAM` (chưa hoàn thành) trả về `dong: []` thay vì `throw` —
 * phiếu đó chưa từng ghi kho nên chưa có gì để trả, nhưng tra theo mã vẫn phải
 * tìm thấy phiếu để giao diện báo đúng lý do (khác "không tìm thấy mã này").
 */
export function timPhieuNhapDeTraHangNhap(db: Db, ma: string): PhieuNhapDeTraHangNhap | undefined {
  const [p] = db.select().from(phieuNhap).where(eq(phieuNhap.ma, ma)).all();
  if (!p) return undefined;

  if (p.trangThai !== 'HOAN_THANH') {
    return { id: p.id, ma: p.ma, thoiGian: p.thoiGian, dong: [] };
  }

  const dongRows = db
    .select({
      id: phieuNhapDong.id,
      sanPhamId: phieuNhapDong.sanPhamId,
      maHang: sanPham.maHang,
      ten: sanPham.ten,
      donViTen: phieuNhapDong.donViTen,
      heSo: phieuNhapDong.heSo,
      soLuong: phieuNhapDong.soLuong,
    })
    .from(phieuNhapDong)
    .innerJoin(sanPham, eq(sanPham.id, phieuNhapDong.sanPhamId))
    .where(eq(phieuNhapDong.phieuId, p.id))
    .all();

  const dong = dongRows.map((d) => {
    const soLuongDaNhapCoSo = quyDoiSangCoSo(soLuongHienThi(d.soLuong), d.heSo);
    const conLaiToiDaCoSo = tinhConLaiToiDaNhapCoSo(db, d.id, soLuongDaNhapCoSo);
    const conLaiToiDa = quyDoiTuCoSo(soLuongCoSo(conLaiToiDaCoSo), d.heSo).soLuong;
    return {
      id: d.id,
      sanPhamId: d.sanPhamId,
      maHang: d.maHang,
      ten: d.ten,
      donViTen: d.donViTen,
      heSo: d.heSo,
      soLuongDaNhap: d.soLuong,
      conLaiToiDa,
    };
  });

  return { id: p.id, ma: p.ma, thoiGian: p.thoiGian, dong };
}

/**
 * Danh sách phiếu trả hàng nhập, mới nhất trước (T-053b). Kèm mã phiếu nhập
 * gốc (liên kết ngược) qua JOIN — không snapshot, vì `ma` phiếu nhập bất biến
 * sau khi tạo. `tongTienHoan` tính bằng một truy vấn gộp riêng (không N+1
 * theo từng phiếu) — cùng khuôn `layDanhSachTraHang` (T-052b).
 */
export function layDanhSachTraHangNhap(db: Db): TraHangNhapDanhSachItem[] {
  const hang = db
    .select({
      id: traHangNhap.id,
      ma: traHangNhap.ma,
      phieuNhapId: traHangNhap.phieuNhapId,
      phieuNhapMa: phieuNhap.ma,
      chiNhanhId: traHangNhap.chiNhanhId,
      thoiGian: traHangNhap.thoiGian,
    })
    .from(traHangNhap)
    .innerJoin(phieuNhap, eq(phieuNhap.id, traHangNhap.phieuNhapId))
    .orderBy(desc(traHangNhap.thoiGianMayChu))
    .all();

  const tongTheoPhieu = new Map(
    db
      .select({ traHangNhapId: traHangNhapDong.traHangNhapId, tongTienHoan: sql<number>`SUM(${traHangNhapDong.tienHoan})` })
      .from(traHangNhapDong)
      .groupBy(traHangNhapDong.traHangNhapId)
      .all()
      .map((r) => [r.traHangNhapId, Number(r.tongTienHoan)]),
  );

  return hang.map((p) => ({ ...p, tongTienHoan: tongTheoPhieu.get(p.id) ?? 0 }));
}

/** Chi tiết một phiếu trả hàng nhập kèm toàn bộ dòng và liên kết ngược phiếu nhập gốc (T-053b). */
export function layChiTietTraHangNhap(db: Db, id: string): TraHangNhapChiTiet | undefined {
  const [phieu] = db
    .select({
      id: traHangNhap.id,
      ma: traHangNhap.ma,
      phieuNhapId: traHangNhap.phieuNhapId,
      phieuNhapMa: phieuNhap.ma,
      chiNhanhId: traHangNhap.chiNhanhId,
      thoiGian: traHangNhap.thoiGian,
    })
    .from(traHangNhap)
    .innerJoin(phieuNhap, eq(phieuNhap.id, traHangNhap.phieuNhapId))
    .where(eq(traHangNhap.id, id))
    .all();
  if (!phieu) return undefined;

  const dong = db
    .select({
      id: traHangNhapDong.id,
      phieuNhapDongId: traHangNhapDong.phieuNhapDongId,
      sanPhamId: phieuNhapDong.sanPhamId,
      maHang: sanPham.maHang,
      ten: sanPham.ten,
      soLuong: traHangNhapDong.soLuong,
      tienHoan: traHangNhapDong.tienHoan,
    })
    .from(traHangNhapDong)
    .innerJoin(phieuNhapDong, eq(phieuNhapDong.id, traHangNhapDong.phieuNhapDongId))
    .innerJoin(sanPham, eq(sanPham.id, phieuNhapDong.sanPhamId))
    .where(eq(traHangNhapDong.traHangNhapId, id))
    .all();

  return {
    ...phieu,
    tongTienHoan: dong.reduce((tong, d) => tong + d.tienHoan, 0),
    dong,
  };
}
