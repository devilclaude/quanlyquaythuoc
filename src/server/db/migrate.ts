import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { cauHinh } from '../config';

const url = cauHinh.DATABASE_URL;
mkdirSync(dirname(url), { recursive: true });
const sqlite = new Database(url);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: './src/server/db/migrations' });

sqlite.close();

console.log(`Đã chạy migration cho ${url}`);
