import { describe, expect, it } from 'vitest';
import cauHinh from '../../vite.config';

// Lớp chống CSRF của máy chủ (src/server/auth/chong-csrf.ts) so `Origin` với header
// `Host`. Vite biến proxy dạng chuỗi thành `changeOrigin: true` — viết lại `Host` thành
// `localhost:3000` — khiến mọi request ghi từ trình duyệt bị 403. Phải giữ `Host` gốc.
describe('proxy /api của vite.config', () => {
  function layProxy(loai: 'server' | 'preview') {
    const proxy = cauHinh[loai]?.proxy?.['/api'];
    if (typeof proxy !== 'object' || proxy === null) throw new Error(`${loai}.proxy['/api'] phải là object tường minh`);
    return proxy;
  }

  it.each(['server', 'preview'] as const)('%s: trỏ về API cổng 3000 và KHÔNG viết lại header Host', (loai) => {
    const proxy = layProxy(loai);

    expect(proxy.target).toBe('http://localhost:3000');
    expect(proxy.changeOrigin).toBe(false);
  });
});
