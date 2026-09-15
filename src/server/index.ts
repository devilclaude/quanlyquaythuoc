import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { serve } from '@hono/node-server';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { taoApp } from './app';
import { cauHinh } from './config';

mkdirSync(dirname(cauHinh.DATABASE_URL), { recursive: true });
const sqlite = new Database(cauHinh.DATABASE_URL);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);

// Chạy migration tự động lúc khởi động (ARCHITECTURE.md §6) — idempotent,
// drizzle tự theo dõi migration nào đã áp dụng.
migrate(db, { migrationsFolder: './src/server/db/migrations' });

serve({ fetch: taoApp(db).fetch, port: cauHinh.PORT }, (info) => {
  console.log(`Server chạy ở cổng ${info.port}`);
});
