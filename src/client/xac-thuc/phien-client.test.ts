import { describe, expect, it, vi } from 'vitest';
import {
  type KhoLuu,
  dangNhap,
  dangXuat,
  docNguoiDaLuu,
  layNguoiHienTai,
  luuNguoi,
  xoaNguoiDaLuu,
} from './phien-client';

const NGUOI = { id: 'u1', tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN' as const };

function phanHoiJson(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function khoGia(): KhoLuu & { du: Map<string, string> } {
  const du = new Map<string, string>();
  return {
    du,
    getItem: (k) => du.get(k) ?? null,
    setItem: (k, v) => void du.set(k, v),
    removeItem: (k) => void du.delete(k),
  };
}

describe('dangNhap', () => {
  it('200: trả người dùng đã parse', async () => {
    const f = vi.fn(() => Promise.resolve(phanHoiJson(200, NGUOI))) as unknown as typeof fetch;

    expect(await dangNhap('lan', 'mat-khau-dai-du', f)).toEqual({ loai: 'OK', nguoi: NGUOI });
  });

  it('gửi POST JSON đúng đường dẫn và nội dung', async () => {
    const f = vi.fn(() => Promise.resolve(phanHoiJson(200, NGUOI)));

    await dangNhap('lan', 'mat-khau-dai-du', f);

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/auth/dang-nhap');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ tenDangNhap: 'lan', matKhau: 'mat-khau-dai-du' });
  });

  it('401: SAI', async () => {
    const f = (() => Promise.resolve(phanHoiJson(401, { loi: 'x' }))) as unknown as typeof fetch;

    expect(await dangNhap('lan', 'sai', f)).toEqual({ loai: 'SAI' });
  });

  it('429: BI_CHAN kèm số giây từ Retry-After', async () => {
    const f = (() => Promise.resolve(phanHoiJson(429, { loi: 'x' }, { 'Retry-After': '600' }))) as unknown as typeof fetch;

    expect(await dangNhap('lan', 'sai', f)).toEqual({ loai: 'BI_CHAN', thuLaiSauGiay: 600 });
  });

  it('fetch ném lỗi: LOI_MANG', async () => {
    const f = (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;

    expect(await dangNhap('lan', 'x', f)).toEqual({ loai: 'LOI_MANG' });
  });

  it('200 nhưng body sai dạng: LOI_MANG (không tin dữ liệu lạ)', async () => {
    const f = (() => Promise.resolve(phanHoiJson(200, { linh: 'tinh' }))) as unknown as typeof fetch;

    expect(await dangNhap('lan', 'x', f)).toEqual({ loai: 'LOI_MANG' });
  });
});

describe('layNguoiHienTai', () => {
  it('200 → OK, 401 → CHUA_DANG_NHAP, lỗi mạng → LOI_MANG', async () => {
    const ok = (() => Promise.resolve(phanHoiJson(200, NGUOI))) as unknown as typeof fetch;
    const chua = (() => Promise.resolve(phanHoiJson(401, {}))) as unknown as typeof fetch;
    const mang = (() => Promise.reject(new TypeError('x'))) as unknown as typeof fetch;

    expect(await layNguoiHienTai(ok)).toEqual({ loai: 'OK', nguoi: NGUOI });
    expect(await layNguoiHienTai(chua)).toEqual({ loai: 'CHUA_DANG_NHAP' });
    expect(await layNguoiHienTai(mang)).toEqual({ loai: 'LOI_MANG' });
  });

  it('máy chủ lỗi 500 coi là LOI_MANG, không phải đã đăng xuất', async () => {
    const f = (() => Promise.resolve(phanHoiJson(500, {}))) as unknown as typeof fetch;

    expect(await layNguoiHienTai(f)).toEqual({ loai: 'LOI_MANG' });
  });
});

describe('người dùng đã lưu', () => {
  it('lưu rồi đọc lại đúng', () => {
    const kho = khoGia();

    luuNguoi(NGUOI, kho);

    expect(docNguoiDaLuu(kho)).toEqual(NGUOI);
  });

  it('dữ liệu hỏng hoặc sai dạng thì trả undefined', () => {
    const kho = khoGia();
    kho.setItem('quaythuoc.nguoi-dung', '{khong-phai-json');
    expect(docNguoiDaLuu(kho)).toBeUndefined();

    kho.setItem('quaythuoc.nguoi-dung', JSON.stringify({ id: 'x' }));
    expect(docNguoiDaLuu(kho)).toBeUndefined();
  });

  it('kho ném lỗi (chế độ riêng tư) thì không văng', () => {
    const kho: KhoLuu = {
      getItem: () => {
        throw new Error('chặn');
      },
      setItem: () => {
        throw new Error('chặn');
      },
      removeItem: () => {
        throw new Error('chặn');
      },
    };

    expect(() => luuNguoi(NGUOI, kho)).not.toThrow();
    expect(docNguoiDaLuu(kho)).toBeUndefined();
    expect(() => xoaNguoiDaLuu(kho)).not.toThrow();
  });
});

describe('dangXuat', () => {
  it('gọi API đăng xuất, xoá người đã lưu và xoá cache tra cứu', async () => {
    const kho = khoGia();
    luuNguoi(NGUOI, kho);
    const f = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    const xoaCache = vi.fn(() => Promise.resolve(true));

    await dangXuat({ fetchFn: f as unknown as typeof fetch, kho, caches: { delete: xoaCache } });

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/auth/dang-xuat');
    expect(init.method).toBe('POST');
    expect(docNguoiDaLuu(kho)).toBeUndefined();
    expect(xoaCache).toHaveBeenCalledWith('danh-muc-tra-cuu');
  });

  it('vẫn xoá cục bộ khi gọi API thất bại (mất mạng)', async () => {
    const kho = khoGia();
    luuNguoi(NGUOI, kho);
    const f = (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;
    const xoaCache = vi.fn(() => Promise.resolve(true));

    await expect(dangXuat({ fetchFn: f, kho, caches: { delete: xoaCache } })).resolves.toBeUndefined();

    expect(docNguoiDaLuu(kho)).toBeUndefined();
    expect(xoaCache).toHaveBeenCalledTimes(1);
  });
});
