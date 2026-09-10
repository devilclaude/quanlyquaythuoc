import { Hono } from 'hono';

export function taoApp() {
  const app = new Hono();

  app.get('/api/suc-khoe', (c) => c.json({ trangThai: 'ok' }));

  return app;
}
