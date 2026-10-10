import { afterEach, describe, expect, it, vi } from 'vitest';
import { boocFetch, caiDatFetchToanCuc } from './fetch-xac-thuc';

function fetchTraVe(status: number): typeof fetch {
  return vi.fn(() => Promise.resolve(new Response(null, { status }))) as unknown as typeof fetch;
}

describe('boocFetch', () => {
  it('401 ở /api/hang-hoa gọi callback một lần và trả nguyên response', async () => {
    const khiHetPhien = vi.fn();
    const f = boocFetch(fetchTraVe(401), khiHetPhien);

    const res = await f('/api/hang-hoa?tim=a');

    expect(res.status).toBe(401);
    expect(khiHetPhien).toHaveBeenCalledTimes(1);
  });

  it('200 không gọi callback', async () => {
    const khiHetPhien = vi.fn();

    await boocFetch(fetchTraVe(200), khiHetPhien)('/api/hang-hoa');

    expect(khiHetPhien).not.toHaveBeenCalled();
  });

  it('401 ở /api/auth/dang-nhap (sai mật khẩu) không phải hết phiên', async () => {
    const khiHetPhien = vi.fn();

    await boocFetch(fetchTraVe(401), khiHetPhien)('/api/auth/dang-nhap', { method: 'POST' });

    expect(khiHetPhien).not.toHaveBeenCalled();
  });

  it('403 không phải hết phiên', async () => {
    const khiHetPhien = vi.fn();

    await boocFetch(fetchTraVe(403), khiHetPhien)('/api/phieu-nhap');

    expect(khiHetPhien).not.toHaveBeenCalled();
  });

  it('401 ở URL ngoài hoặc đường không bắt đầu /api/ thì bỏ qua', async () => {
    const khiHetPhien = vi.fn();
    const f = boocFetch(fetchTraVe(401), khiHetPhien);

    await f('https://nguoi-la.example/api/x');
    await f('/khong-phai-api');

    expect(khiHetPhien).not.toHaveBeenCalled();
  });

  it('nhận đối số URL và Request', async () => {
    const khiHetPhien = vi.fn();
    const f = boocFetch(fetchTraVe(401), khiHetPhien);

    await f(new URL('http://localhost/api/hoa-don'));
    await f(new Request('http://localhost/api/tra-hang'));

    expect(khiHetPhien).toHaveBeenCalledTimes(2);
  });

  it('lỗi mạng được ném lại nguyên, không gọi callback', async () => {
    const khiHetPhien = vi.fn();
    const loi = new TypeError('Failed to fetch');
    const f = boocFetch(vi.fn(() => Promise.reject(loi)) as unknown as typeof fetch, khiHetPhien);

    await expect(f('/api/hang-hoa')).rejects.toBe(loi);
    expect(khiHetPhien).not.toHaveBeenCalled();
  });
});

describe('caiDatFetchToanCuc', () => {
  const fetchBanDau = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = fetchBanDau;
  });

  it('thay fetch toàn cục và hàm khôi phục trả lại bản gốc', async () => {
    globalThis.fetch = fetchTraVe(401);
    const khiHetPhien = vi.fn();

    const khoiPhuc = caiDatFetchToanCuc(khiHetPhien);
    await globalThis.fetch('/api/hang-hoa');
    expect(khiHetPhien).toHaveBeenCalledTimes(1);

    khoiPhuc();
    await globalThis.fetch('/api/hang-hoa');
    expect(khiHetPhien).toHaveBeenCalledTimes(1);
  });
});
