import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import type { Ulid } from '../../shared/kieu/ulid';

// T-031 — hàng đợi thao tác offline (ARCHITECTURE.md §1 "Dexie", SPEC.md §5.2).
// Đây là tầng hạ tầng CHUNG: một thao tác bất biến, có ULID do client sinh,
// idempotent — gửi lại (cùng id) là no-op. Loại thao tác cụ thể (bán hàng, trả
// hàng...) và cách thật sự GỬI lên máy chủ do T-032/T-033 quyết định; module
// này không biết và không cần biết hình dạng `duLieu` bên trong.

export const TrangThaiThaoTacSchema = z.enum(['CHO_GUI', 'DA_GUI', 'DA_XAC_NHAN', 'LOI']);
export type TrangThaiThaoTac = z.infer<typeof TrangThaiThaoTacSchema>;

// Zod đứng ở biên đọc từ IndexedDB (ARCHITECTURE.md §4) — dữ liệu cục bộ có
// thể bị hỏng do lỗi trình duyệt/dung lượng đầy, không được tin tưởng ngầm.
export const ThaoTacSchema = z.object({
  id: z.string().min(1),
  loai: z.string().min(1),
  duLieu: z.unknown(),
  trangThai: TrangThaiThaoTacSchema,
  thoiGianTao: z.number().int().nonnegative(),
  thoiGianCapNhat: z.number().int().nonnegative(),
  loiCuoi: z.string().optional(),
});
export type ThaoTac = z.infer<typeof ThaoTacSchema>;

type CsdlCucBo = Dexie & {
  thaoTac: EntityTable<ThaoTac, 'id'>;
};

function taoCsdlCucBo(): CsdlCucBo {
  const db = new Dexie('quanlyquaythuoc') as CsdlCucBo;
  db.version(1).stores({
    // Index theo trangThai (lọc "chờ gửi") và thoiGianTao (thứ tự xử lý FIFO).
    thaoTac: 'id, trangThai, thoiGianTao',
  });
  return db;
}

export const csdlCucBo = taoCsdlCucBo();

export type KetQuaThemThaoTac = 'DA_THEM' | 'DA_TON_TAI';

/**
 * Đưa một thao tác vào hàng đợi. Idempotent theo `id`: gửi lại (thao tác gọi
 * lại hàm này với cùng ULID, ví dụ do mạng chập chờn hoặc người dùng bấm lại)
 * không tạo thêm bản ghi — SPEC.md §5.2 "gửi lại là no-op". Dùng `add` (không
 * phải get-rồi-add) để phép kiểm tra trùng là một thao tác nguyên tử ở tầng
 * IndexedDB, không có khe hở race giữa hai lệnh gọi chồng lấn.
 */
export async function themThaoTac(id: Ulid, loai: string, duLieu: unknown): Promise<KetQuaThemThaoTac> {
  const bayGio = Date.now();
  try {
    await csdlCucBo.thaoTac.add({
      id,
      loai,
      duLieu,
      trangThai: 'CHO_GUI',
      thoiGianTao: bayGio,
      thoiGianCapNhat: bayGio,
    });
    return 'DA_THEM';
  } catch (loi) {
    if (loi instanceof Dexie.ConstraintError) {
      return 'DA_TON_TAI';
    }
    throw loi;
  }
}

function xacThucDanhSach(banGhi: unknown[]): ThaoTac[] {
  return banGhi.map((bg) => ThaoTacSchema.parse(bg));
}

/** Thao tác đang chờ gửi hoặc đã thử mà lỗi — chưa có gì xác nhận từ máy chủ. */
export async function layThaoTacChoGui(): Promise<ThaoTac[]> {
  const banGhi = await csdlCucBo.thaoTac.where('trangThai').anyOf(['CHO_GUI', 'LOI']).sortBy('thoiGianTao');
  return xacThucDanhSach(banGhi);
}

async function danhDauTrangThai(id: Ulid, trangThai: TrangThaiThaoTac, loiCuoi?: string): Promise<void> {
  const thayDoi: Partial<ThaoTac> =
    loiCuoi === undefined
      ? { trangThai, thoiGianCapNhat: Date.now() }
      : { trangThai, thoiGianCapNhat: Date.now(), loiCuoi };
  await csdlCucBo.thaoTac.update(id, thayDoi);
}

/** Hàm thật sự đưa một thao tác lên máy chủ. Ném lỗi nghĩa là gửi thất bại. */
export type HamGuiThaoTac = (thaoTac: ThaoTac) => Promise<void>;

/**
 * Xử lý hết hàng đợi hiện tại theo đúng thứ tự tạo (FIFO). Không bao giờ xoá
 * một thao tác chưa được xác nhận — thất bại chỉ chuyển sang `LOI`, thao tác
 * vẫn nằm trong hàng đợi để lần xử lý sau thử lại (SPEC.md §5.2/§5.5).
 */
export async function xuLyHangDoi(guiThaoTac: HamGuiThaoTac): Promise<void> {
  const dsChoGui = await layThaoTacChoGui();
  for (const thaoTac of dsChoGui) {
    await danhDauTrangThai(thaoTac.id as Ulid, 'DA_GUI');
    try {
      await guiThaoTac(thaoTac);
      await danhDauTrangThai(thaoTac.id as Ulid, 'DA_XAC_NHAN');
    } catch (loi) {
      await danhDauTrangThai(thaoTac.id as Ulid, 'LOI', loi instanceof Error ? loi.message : String(loi));
    }
  }
}

/**
 * Dọn một thao tác đã được máy chủ xác nhận — không bắt buộc phải gọi, chỉ để
 * hàng đợi không phình vô hạn. Từ chối xoá bất kỳ trạng thái nào khác: đây là
 * rào chắn thật cho luật "không bao giờ tự xoá thao tác chưa được xác nhận",
 * không phải quy ước đọc bằng mắt.
 */
export async function xoaThaoTacDaXacNhan(id: Ulid): Promise<void> {
  const banGhi = await csdlCucBo.thaoTac.get(id);
  if (!banGhi) {
    return;
  }
  const thaoTac = ThaoTacSchema.parse(banGhi);
  if (thaoTac.trangThai !== 'DA_XAC_NHAN') {
    throw new Error(
      `Không xoá thao tác ${id}: trạng thái đang là ${thaoTac.trangThai}, chỉ được xoá khi DA_XAC_NHAN`,
    );
  }
  await csdlCucBo.thaoTac.delete(id);
}

export interface TrangThaiHangDoi {
  soChoDongBo: number;
  dongBoGanNhat: number | null;
}

/** Hàm thuần: suy trạng thái hiển thị (SPEC.md §5.5) từ toàn bộ danh sách thao tác. */
export function tinhTrangThaiTuDanhSachThaoTac(danhSach: ThaoTac[]): TrangThaiHangDoi {
  const choDongBo = danhSach.filter((tt) => tt.trangThai === 'CHO_GUI' || tt.trangThai === 'LOI');
  const daXacNhan = danhSach.filter((tt) => tt.trangThai === 'DA_XAC_NHAN');
  const dongBoGanNhat = daXacNhan.reduce<number | null>((moc, tt) => {
    return moc === null || tt.thoiGianCapNhat > moc ? tt.thoiGianCapNhat : moc;
  }, null);
  return { soChoDongBo: choDongBo.length, dongBoGanNhat };
}

/** Đọc toàn bộ hàng đợi (mọi trạng thái) và suy ra trạng thái hiển thị hiện tại. */
export async function layTrangThaiHangDoi(): Promise<TrangThaiHangDoi> {
  const banGhi = await csdlCucBo.thaoTac.toArray();
  return tinhTrangThaiTuDanhSachThaoTac(xacThucDanhSach(banGhi));
}
