import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { loHang, tonKhoLo } from '../db/schema';
import type { TxTheKho } from './so-cai';

type Db = ReturnType<typeof drizzle>;
// Đọc tồn theo lô cần chạy được cả bên ngoài transaction (db) lẫn bên trong một
// transaction đã mở sẵn của module khác (vd. src/server/ban-hang/, gọi bằng
// `tx` để chọn lô và ghi thẻ kho BAN trong CÙNG một giao dịch nguyên tử) — cùng
// lý do `ghiMotDongTheKho` nhận `TxTheKho` ở src/server/kho/so-cai.ts.
type DbHoacTx = Db | TxTheKho;

export interface LoTonKho {
  loId: string;
  hsd: string | null;
  ngayTao: string;
  /** Tồn hiện tại của lô, đơn vị cơ sở. */
  ton: number;
}

export interface PhanBoLo {
  loId: string;
  /** Dương, số lượng lấy từ lô này, đơn vị cơ sở. */
  soLuong: number;
}

export class KhongDuTonKhoError extends Error {
  constructor(public readonly conThieu: number) {
    super(`Không đủ tồn kho: còn thiếu ${conThieu} đơn vị cơ sở`);
    this.name = 'KhongDuTonKhoError';
  }
}

export interface TuyChonPhanBo {
  /**
   * Cho phép tồn âm khi tổng tồn không đủ: phần thiếu dồn vào lô cuối cùng
   * trong danh sách thay vì ném `KhongDuTonKhoError` (SPEC.md §4.4 — "máy chủ
   * không bao giờ từ chối một đơn đã bán và đã in"). Chỉ dùng ở đường đồng bộ
   * offline (T-033); mặc định false nên đường bán hàng trực tuyến (T-022) vẫn
   * từ chối bán vượt tồn như cũ.
   */
  choPhepTonAm?: boolean;
}

function soSanhFefo(a: LoTonKho, b: LoTonKho): number {
  if (a.hsd !== b.hsd) {
    if (a.hsd === null) return -1;
    if (b.hsd === null) return 1;
    return a.hsd < b.hsd ? -1 : 1;
  }
  if (a.ngayTao !== b.ngayTao) return a.ngayTao < b.ngayTao ? -1 : 1;
  return a.loId < b.loId ? -1 : 1;
}

// Sắp theo FEFO (SPEC.md §4.1): hsd ASC NULLS FIRST, ngay_tao ASC, lo_id ASC.
// NULLS FIRST là cố ý — tồn cũ chưa rõ HSD (lô ngầm định) bán trước lô thật.
export function sapXepFefo(danhSachLo: readonly LoTonKho[]): LoTonKho[] {
  return [...danhSachLo].sort(soSanhFefo);
}

// Chọn lô thủ công ghi đè FEFO (SPEC.md §4.1): lô trong `loUuTienThuCong` (theo
// đúng thứ tự truyền vào) được xếp trước, phần còn lại vẫn theo FEFO. Không phải
// nhánh riêng — vẫn cùng một hàm phân bổ `phanBoTheoThuTu` phía sau, chỉ khác thứ
// tự danh sách lô đưa vào.
export function sapXepUuTienThuCong(
  danhSachLo: readonly LoTonKho[],
  loUuTienThuCong: readonly string[],
): LoTonKho[] {
  const conLai = new Map(danhSachLo.map((lo) => [lo.loId, lo]));
  const daChon: LoTonKho[] = [];
  for (const loId of loUuTienThuCong) {
    const lo = conLai.get(loId);
    if (lo) {
      daChon.push(lo);
      conLai.delete(loId);
    }
  }
  return [...daChon, ...sapXepFefo([...conLai.values()])];
}

// Hàm thuần: chia soLuongCanXuat theo đúng thứ tự lô đã cho — tồn không đủ ở một
// lô thì tràn đúng sang lô kế tiếp trong danh sách (SPEC.md §9 bất biến 10). Ném
// KhongDuTonKhoError khi tổng tồn không đủ, dùng để từ chối bán vượt tồn lúc
// online (SPEC.md §4.4) — không trả về một phân bổ dở dang.
export function phanBoTheoThuTu(
  danhSachLoDaSapXep: readonly LoTonKho[],
  soLuongCanXuat: number,
  tuyChon: TuyChonPhanBo = {},
): PhanBoLo[] {
  if (soLuongCanXuat === 0) return [];

  const ketQua: PhanBoLo[] = [];
  let conLai = soLuongCanXuat;
  for (const lo of danhSachLoDaSapXep) {
    if (conLai <= 0) break;
    if (lo.ton <= 0) continue;
    const lay = Math.min(lo.ton, conLai);
    ketQua.push({ loId: lo.loId, soLuong: lay });
    conLai -= lay;
  }

  if (conLai > 0) {
    if (!tuyChon.choPhepTonAm) throw new KhongDuTonKhoError(conLai);

    const loCuoi = danhSachLoDaSapXep.at(-1);
    // Bất biến (SPEC.md §3.2): mọi sản phẩm luôn có ít nhất lô ngầm định, nên
    // danh sách không bao giờ rỗng ở đường gọi thật — đây chỉ là rào chắn kiểu.
    if (!loCuoi) throw new KhongDuTonKhoError(conLai);

    const phanBoCoSan = ketQua.find((pb) => pb.loId === loCuoi.loId);
    if (phanBoCoSan) {
      phanBoCoSan.soLuong += conLai;
    } else {
      ketQua.push({ loId: loCuoi.loId, soLuong: conLai });
    }
  }
  return ketQua;
}

export function layDanhSachLoTonKho(db: DbHoacTx, sanPhamId: string, chiNhanhId: string): LoTonKho[] {
  return db
    .select({ loId: loHang.id, hsd: loHang.hsd, ngayTao: loHang.ngayTao, ton: tonKhoLo.ton })
    .from(loHang)
    .leftJoin(tonKhoLo, and(eq(tonKhoLo.loId, loHang.id), eq(tonKhoLo.chiNhanhId, chiNhanhId)))
    .where(eq(loHang.sanPhamId, sanPhamId))
    .all()
    .map((dong) => ({ loId: dong.loId, hsd: dong.hsd, ngayTao: dong.ngayTao, ton: dong.ton ?? 0 }));
}

// Chọn lô xuất kho cho một sản phẩm: mặc định FEFO, cho phép ghi đè bằng danh
// sách lô ưu tiên thủ công. Vận hành như nhau trên sản phẩm chỉ có lô ngầm định
// (chế độ phẳng) lẫn sản phẩm nhiều lô thật — không có nhánh `if` nào theo cài
// đặt quản lý lô (ARCHITECTURE.md §5).
export function chonLoXuatKho(
  db: DbHoacTx,
  sanPhamId: string,
  chiNhanhId: string,
  soLuongCanXuat: number,
  loUuTienThuCong: readonly string[] = [],
  tuyChon: TuyChonPhanBo = {},
): PhanBoLo[] {
  const danhSach = layDanhSachLoTonKho(db, sanPhamId, chiNhanhId);
  const daSapXep =
    loUuTienThuCong.length > 0 ? sapXepUuTienThuCong(danhSach, loUuTienThuCong) : sapXepFefo(danhSach);
  return phanBoTheoThuTu(daSapXep, soLuongCanXuat, tuyChon);
}
