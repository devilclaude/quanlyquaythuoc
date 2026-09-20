import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, donViTinh, loHang, sanPham, theKho, tonKhoLo } from '../db/schema';
import {
  DoiDonViCoSoBiCamError,
  HangHoaKhongTonTaiError,
  MaHangDaTonTaiError,
  XoaCungBiChanError,
  dangKyHangHoaRoutes,
  layChiTietHangHoa,
  layDanhSachHangHoa,
  ngungHoatDongHangHoa,
  suaHangHoa,
  taoHangHoa,
  xoaHangHoa,
} from './hang-hoa';

type DbTest = ReturnType<typeof drizzle>;

let sqlite: Database.Database;
let db: DbTest;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  db.insert(chiNhanh).values({ id: 'cn-1', ten: 'Quầy chính' }).run();
});

afterEach(() => {
  sqlite.close();
});

function taoSanPham(id: string, maHang: string, ten: string, ngayTao: string) {
  db.insert(sanPham).values({ id, maHang, ten, ngayTao }).run();
}

function taoDonViCoSo(sanPhamId: string, giaBan: number) {
  db.insert(donViTinh)
    .values({ id: `dvt-${sanPhamId}`, sanPhamId, ten: 'viên', heSo: 1, laCoSo: true, giaBan })
    .run();
}

function nhapVaoLoNgamDinh(sanPhamId: string, soLuong: number) {
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  db.insert(theKho)
    .values({
      id: `tk-${sanPhamId}-${lo.id}`,
      chiNhanhId: 'cn-1',
      loId: lo.id,
      loai: 'NHAP',
      soLuong,
      thoiGian: '2026-09-01T00:00:00.000Z',
    })
    .run();
  db.insert(tonKhoLo).values({ loId: lo.id, chiNhanhId: 'cn-1', ton: soLuong }).run();
  return lo.id;
}

describe('layDanhSachHangHoa', () => {
  it('trả về mảng rỗng khi chưa có hàng hoá nào', () => {
    expect(layDanhSachHangHoa(db)).toEqual([]);
  });

  it('lấy đúng giá bán đơn vị cơ sở và tổng tồn cộng dồn nhiều lô', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);
    db.insert(loHang).values({ id: 'lo-them', sanPhamId: 'sp-1', soLo: 'L2', hsd: '2027-01-01' }).run();
    db.insert(tonKhoLo).values({ loId: 'lo-them', chiNhanhId: 'cn-1', ton: 100 }).run();

    const [item] = layDanhSachHangHoa(db);

    expect(item).toEqual({
      id: 'sp-1',
      maHang: 'SP001',
      ten: 'Paracetamol 500mg',
      giaBan: 500,
      giaVon: 0,
      tonKho: 1000,
      ngayTao: '2026-09-01T00:00:00.000Z',
      donViTinh: [{ id: 'dvt-sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 }],
    });
  });

  it('mang theo đầy đủ đơn vị tính từng sản phẩm — màn bán hàng (T-020) dựng gợi ý một dòng mỗi đơn vị từ đây, không gọi thêm API chi tiết', () => {
    taoSanPham('sp-1', 'SP001', 'Panadol Extra', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 17000);
    db.insert(donViTinh)
      .values({ id: 'dvt-hop', sanPhamId: 'sp-1', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 })
      .run();
    taoSanPham('sp-2', 'SP002', 'Vitamin C', '2026-09-02T00:00:00.000Z');
    taoDonViCoSo('sp-2', 1000);

    const ketQua = layDanhSachHangHoa(db);
    const panadol = ketQua.find((r) => r.maHang === 'SP001');
    const vitaminC = ketQua.find((r) => r.maHang === 'SP002');

    expect(panadol?.donViTinh).toEqual([
      { id: 'dvt-sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 17000 },
      { id: 'dvt-hop', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 },
    ]);
    expect(vitaminC?.donViTinh).toEqual([{ id: 'dvt-sp-2', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 1000 }]);
  });

  it('tìm theo mã hàng hoặc tên hàng', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoSanPham('sp-2', 'SP002', 'Vitamin C', '2026-09-02T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    taoDonViCoSo('sp-2', 1000);

    expect(layDanhSachHangHoa(db, 'SP001').map((r) => r.maHang)).toEqual(['SP001']);
    expect(layDanhSachHangHoa(db, 'vitamin').map((r) => r.maHang)).toEqual(['SP002']);
  });

  it('sắp xếp mới tạo trước, khớp screenshot "Danh sách hàng hóa"', () => {
    taoSanPham('sp-1', 'SP001', 'Hàng cũ', '2026-09-01T00:00:00.000Z');
    taoSanPham('sp-2', 'SP002', 'Hàng mới', '2026-09-05T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    taoDonViCoSo('sp-2', 1000);

    const ketQua = layDanhSachHangHoa(db);

    expect(ketQua.map((r) => r.maHang)).toEqual(['SP002', 'SP001']);
  });
});

describe('layChiTietHangHoa', () => {
  it('trả về undefined khi không tìm thấy sản phẩm', () => {
    expect(layChiTietHangHoa(db, 'khong-ton-tai')).toBeUndefined();
  });

  it('trả về đầy đủ đơn vị tính và tổng tồn của đúng sản phẩm, coTheXoaCung=false khi đã phát sinh thẻ kho (T-009c)', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    db.insert(donViTinh)
      .values([
        { id: 'dvt-vien', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 },
        { id: 'dvt-vi', sanPhamId: 'sp-1', ten: 'vỉ', heSo: 12, laCoSo: false, giaBan: 6000 },
      ])
      .run();
    nhapVaoLoNgamDinh('sp-1', 900);

    const chiTiet = layChiTietHangHoa(db, 'sp-1');

    expect(chiTiet).toEqual({
      id: 'sp-1',
      maHang: 'SP001',
      ten: 'Paracetamol 500mg',
      giaBan: 500,
      giaVon: 0,
      tonKho: 900,
      ngayTao: '2026-09-01T00:00:00.000Z',
      trangThai: 'HOAT_DONG',
      coTheXoaCung: false,
      donViTinh: [
        { id: 'dvt-vien', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 },
        { id: 'dvt-vi', ten: 'vỉ', heSo: 12, laCoSo: false, giaBan: 6000 },
      ],
    });
  });

  it('coTheXoaCung=true khi sản phẩm chưa phát sinh dòng thẻ kho nào (T-009c)', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);

    expect(layChiTietHangHoa(db, 'sp-1')?.coTheXoaCung).toBe(true);
  });
});

describe('taoHangHoa', () => {
  it('tạo hàng hoá chỉ một đơn vị cơ sở, mã hàng tự sinh khi bỏ trống', () => {
    const chiTiet = taoHangHoa(db, { ten: 'Paracetamol 500mg', donViCoSoTen: 'viên', giaBan: 500, donViKhac: [] });

    expect(chiTiet.ten).toBe('Paracetamol 500mg');
    expect(chiTiet.maHang).toMatch(/^HH\d{6}$/);
    expect(chiTiet.giaBan).toBe(500);
    expect(chiTiet.donViTinh).toEqual([
      expect.objectContaining({ ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 }),
    ]);
  });

  it('trigger lô ngầm định vẫn tự chạy cho sản phẩm mới tạo qua API', () => {
    const chiTiet = taoHangHoa(db, { ten: 'Vitamin C', donViCoSoTen: 'viên', giaBan: 1000, donViKhac: [] });

    const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, chiTiet.id)).all();
    expect(lo?.laLoMacDinh).toBe(true);
  });

  it('tạo nhiều đơn vị với hệ số và giá riêng từng đơn vị', () => {
    const chiTiet = taoHangHoa(db, {
      ten: 'Paracetamol 500mg',
      donViCoSoTen: 'viên',
      giaBan: 500,
      donViKhac: [
        { ten: 'vỉ', heSo: 12, giaBan: 6000 },
        { ten: 'hộp', heSo: 180, giaBan: 90000 },
      ],
    });

    expect(chiTiet.donViTinh).toEqual([
      expect.objectContaining({ ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 }),
      expect.objectContaining({ ten: 'vỉ', heSo: 12, laCoSo: false, giaBan: 6000 }),
      expect.objectContaining({ ten: 'hộp', heSo: 180, laCoSo: false, giaBan: 90000 }),
    ]);
  });

  it('mã hàng tự sinh hai lần liên tiếp không trùng nhau', () => {
    const a = taoHangHoa(db, { ten: 'Hàng A', donViCoSoTen: 'cái', giaBan: 100, donViKhac: [] });
    const b = taoHangHoa(db, { ten: 'Hàng B', donViCoSoTen: 'cái', giaBan: 100, donViKhac: [] });

    expect(a.maHang).not.toBe(b.maHang);
  });

  it('ném MaHangDaTonTaiError khi mã hàng truyền vào đã tồn tại', () => {
    taoSanPham('sp-1', 'SP001', 'Hàng cũ', '2026-09-01T00:00:00.000Z');

    expect(() =>
      taoHangHoa(db, { maHang: 'SP001', ten: 'Hàng mới', donViCoSoTen: 'cái', giaBan: 100, donViKhac: [] }),
    ).toThrow(MaHangDaTonTaiError);
  });
});

describe('suaHangHoa', () => {
  it('sửa tên, giá và đơn vị cơ sở khi CHƯA phát sinh thẻ kho', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);

    const chiTiet = suaHangHoa(db, 'sp-1', {
      ten: 'Paracetamol 500mg (mới)',
      donViCoSoTen: 'viên nén',
      giaBan: 600,
      donViKhac: [{ ten: 'vỉ', heSo: 12, giaBan: 7000 }],
    });

    expect(chiTiet.ten).toBe('Paracetamol 500mg (mới)');
    expect(chiTiet.donViTinh).toEqual([
      expect.objectContaining({ ten: 'viên nén', heSo: 1, laCoSo: true, giaBan: 600 }),
      expect.objectContaining({ ten: 'vỉ', heSo: 12, laCoSo: false, giaBan: 7000 }),
    ]);
  });

  it('cấm đổi tên đơn vị cơ sở khi đã phát sinh thẻ kho (SPEC.md §3.3)', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);

    expect(() =>
      suaHangHoa(db, 'sp-1', { ten: 'Paracetamol 500mg', donViCoSoTen: 'vỉ', giaBan: 500, donViKhac: [] }),
    ).toThrow(DoiDonViCoSoBiCamError);
  });

  it('vẫn sửa được giá đơn vị cơ sở dù đã phát sinh thẻ kho, miễn không đổi tên', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);

    const chiTiet = suaHangHoa(db, 'sp-1', {
      ten: 'Paracetamol 500mg',
      donViCoSoTen: 'viên',
      giaBan: 700,
      donViKhac: [],
    });

    expect(chiTiet.giaBan).toBe(700);
  });

  it('ném HangHoaKhongTonTaiError khi sản phẩm không tồn tại', () => {
    expect(() =>
      suaHangHoa(db, 'khong-ton-tai', { ten: 'X', donViCoSoTen: 'cái', giaBan: 100, donViKhac: [] }),
    ).toThrow(HangHoaKhongTonTaiError);
  });
});

describe('xoaHangHoa', () => {
  it('xoá cứng sản phẩm, đơn vị tính và lô ngầm định khi CHƯA phát sinh thẻ kho', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);

    xoaHangHoa(db, 'sp-1');

    expect(db.select().from(sanPham).where(eq(sanPham.id, 'sp-1')).all()).toEqual([]);
    expect(db.select().from(donViTinh).where(eq(donViTinh.sanPhamId, 'sp-1')).all()).toEqual([]);
    expect(db.select().from(loHang).where(eq(loHang.sanPhamId, 'sp-1')).all()).toEqual([]);
  });

  it('ném XoaCungBiChanError và không xoá gì khi đã phát sinh thẻ kho (SPEC.md §3.5)', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);

    expect(() => xoaHangHoa(db, 'sp-1')).toThrow(XoaCungBiChanError);
    expect(db.select().from(sanPham).where(eq(sanPham.id, 'sp-1')).all()).toHaveLength(1);
  });

  it('ném HangHoaKhongTonTaiError khi sản phẩm không tồn tại', () => {
    expect(() => xoaHangHoa(db, 'khong-ton-tai')).toThrow(HangHoaKhongTonTaiError);
  });
});

describe('ngungHoatDongHangHoa', () => {
  it('chuyển trạng thái sản phẩm sang NGUNG_HOAT_DONG', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);

    const chiTiet = ngungHoatDongHangHoa(db, 'sp-1');

    expect(chiTiet.trangThai).toBe('NGUNG_HOAT_DONG');
  });

  it('ném HangHoaKhongTonTaiError khi sản phẩm không tồn tại', () => {
    expect(() => ngungHoatDongHangHoa(db, 'khong-ton-tai')).toThrow(HangHoaKhongTonTaiError);
  });
});

describe('dangKyHangHoaRoutes', () => {
  function taoRouter() {
    const app = new Hono();
    dangKyHangHoaRoutes(app, db);
    return app;
  }

  it('GET / trả về danh sách bọc trong { duLieu }, GET /:id trả về chi tiết khi tồn tại', async () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    const router = taoRouter();

    const resDanhSach = await router.request('/');
    expect(resDanhSach.status).toBe(200);
    expect(((await resDanhSach.json()) as { duLieu: unknown[] }).duLieu).toHaveLength(1);

    const resChiTiet = await router.request('/sp-1');
    expect(resChiTiet.status).toBe(200);
    expect(((await resChiTiet.json()) as { maHang: string }).maHang).toBe('SP001');
  });

  it('GET /:id trả về 404 khi không tìm thấy', async () => {
    const res = await taoRouter().request('/khong-ton-tai');

    expect(res.status).toBe(404);
  });

  function guiTao(body: unknown) {
    return taoRouter().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('POST / tạo hàng hoá mới, trả về 201 kèm chi tiết', async () => {
    const res = await guiTao({ ten: 'Paracetamol 500mg', donViCoSoTen: 'viên', giaBan: 500, donViKhac: [] });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { ten: string; donViTinh: unknown[] };
    expect(json.ten).toBe('Paracetamol 500mg');
    expect(json.donViTinh).toHaveLength(1);
  });

  it('POST / từ chối khi tên hàng bắt buộc bị bỏ trống', async () => {
    const res = await guiTao({ ten: '', donViCoSoTen: 'viên', giaBan: 500, donViKhac: [] });

    expect(res.status).toBe(400);
  });

  it('POST / từ chối khi hệ số đơn vị khác nhỏ hơn 1', async () => {
    const res = await guiTao({
      ten: 'Paracetamol 500mg',
      donViCoSoTen: 'viên',
      giaBan: 500,
      donViKhac: [{ ten: 'vỉ', heSo: 0, giaBan: 6000 }],
    });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 409 khi mã hàng nhập tay đã tồn tại', async () => {
    taoSanPham('sp-1', 'SP001', 'Hàng cũ', '2026-09-01T00:00:00.000Z');

    const res = await guiTao({ maHang: 'SP001', ten: 'Hàng mới', donViCoSoTen: 'cái', giaBan: 100, donViKhac: [] });

    expect(res.status).toBe(409);
  });

  function guiSua(id: string, body: unknown) {
    return taoRouter().request(`/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('PUT /:id sửa thành công, trả về 200 kèm chi tiết mới', async () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);

    const res = await guiSua('sp-1', { ten: 'Tên mới', donViCoSoTen: 'viên', giaBan: 600, donViKhac: [] });

    expect(res.status).toBe(200);
    expect(((await res.json()) as { ten: string }).ten).toBe('Tên mới');
  });

  it('PUT /:id trả về 400 khi dữ liệu không hợp lệ', async () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);

    const res = await guiSua('sp-1', { ten: '', donViCoSoTen: 'viên', giaBan: 500, donViKhac: [] });

    expect(res.status).toBe(400);
  });

  it('PUT /:id trả về 404 khi sản phẩm không tồn tại', async () => {
    const res = await guiSua('khong-ton-tai', { ten: 'X', donViCoSoTen: 'cái', giaBan: 100, donViKhac: [] });

    expect(res.status).toBe(404);
  });

  it('PUT /:id trả về 409 khi đổi đơn vị cơ sở lúc đã phát sinh thẻ kho', async () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);

    const res = await guiSua('sp-1', { ten: 'Paracetamol 500mg', donViCoSoTen: 'vỉ', giaBan: 500, donViKhac: [] });

    expect(res.status).toBe(409);
  });

  it('DELETE /:id xoá cứng thành công, trả về 204', async () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);

    const res = await taoRouter().request('/sp-1', { method: 'DELETE' });

    expect(res.status).toBe(204);
  });

  it('DELETE /:id trả về 409 khi đã phát sinh thẻ kho', async () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);

    const res = await taoRouter().request('/sp-1', { method: 'DELETE' });

    expect(res.status).toBe(409);
  });

  it('DELETE /:id trả về 404 khi sản phẩm không tồn tại', async () => {
    const res = await taoRouter().request('/khong-ton-tai', { method: 'DELETE' });

    expect(res.status).toBe(404);
  });

  it('POST /:id/ngung-hoat-dong chuyển trạng thái, trả về 200', async () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg', '2026-09-01T00:00:00.000Z');
    taoDonViCoSo('sp-1', 500);
    nhapVaoLoNgamDinh('sp-1', 900);

    const res = await taoRouter().request('/sp-1/ngung-hoat-dong', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(((await res.json()) as { trangThai: string }).trangThai).toBe('NGUNG_HOAT_DONG');
  });

  it('POST /:id/ngung-hoat-dong trả về 404 khi sản phẩm không tồn tại', async () => {
    const res = await taoRouter().request('/khong-ton-tai/ngung-hoat-dong', { method: 'POST' });

    expect(res.status).toBe(404);
  });
});
