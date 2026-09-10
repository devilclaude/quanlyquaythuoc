import { describe, expect, it } from 'vitest';
import { taoApp } from './app';

describe('GET /api/suc-khoe', () => {
  it('trả về trạng thái ok', async () => {
    const app = taoApp();

    const res = await app.request('/api/suc-khoe');

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ trangThai: 'ok' });
  });
});
