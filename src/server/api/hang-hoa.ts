import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import {
  DanhSachHangHoaResSchema,
  HangHoaChiTietResSchema,
  SuaHangHoaReqSchema,
  TaoHangHoaReqSchema,
  type DonViTinhRes,
  type HangHoaDanhSachItem,
  type SuaHangHoaReq,
  type TaoHangHoaReq,
} from '../../shared/hop-dong/hang-hoa';
import { taoUlid } from '../../shared/kieu/ulid';
import { donViTinh, loHang, sanPham, theKho, tonKhoLo } from '../db/schema';

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
 * Mọi đơn vị tính của một nhóm sản phẩm, đơn vị cơ sở trước rồi tăng dần hệ
 * số — cùng thứ tự với `layChiTietHangHoa`. Dùng chung cho danh sách (T-020
 * cần giá/hệ số từng đơn vị để dựng gợi ý bán hàng) và không lặp truy vấn
 * cho từng sản phẩm (N+1).
 */
function donViTinhTheoSanPham(db: Db, sanPhamIds: string[]): Map<string, DonViTinhRes[]> {
  if (sanPhamIds.length === 0) return new Map();

  const rows = db
    .select({
      sanPhamId: donViTinh.sanPhamId,
      id: donViTinh.id,
      ten: donViTinh.ten,
      heSo: donViTinh.heSo,
      laCoSo: donViTinh.laCoSo,
      giaBan: donViTinh.giaBan,
    })
    .from(donViTinh)
    .where(inArray(donViTinh.sanPhamId, sanPhamIds))
    .orderBy(desc(donViTinh.laCoSo), asc(donViTinh.heSo))
    .all();

  const ketQua = new Map<string, DonViTinhRes[]>();
  for (const r of rows) {
    const danhSach = ketQua.get(r.sanPhamId) ?? [];
    danhSach.push({ id: r.id, ten: r.ten, heSo: r.heSo, laCoSo: r.laCoSo, giaBan: r.giaBan });
    ketQua.set(r.sanPhamId, danhSach);
  }
  return ketQua;
}

/**
 * Danh sách hàng hoá, khớp cột trong screenshot "Danh sách hàng hóa" nằm
 * trong phạm vi v1 (T-009a): Mã hàng, Tên hàng, Giá bán, Giá vốn, Tồn kho,
 * Thời gian tạo. `giaVon` tạm luôn 0 — T-007 (giá vốn bình quân gia quyền)
 * chưa merge vào nhánh này. `donViTinh` mang đầy đủ đơn vị tính (không chỉ
 * cơ sở) — T-020 dựng gợi ý tìm hàng ở màn bán hàng trực tiếp từ đây.
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
  const donViTheoSanPham = donViTinhTheoSanPham(
    db,
    hang.map((h) => h.id),
  );

  return hang.map((h) => ({
    id: h.id,
    maHang: h.maHang,
    ten: h.ten,
    ngayTao: h.ngayTao,
    giaBan: h.giaBan ?? 0,
    giaVon: 0,
    tonKho: tonTheoSanPham.get(h.id) ?? 0,
    donViTinh: donViTheoSanPham.get(h.id) ?? [],
  }));
}

export interface HangHoaChiTiet extends HangHoaDanhSachItem {
  trangThai: 'HOAT_DONG' | 'NGUNG_HOAT_DONG';
  /** true khi CHƯA phát sinh dòng thẻ kho nào — quyết định Xoá hay Ngừng hoạt động (T-009c). */
  coTheXoaCung: boolean;
  donViTinh: { id: string; ten: string; heSo: number; laCoSo: boolean; giaBan: number }[];
}

/**
 * Sản phẩm đã "phát sinh dòng thẻ kho" khi có ít nhất một dòng `the_kho` ghi
 * qua một trong các lô của nó (T-009c) — đây là ranh giới xoá cứng vs "Ngừng
 * hoạt động" theo SPEC.md §3.5, và cũng là ranh giới cấm đổi đơn vị cơ sở theo
 * SPEC.md §3.3 (đổi cơ sở nghĩa là viết lại lịch sử đã ghi).
 */
function daPhatSinhTheKho(db: Db, sanPhamId: string): boolean {
  const rows = db
    .select({ id: theKho.id })
    .from(theKho)
    .innerJoin(loHang, eq(loHang.id, theKho.loId))
    .where(eq(loHang.sanPhamId, sanPhamId))
    .limit(1)
    .all();
  return rows.length > 0;
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
    trangThai: sp.trangThai,
    coTheXoaCung: !daPhatSinhTheKho(db, id),
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

export class HangHoaKhongTonTaiError extends Error {
  constructor(public readonly id: string) {
    super(`Không tìm thấy hàng hoá: ${id}`);
  }
}

export class DoiDonViCoSoBiCamError extends Error {
  constructor() {
    super('Không thể đổi đơn vị cơ sở khi hàng hoá đã phát sinh thẻ kho (SPEC.md §3.3)');
  }
}

export class XoaCungBiChanError extends Error {
  constructor() {
    super('Hàng hoá đã phát sinh thẻ kho, không thể xoá cứng — dùng "Ngừng hoạt động" thay thế');
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

/**
 * Sửa tên/giá/đơn vị (T-009c). Mã hàng không đổi được trong task này. Đơn vị
 * khác dùng ngữ nghĩa THAY TOÀN BỘ (xoá hết rồi chèn lại) — an toàn vì
 * `don_vi_tinh` không phải sổ cái, thẻ kho ghi theo lô chứ không theo đơn vị
 * tính. Đơn vị cơ sở chỉ UPDATE tại chỗ để giữ nguyên id của nó.
 */
export function suaHangHoa(db: Db, id: string, req: SuaHangHoaReq): HangHoaChiTiet {
  const [sp] = db.select({ id: sanPham.id }).from(sanPham).where(eq(sanPham.id, id)).all();
  if (!sp) throw new HangHoaKhongTonTaiError(id);

  const [donViCoSoHienTai] = db
    .select()
    .from(donViTinh)
    .where(and(eq(donViTinh.sanPhamId, id), eq(donViTinh.laCoSo, true)))
    .all();
  if (!donViCoSoHienTai) throw new Error(`sản phẩm ${id} thiếu đơn vị cơ sở — bất biến bị vi phạm`);

  if (donViCoSoHienTai.ten !== req.donViCoSoTen && daPhatSinhTheKho(db, id)) {
    throw new DoiDonViCoSoBiCamError();
  }

  db.transaction((tx) => {
    tx.update(sanPham).set({ ten: req.ten }).where(eq(sanPham.id, id)).run();
    tx.update(donViTinh)
      .set({ ten: req.donViCoSoTen, giaBan: req.giaBan })
      .where(eq(donViTinh.id, donViCoSoHienTai.id))
      .run();
    tx.delete(donViTinh).where(and(eq(donViTinh.sanPhamId, id), eq(donViTinh.laCoSo, false))).run();
    if (req.donViKhac.length > 0) {
      tx.insert(donViTinh)
        .values(
          req.donViKhac.map((d) => ({
            id: taoUlid(),
            sanPhamId: id,
            ten: d.ten,
            heSo: d.heSo,
            laCoSo: false,
            giaBan: d.giaBan,
          })),
        )
        .run();
    }
  });

  const chiTiet = layChiTietHangHoa(db, id);
  if (!chiTiet) throw new Error('không đọc lại được hàng hoá vừa sửa');
  return chiTiet;
}

/**
 * Xoá cứng chỉ khi CHƯA phát sinh thẻ kho (SPEC.md §3.5) — xoá cả đơn vị tính
 * và lô (chỉ có thể là lô ngầm định, vì có lô thật thì đã phải qua nhập hàng,
 * tức đã có thẻ kho). Đã phát sinh thẻ kho thì từ chối, không xoá gì; client
 * gọi `ngungHoatDongHangHoa` thay thế.
 */
export function xoaHangHoa(db: Db, id: string): void {
  const [sp] = db.select({ id: sanPham.id }).from(sanPham).where(eq(sanPham.id, id)).all();
  if (!sp) throw new HangHoaKhongTonTaiError(id);
  if (daPhatSinhTheKho(db, id)) throw new XoaCungBiChanError();

  db.transaction((tx) => {
    tx.delete(donViTinh).where(eq(donViTinh.sanPhamId, id)).run();
    tx.delete(loHang).where(eq(loHang.sanPhamId, id)).run();
    tx.delete(sanPham).where(eq(sanPham.id, id)).run();
  });
}

/** Thay thế cho xoá cứng khi sản phẩm đã phát sinh thẻ kho (SPEC.md §3.5). */
export function ngungHoatDongHangHoa(db: Db, id: string): HangHoaChiTiet {
  const [sp] = db.select({ id: sanPham.id }).from(sanPham).where(eq(sanPham.id, id)).all();
  if (!sp) throw new HangHoaKhongTonTaiError(id);

  db.update(sanPham).set({ trangThai: 'NGUNG_HOAT_DONG' }).where(eq(sanPham.id, id)).run();

  const chiTiet = layChiTietHangHoa(db, id);
  if (!chiTiet) throw new Error('không đọc lại được hàng hoá vừa ngừng hoạt động');
  return chiTiet;
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

  app.put('/:id', async (c) => {
    const than = SuaHangHoaReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    try {
      const chiTiet = suaHangHoa(db, c.req.param('id'), than.data);
      return c.json(HangHoaChiTietResSchema.parse(chiTiet));
    } catch (loi) {
      if (loi instanceof HangHoaKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof DoiDonViCoSoBiCamError) return c.json({ loi: loi.message }, 409);
      throw loi;
    }
  });

  app.delete('/:id', (c) => {
    try {
      xoaHangHoa(db, c.req.param('id'));
      return c.body(null, 204);
    } catch (loi) {
      if (loi instanceof HangHoaKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof XoaCungBiChanError) return c.json({ loi: loi.message }, 409);
      throw loi;
    }
  });

  app.post('/:id/ngung-hoat-dong', (c) => {
    try {
      const chiTiet = ngungHoatDongHangHoa(db, c.req.param('id'));
      return c.json(HangHoaChiTietResSchema.parse(chiTiet));
    } catch (loi) {
      if (loi instanceof HangHoaKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      throw loi;
    }
  });
}
