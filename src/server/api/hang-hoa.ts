import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import {
  DanhSachHangHoaResSchema,
  HangHoaChiTietResSchema,
  TaoHangHoaReqSchema,
  type HangHoaDanhSachItem,
  type TaoHangHoaReq,
} from '../../shared/hop-dong/hang-hoa';
import { taoUlid } from '../../shared/kieu/ulid';
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

  // Cơ sở trước, còn lại theo hệ số tăng dần — id là ULID nên không sắp theo
  // thứ tự tạo nếu không ORDER BY tường minh (T-009b: nhiều đơn vị tạo trong
  // cùng một request, ULID ngẫu nhiên không đảm bảo thứ tự chuỗi).
  const cacDonVi = db
    .select()
    .from(donViTinh)
    .where(eq(donViTinh.sanPhamId, id))
    .orderBy(desc(donViTinh.laCoSo), asc(donViTinh.heSo))
    .all();
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

export class MaHangDaTonTaiError extends Error {
  constructor(public readonly maHang: string) {
    super(`Mã hàng đã tồn tại: ${maHang}`);
  }
}

function laLoiTrungMaHang(loi: unknown): boolean {
  return loi instanceof Error && /UNIQUE constraint failed: san_pham\.ma_hang/.test(loi.message);
}

/** "HH" + số thứ tự 6 chữ số, tính trên tổng số hàng hoá hiện có + số lần đã thử lại. */
function sinhMaHangTuDong(db: Db, soLanDaThu: number): string {
  const [hang] = db.select({ dem: sql<number>`count(*)` }).from(sanPham).all();
  return `HH${String(Number(hang?.dem ?? 0) + 1 + soLanDaThu).padStart(6, '0')}`;
}

/**
 * Tạo hàng hoá mới kèm đơn vị tính (T-009b). Trigger CSDL (T-004b) tự cấp lô
 * ngầm định ngay khi `san_pham` được insert — không cần code thêm ở đây.
 * Mã hàng bỏ trống thì tự sinh; đụng UNIQUE do đua thì thử mã kế tiếp, còn mã
 * người dùng tự nhập đã tồn tại thì báo lỗi rõ (`MaHangDaTonTaiError`) thay vì
 * âm thầm đổi mã họ gõ.
 */
export function taoHangHoa(db: Db, req: TaoHangHoaReq): HangHoaChiTiet {
  const soLanThuToiDa = req.maHang ? 1 : 5;

  for (let lanThu = 0; lanThu < soLanThuToiDa; lanThu++) {
    const maHang = req.maHang ?? sinhMaHangTuDong(db, lanThu);
    const sanPhamId = taoUlid();

    try {
      db.transaction((tx) => {
        tx.insert(sanPham).values({ id: sanPhamId, maHang, ten: req.ten }).run();
        tx.insert(donViTinh)
          .values([
            {
              id: taoUlid(),
              sanPhamId,
              ten: req.donViCoSoTen,
              heSo: 1,
              laCoSo: true,
              giaBan: req.giaBan,
            },
            ...req.donViKhac.map((d) => ({
              id: taoUlid(),
              sanPhamId,
              ten: d.ten,
              heSo: d.heSo,
              laCoSo: false,
              giaBan: d.giaBan,
            })),
          ])
          .run();
      });

      const chiTiet = layChiTietHangHoa(db, sanPhamId);
      if (!chiTiet) throw new Error('không đọc lại được hàng hoá vừa tạo');
      return chiTiet;
    } catch (loi) {
      if (!laLoiTrungMaHang(loi)) throw loi;
      if (req.maHang) throw new MaHangDaTonTaiError(maHang);
      // Mã tự sinh đụng UNIQUE do đua giữa hai lần tạo gần nhau — thử mã kế tiếp.
    }
  }

  throw new Error('không sinh được mã hàng tự động sau nhiều lần thử');
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

  app.post('/', async (c) => {
    const than = TaoHangHoaReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    try {
      const chiTiet = taoHangHoa(db, than.data);
      return c.json(HangHoaChiTietResSchema.parse(chiTiet), 201);
    } catch (loi) {
      if (loi instanceof MaHangDaTonTaiError) {
        return c.json({ loi: loi.message }, 409);
      }
      throw loi;
    }
  });
}
