import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import {
  DanhSachHangHoaResSchema,
  HangHoaChiTietResSchema,
  type HangHoaDanhSachItem,
} from '../../shared/hop-dong/hang-hoa';
import { donViTinh, loHang, sanPham, tonKhoLo } from '../db/schema';

type Db = ReturnType<typeof drizzle>;

// Tổng tồn (đơn vị cơ sở) theo từng sản phẩm, cộng dồn mọi lô/chi nhánh — dùng
// chung cho cả danh sách và chi tiết để chỉ có một cách tính (không lặp SQL).
function tinhTonKhoTheoSanPham(db: Db): Map<string, number> {
  const rows = db
    .select({
      sanPhamId: loHang.sanPhamId,
      tonTong: sql<number>`coalesce(sum(${tonKhoLo.ton}), 0)`,
    })
    .from(loHang)
    .leftJoin(tonKhoLo, eq(tonKhoLo.loId, loHang.id))
    .groupBy(loHang.sanPhamId)
    .all();

  return new Map(rows.map((r) => [r.sanPhamId, Number(r.tonTong)]));
}

/**
 * Danh sách hàng hoá, khớp cột trong screenshot "Danh sách hàng hóa" nằm
 * trong phạm vi v1 (T-009a): Mã hàng, Tên hàng, Giá bán, Giá vốn, Tồn kho,
 * Thời gian tạo. `giaVon` tạm luôn 0 — T-007 (giá vốn bình quân gia quyền)
 * chưa merge vào nhánh này.
 */
export function layDanhSachHangHoa(db: Db, tim?: string): HangHoaDanhSachItem[] {
  const tuKhoa = tim?.trim();
  const dieuKienTim = tuKhoa
    ? or(like(sanPham.maHang, `%${tuKhoa}%`), like(sanPham.ten, `%${tuKhoa}%`))
    : undefined;

  const hang = db
    .select({
      id: sanPham.id,
      maHang: sanPham.maHang,
      ten: sanPham.ten,
      ngayTao: sanPham.ngayTao,
      giaBan: donViTinh.giaBan,
    })
    .from(sanPham)
    .leftJoin(donViTinh, and(eq(donViTinh.sanPhamId, sanPham.id), eq(donViTinh.laCoSo, true)))
    .where(dieuKienTim)
    .orderBy(desc(sanPham.ngayTao))
    .all();

  const tonTheoSanPham = tinhTonKhoTheoSanPham(db);

  return hang.map((h) => ({
    id: h.id,
    maHang: h.maHang,
    ten: h.ten,
    ngayTao: h.ngayTao,
    giaBan: h.giaBan ?? 0,
    giaVon: 0,
    tonKho: tonTheoSanPham.get(h.id) ?? 0,
  }));
}

export interface HangHoaChiTiet extends HangHoaDanhSachItem {
  donViTinh: { id: string; ten: string; heSo: number; laCoSo: boolean; giaBan: number }[];
}

/** Chi tiết một sản phẩm, tối thiểu tab "Thông tin" (T-009a). */
export function layChiTietHangHoa(db: Db, id: string): HangHoaChiTiet | undefined {
  const [sp] = db.select().from(sanPham).where(eq(sanPham.id, id)).all();
  if (!sp) return undefined;

  const cacDonVi = db.select().from(donViTinh).where(eq(donViTinh.sanPhamId, id)).all();
  const donViCoSo = cacDonVi.find((d) => d.laCoSo);
  const tonKho = tinhTonKhoTheoSanPham(db).get(id) ?? 0;

  return {
    id: sp.id,
    maHang: sp.maHang,
    ten: sp.ten,
    ngayTao: sp.ngayTao,
    giaBan: donViCoSo?.giaBan ?? 0,
    giaVon: 0,
    tonKho,
    donViTinh: cacDonVi.map((d) => ({
      id: d.id,
      ten: d.ten,
      heSo: d.heSo,
      laCoSo: d.laCoSo,
      giaBan: d.giaBan,
    })),
  };
}

export function dangKyHangHoaRoutes(app: Hono, db: Db): void {
  app.get('/', (c) => {
    const tim = c.req.query('tim');
    const res = DanhSachHangHoaResSchema.parse({ duLieu: layDanhSachHangHoa(db, tim) });
    return c.json(res);
  });

  app.get('/:id', (c) => {
    const chiTiet = layChiTietHangHoa(db, c.req.param('id'));
    if (!chiTiet) return c.json({ loi: 'Không tìm thấy hàng hoá' }, 404);
    return c.json(HangHoaChiTietResSchema.parse(chiTiet));
  });
}
