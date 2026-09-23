import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh } from './schema';
import { layChiNhanhMacDinh } from './chi-nhanh';

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

describe('layChiNhanhMacDinh', () => {
  it('tạo một dòng chi nhánh khi bảng đang rỗng và trả về id của dòng đó', () => {
    const id = layChiNhanhMacDinh(db);

    const cacDong = db.select().from(chiNhanh).all();
    expect(cacDong).toHaveLength(1);
    expect(cacDong[0]?.id).toBe(id);
  });

  it('gọi nhiều lần không tạo thêm dòng — luôn trả về đúng một id (v1 chỉ một chi nhánh, SPEC.md §3.6)', () => {
    const idLan1 = layChiNhanhMacDinh(db);
    const idLan2 = layChiNhanhMacDinh(db);
    const idLan3 = layChiNhanhMacDinh(db);

    expect(idLan2).toBe(idLan1);
    expect(idLan3).toBe(idLan1);
    expect(db.select().from(chiNhanh).all()).toHaveLength(1);
  });
});
