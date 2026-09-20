import { and, eq, isNull } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { giaiNghiaCaiDatQuanLyLo, type GhiDeQuanLyLo } from '../../shared/cai-dat/giai-nghia';
import { taoUlid } from '../../shared/kieu/ulid';
import { caiDat, loHang, sanPham, tonKhoLo } from '../db/schema';
import { ghiMotDongTheKho, type TxTheKho } from '../kho/so-cai';

type Db = ReturnType<typeof drizzle>;

// Đây KHÔNG phải module kho (ARCHITECTURE.md §5 chỉ cấm `src/server/kho/**`
// import hàm giải nghĩa) — module này chính là nơi quản lý cài đặt, nên gọi
// `giaiNghiaCaiDatQuanLyLo` ở đây là hợp lệ, tránh chép lại cùng một logic ưu
// tiên "ghi đè sản phẩm > toàn cục" ở hai chỗ.
export class DoiCheDoBiChanError extends Error {
  constructor(
    public readonly sanPhamId: string,
    public readonly soLoConTon: number,
  ) {
    super(
      `Không thể tắt quản lý theo lô cho sản phẩm ${sanPhamId}: còn ${soLoConTon} lô có tồn > 0 — kiểm kê gộp trước khi tắt (SPEC.md §4.3)`,
    );
    this.name = 'DoiCheDoBiChanError';
  }
}

function demSoLoConTon(tx: TxTheKho, sanPhamId: string): number {
  const cacLo = tx.select({ id: loHang.id }).from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  let dem = 0;
  for (const { id: loId } of cacLo) {
    const dongTon = tx.select({ ton: tonKhoLo.ton }).from(tonKhoLo).where(eq(tonKhoLo.loId, loId)).all();
    const tong = dongTon.reduce((tong, d) => tong + d.ton, 0);
    if (tong > 0) dem++;
  }
  return dem;
}

function kiemTraChanTat(tx: TxTheKho, sanPhamId: string): void {
  const soLo = demSoLoConTon(tx, sanPhamId);
  // "Bật → tắt: chỉ cho phép khi sản phẩm có ≤ 1 lô còn tồn > 0" (SPEC.md §4.3).
  if (soLo > 1) throw new DoiCheDoBiChanError(sanPhamId, soLo);
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

// "Cả hai chiều ghi một dòng thẻ kho loại DOI_CHE_DO với so_luong = 0" (SPEC.md
// §4.3) — gắn vào lô ngầm định của sản phẩm vì đây là sự kiện của SẢN PHẨM,
// không phải của một lô cụ thể, và lô ngầm định luôn tồn tại (trigger T-004b).
function ghiDoiCheDo(tx: TxTheKho, sanPhamId: string, chiNhanhId: string, thoiGian: string): void {
  ghiMotDongTheKho(tx, {
    id: taoUlid(),
    chiNhanhId,
    loId: timLoNgamDinh(tx, sanPhamId),
    loai: 'DOI_CHE_DO',
    soLuong: 0,
    thoiGian,
  });
}

function docToanCuc(tx: TxTheKho): boolean {
  const [row] = tx.select({ quanLyLo: caiDat.quanLyLo }).from(caiDat).all();
  return row?.quanLyLo ?? false;
}

export interface DoiGhiDeSanPhamInput {
  sanPhamId: string;
  ghiDeMoi: GhiDeQuanLyLo;
  chiNhanhId: string;
  /** Giờ thiết bị lúc đổi cài đặt (ISO). */
  thoiGian: string;
}

// Đổi ghi đè quản lý lô riêng cho một sản phẩm (T-010a, SPEC.md §3.2/§4.3).
// Không API, không UI — nối vào màn hàng hoá/cài đặt thuộc T-010b/T-010c.
export function doiGhiDeSanPham(db: Db, input: DoiGhiDeSanPhamInput): void {
  db.transaction((tx) => {
    const [spRow] = tx.select().from(sanPham).where(eq(sanPham.id, input.sanPhamId)).all();
    if (!spRow) throw new Error(`Không tìm thấy sản phẩm ${input.sanPhamId}`);

    const toanCuc = docToanCuc(tx);
    const ghiDeHienTai: GhiDeQuanLyLo = spRow.quanLyLoGhiDe ?? 'KE_THUA';
    const hieuLucTruoc = giaiNghiaCaiDatQuanLyLo(toanCuc, ghiDeHienTai);
    const hieuLucSau = giaiNghiaCaiDatQuanLyLo(toanCuc, input.ghiDeMoi);

    if (hieuLucTruoc && !hieuLucSau) kiemTraChanTat(tx, input.sanPhamId);

    tx.update(sanPham)
      .set({ quanLyLoGhiDe: input.ghiDeMoi === 'KE_THUA' ? null : input.ghiDeMoi })
      .where(eq(sanPham.id, input.sanPhamId))
      .run();

    if (hieuLucTruoc !== hieuLucSau) ghiDoiCheDo(tx, input.sanPhamId, input.chiNhanhId, input.thoiGian);
  });
}

export interface DoiCaiDatToanCucInput {
  bat: boolean;
  chiNhanhId: string;
  /** Giờ thiết bị lúc đổi cài đặt (ISO). */
  thoiGian: string;
}

// Đổi cài đặt toàn cục (T-010a, SPEC.md §3.2/§4.3). Chỉ sản phẩm đang KẾ THỪA
// (không ghi đè riêng) bị ảnh hưởng — sản phẩm có ghi đè BAT/TAT giữ nguyên
// hiệu lực của nó bất kể toàn cục đổi thế nào. Kiểm tra chặn cho TOÀN BỘ sản
// phẩm bị ảnh hưởng trước khi ghi bất cứ gì — một sản phẩm vi phạm thì rollback
// cả thao tác, không đổi toàn cục nửa chừng.
export function doiCaiDatToanCuc(db: Db, input: DoiCaiDatToanCucInput): void {
  db.transaction((tx) => {
    const toanCucCu = docToanCuc(tx);
    if (toanCucCu === input.bat) return;

    const cacSanPhamKeThua = tx.select({ id: sanPham.id }).from(sanPham).where(isNull(sanPham.quanLyLoGhiDe)).all();

    if (!input.bat) {
      for (const { id } of cacSanPhamKeThua) kiemTraChanTat(tx, id);
    }

    tx.update(caiDat).set({ quanLyLo: input.bat }).where(eq(caiDat.id, 1)).run();

    for (const { id } of cacSanPhamKeThua) ghiDoiCheDo(tx, id, input.chiNhanhId, input.thoiGian);
  });
}
