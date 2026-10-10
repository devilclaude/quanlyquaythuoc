import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { taoApp } from '../app';
import { taoNguoiDung } from '../auth/nguoi-dung';
import { DanhSachHangHoaResSchema } from '../../shared/hop-dong/hang-hoa';
import { donViTinh, sanPham } from '../db/schema';

type DbTest = ReturnType<typeof drizzle>;

let sqlite: Database.Database;
let db: DbTest;
let app: ReturnType<typeof taoApp>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  app = taoApp(db);
});

afterEach(() => {
  sqlite.close();
});

async function dangNhap(ten: string, matKhau = 'mat-khau-dai-du'): Promise<string> {
  const res = await app.request('/api/auth/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenDangNhap: ten, matKhau }),
  });
  return (res.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
}

function goi(cookie: string, duongDan: string, phuongThuc = 'GET', body?: unknown) {
  return app.request(duongDan, {
    method: phuongThuc,
    headers: { Cookie: cookie, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function taoAdminVaNhanVien() {
  const admin = taoNguoiDung(db, { tenDangNhap: 'admin', tenHienThi: 'Chủ quầy', matKhau: 'mat-khau-dai-du', vaiTro: 'ADMIN' });
  const lan = taoNguoiDung(db, { tenDangNhap: 'lan', tenHienThi: 'Chị Lan', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' });
  return { admin, lan };
}

describe('quyền truy cập /api/nguoi-dung', () => {
  it('chưa đăng nhập: 401', async () => {
    expect((await app.request('/api/nguoi-dung')).status).toBe(401);
  });

  it('nhân viên: 403 ở mọi thao tác', async () => {
    const { admin } = taoAdminVaNhanVien();
    const cookie = await dangNhap('lan');

    expect((await goi(cookie, '/api/nguoi-dung')).status).toBe(403);
    expect(
      (await goi(cookie, '/api/nguoi-dung', 'POST', { tenDangNhap: 'x', tenHienThi: 'x', matKhau: 'mat-khau-dai-du', vaiTro: 'ADMIN' })).status,
    ).toBe(403);
    expect((await goi(cookie, `/api/nguoi-dung/${admin.id}`, 'PUT', { hoatDong: false })).status).toBe(403);
    expect((await goi(cookie, `/api/nguoi-dung/${admin.id}/dat-lai-mat-khau`, 'POST', { matKhau: 'mat-khau-moi-12345' })).status).toBe(403);
  });
});

describe('GET /api/nguoi-dung', () => {
  it('admin xem danh sách, không có mật khẩu băm', async () => {
    taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const res = await goi(cookie, '/api/nguoi-dung');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { duLieu: { tenDangNhap: string }[] };
    expect(body.duLieu.map((n) => n.tenDangNhap)).toEqual(['admin', 'lan']);
    expect(JSON.stringify(body)).not.toMatch(/scrypt|matKhau/);
  });
});

describe('POST /api/nguoi-dung', () => {
  it('admin tạo nhân viên: 201, và nhân viên đăng nhập được bằng tài khoản mới', async () => {
    taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const res = await goi(cookie, '/api/nguoi-dung', 'POST', {
      tenDangNhap: 'Minh',
      tenHienThi: 'Anh Minh',
      matKhau: 'mat-khau-cua-minh',
      vaiTro: 'NHAN_VIEN',
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ tenDangNhap: 'minh', tenHienThi: 'Anh Minh', vaiTro: 'NHAN_VIEN', hoatDong: true });
    expect(await dangNhap('minh', 'mat-khau-cua-minh')).toMatch(/^phien=/);
  });

  it('tên trùng (kể cả khác hoa/thường): 409', async () => {
    taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const res = await goi(cookie, '/api/nguoi-dung', 'POST', { tenDangNhap: 'LAN', tenHienThi: 'x', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' });

    expect(res.status).toBe(409);
  });

  it('mật khẩu ngắn: 400; thiếu trường: 400; tên có khoảng trắng giữa: 400', async () => {
    taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const ngan = await goi(cookie, '/api/nguoi-dung', 'POST', { tenDangNhap: 'a', tenHienThi: 'a', matKhau: 'ngan', vaiTro: 'NHAN_VIEN' });
    const thieu = await goi(cookie, '/api/nguoi-dung', 'POST', { tenDangNhap: 'a' });
    const khoangTrang = await goi(cookie, '/api/nguoi-dung', 'POST', { tenDangNhap: 'chi lan', tenHienThi: 'a', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' });

    expect(ngan.status).toBe(400);
    expect(thieu.status).toBe(400);
    expect(khoangTrang.status).toBe(400);
  });

  it('vai trò lạ: 400', async () => {
    taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const res = await goi(cookie, '/api/nguoi-dung', 'POST', { tenDangNhap: 'a', tenHienThi: 'a', matKhau: 'mat-khau-dai-du', vaiTro: 'GIAM_DOC' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/nguoi-dung/:id', () => {
  it('admin khoá nhân viên: 200, cookie cũ của nhân viên hết dùng được và không đăng nhập lại được', async () => {
    const { lan } = taoAdminVaNhanVien();
    const cookieAdmin = await dangNhap('admin');
    const cookieLan = await dangNhap('lan');
    expect((await goi(cookieLan, '/api/hang-hoa')).status).toBe(200);

    const res = await goi(cookieAdmin, `/api/nguoi-dung/${lan.id}`, 'PUT', { hoatDong: false });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ hoatDong: false });
    expect((await goi(cookieLan, '/api/hang-hoa')).status).toBe(401);
    expect(await dangNhap('lan')).toBe('');
  });

  it('tự khoá chính mình: 409', async () => {
    const { admin } = taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const res = await goi(cookie, `/api/nguoi-dung/${admin.id}`, 'PUT', { hoatDong: false });

    expect(res.status).toBe(409);
  });

  it('admin duy nhất không tự hạ vai trò của mình được: 409', async () => {
    const { admin } = taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const res = await goi(cookie, `/api/nguoi-dung/${admin.id}`, 'PUT', { vaiTro: 'NHAN_VIEN' });

    expect(res.status).toBe(409);
  });

  it('người không tồn tại: 404; body rỗng hoặc sai dạng: 400', async () => {
    taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    expect((await goi(cookie, '/api/nguoi-dung/khong-co', 'PUT', { hoatDong: false })).status).toBe(404);
    expect((await goi(cookie, '/api/nguoi-dung/khong-co', 'PUT', {})).status).toBe(400);
    expect((await goi(cookie, '/api/nguoi-dung/khong-co', 'PUT', { vaiTro: 'GIAM_DOC' })).status).toBe(400);
  });
});

describe('POST /api/nguoi-dung/:id/dat-lai-mat-khau', () => {
  it('đặt lại mật khẩu: 204, mật khẩu cũ không còn đăng nhập được, mới thì được', async () => {
    const { lan } = taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    const res = await goi(cookie, `/api/nguoi-dung/${lan.id}/dat-lai-mat-khau`, 'POST', { matKhau: 'mat-khau-moi-12345' });

    expect(res.status).toBe(204);
    expect(await dangNhap('lan', 'mat-khau-dai-du')).toBe('');
    expect(await dangNhap('lan', 'mat-khau-moi-12345')).toMatch(/^phien=/);
  });

  it('mật khẩu ngắn: 400; người không tồn tại: 404', async () => {
    const { lan } = taoAdminVaNhanVien();
    const cookie = await dangNhap('admin');

    expect((await goi(cookie, `/api/nguoi-dung/${lan.id}/dat-lai-mat-khau`, 'POST', { matKhau: 'ngan' })).status).toBe(400);
    expect((await goi(cookie, '/api/nguoi-dung/khong-co/dat-lai-mat-khau', 'POST', { matKhau: 'mat-khau-moi-12345' })).status).toBe(404);
  });
});

describe('lọc giá vốn khỏi danh sách hàng với nhân viên', () => {
  function taoHang() {
    db.insert(sanPham).values({ id: 'sp-1', maHang: 'SP001', ten: 'Paracetamol 500mg' }).run();
    db.insert(donViTinh).values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 }).run();
  }

  it('admin thấy giaVon, nhân viên không thấy khoá giaVon nhưng vẫn thấy giá bán', async () => {
    taoAdminVaNhanVien();
    taoHang();
    const cookieAdmin = await dangNhap('admin');
    const cookieLan = await dangNhap('lan');

    const admin = (await (await goi(cookieAdmin, '/api/hang-hoa')).json()) as { duLieu: Record<string, unknown>[] };
    const lan = (await (await goi(cookieLan, '/api/hang-hoa')).json()) as { duLieu: Record<string, unknown>[] };

    expect(admin.duLieu[0]).toHaveProperty('giaVon');
    expect(lan.duLieu[0]).not.toHaveProperty('giaVon');
    expect(lan.duLieu[0]).toMatchObject({ maHang: 'SP001', giaBan: 500, tonKho: 0 });
    expect(JSON.stringify(lan)).not.toContain('giaVon');
  });

  it('phản hồi đã lọc của nhân viên vẫn thoả hợp đồng DanhSachHangHoaResSchema mà màn bán hàng dùng để đọc', async () => {
    taoAdminVaNhanVien();
    taoHang();
    const cookieLan = await dangNhap('lan');

    const res = await goi(cookieLan, '/api/hang-hoa?tim=para');

    expect(DanhSachHangHoaResSchema.parse(await res.json()).duLieu).toHaveLength(1);
  });

  it('tìm theo từ khoá cũng được lọc', async () => {
    taoAdminVaNhanVien();
    taoHang();
    const cookieLan = await dangNhap('lan');

    const res = await goi(cookieLan, '/api/hang-hoa?tim=para');

    expect(JSON.stringify(await res.json())).not.toContain('giaVon');
  });
});
