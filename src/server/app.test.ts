import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { taoApp } from './app';

type DbTest = ReturnType<typeof drizzle>;

let sqlite: Database.Database;
let db: DbTest;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
});

afterEach(() => {
  sqlite.close();
});

describe('GET /api/suc-khoe', () => {
  it('trả về trạng thái ok', async () => {
    const app = taoApp(db);

    const res = await app.request('/api/suc-khoe');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ trangThai: 'ok' });
  });
});

describe('GET /api/hang-hoa', () => {
  it('mount đúng route con của hang-hoa', async () => {
    const app = taoApp(db);

    const res = await app.request('/api/hang-hoa');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ duLieu: [] });
  });
});
