import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { chongCsrf } from './chong-csrf';

function taoApp(originChoPhep: string[] = []) {
  const app = new Hono();
  app.use('*', chongCsrf(originChoPhep));
  app.all('/x', (c) => c.text('ok'));
  return app;
}

const DOMAIN = 'https://quaythuoc.dev2sec.io.vn';

describe('chongCsrf', () => {
  it('GET luôn qua, kể cả Origin lạ', async () => {
    const res = await taoApp().request('/x', { headers: { Origin: 'https://ke-xau.example' } });

    expect(res.status).toBe(200);
  });

  it('POST không có Origin (không phải trình duyệt) thì qua', async () => {
    const res = await taoApp().request('/x', { method: 'POST' });

    expect(res.status).toBe(200);
  });

  it('POST có Origin cùng host với header Host thì qua', async () => {
    const res = await taoApp().request('/x', {
      method: 'POST',
      headers: { Origin: DOMAIN, Host: 'quaythuoc.dev2sec.io.vn' },
    });

    expect(res.status).toBe(200);
  });

  it('POST có Origin khớp X-Forwarded-Host (đứng sau proxy) thì qua', async () => {
    const res = await taoApp().request('/x', {
      method: 'POST',
      headers: { Origin: DOMAIN, Host: 'localhost:3000', 'X-Forwarded-Host': 'quaythuoc.dev2sec.io.vn' },
    });

    expect(res.status).toBe(200);
  });

  it('X-Forwarded-Host là danh sách qua nhiều proxy: lấy host đầu tiên (host gốc của trình duyệt)', async () => {
    const res = await taoApp().request('/x', {
      method: 'POST',
      headers: {
        Origin: DOMAIN,
        Host: 'localhost:3000',
        'X-Forwarded-Host': 'quaythuoc.dev2sec.io.vn, localhost:3000',
      },
    });

    expect(res.status).toBe(200);
  });

  it('POST có Origin lạ thì 403', async () => {
    const res = await taoApp().request('/x', {
      method: 'POST',
      headers: { Origin: 'https://ke-xau.example', Host: 'quaythuoc.dev2sec.io.vn' },
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ loi: 'Nguồn gốc request không hợp lệ' });
  });

  it('POST có Origin nằm trong danh sách cho phép thì qua dù khác host', async () => {
    const res = await taoApp([DOMAIN]).request('/x', {
      method: 'POST',
      headers: { Origin: DOMAIN, Host: 'api-quaythuoc.dev2sec.io.vn' },
    });

    expect(res.status).toBe(200);
  });

  it.each(['PUT', 'PATCH', 'DELETE'])('%s cũng bị kiểm Origin', async (method) => {
    const res = await taoApp().request('/x', {
      method,
      headers: { Origin: 'https://ke-xau.example', Host: 'quaythuoc.dev2sec.io.vn' },
    });

    expect(res.status).toBe(403);
  });

  it('Origin "null" (iframe sandbox, file://) bị chặn khi ghi', async () => {
    const res = await taoApp().request('/x', {
      method: 'POST',
      headers: { Origin: 'null', Host: 'quaythuoc.dev2sec.io.vn' },
    });

    expect(res.status).toBe(403);
  });
});
