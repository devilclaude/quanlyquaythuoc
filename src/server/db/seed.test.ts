import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { donViTinh, loHang, tonKhoLo } from './schema';
import { seedDuLieuMinhHoa } from './seed';

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

describe('seedDuLieuMinhHoa', () => {
  it('sản phẩm nhiều đơn vị có nhiều lô thật, mỗi lô đều có tồn kho đệm', () => {
    const { sanPhamNhieuLo } = seedDuLieuMinhHoa(db);

    const donVi = db.select().from(donViTinh).where(eq(donViTinh.sanPhamId, sanPhamNhieuLo)).all();
    const loThat = db
      .select()
      .from(loHang)
      .where(eq(loHang.sanPhamId, sanPhamNhieuLo))
      .all()
      .filter((lo) => !lo.laLoMacDinh);

    expect(donVi.length).toBeGreaterThan(1);
    expect(loThat.length).toBeGreaterThan(1);

    for (const lo of loThat) {
      const ton = db.select().from(tonKhoLo).where(eq(tonKhoLo.loId, lo.id)).all();
      expect(ton).toHaveLength(1);
      expect(ton[0]?.ton).toBeGreaterThan(0);
    }
  });

  it('mặt hàng tồn phẳng chỉ có đúng một lô — lô ngầm định — và có tồn kho đệm', () => {
    const { sanPhamTonPhang } = seedDuLieuMinhHoa(db);

    const lo = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamTonPhang)).all();

    expect(lo).toHaveLength(1);
    expect(lo[0]).toMatchObject({ soLo: null, hsd: null, laLoMacDinh: true });

    const ton = db
      .select()
      .from(tonKhoLo)
      .where(eq(tonKhoLo.loId, lo[0]?.id ?? ''))
      .all();

    expect(ton).toHaveLength(1);
    expect(ton[0]?.ton).toBeGreaterThan(0);
  });
});
