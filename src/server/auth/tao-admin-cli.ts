import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { cauHinh } from '../config';
import { MatKhauQuaNganError, TenDangNhapDaTonTaiError, TenDangNhapKhongHopLeError } from './nguoi-dung';
import { taoAdmin } from './tao-admin';

// Đọc từng dòng từ stdin. Khi stdin là terminal thì tắt echo để không lộ mật khẩu.
const dongNhap: string[] = [];
const rl = createInterface({ input: process.stdin, terminal: false });
const doiDong = new Promise<void>((xong) => rl.on('close', xong));
rl.on('line', (d) => dongNhap.push(d));

async function hoiAn(cauHoi: string): Promise<string> {
  process.stdout.write(cauHoi);
  const tty = process.stdin.isTTY;
  if (tty) process.stdin.setRawMode(true);
  try {
    while (dongNhap.length === 0) {
      await new Promise((r) => setTimeout(r, 20));
      if (process.stdin.readableEnded) break;
    }
  } finally {
    if (tty) process.stdin.setRawMode(false);
  }
  process.stdout.write('\n');
  return dongNhap.shift() ?? '';
}

const tenDangNhap = process.argv[2];
if (!tenDangNhap) {
  console.error('Cách dùng: npm run tao-admin -- <tenDangNhap>');
  process.exit(1);
}

const matKhau = await hoiAn('Mật khẩu (tối thiểu 8 ký tự): ');
const nhapLai = await hoiAn('Nhập lại mật khẩu: ');
rl.close();
await doiDong;
if (matKhau !== nhapLai) {
  console.error('Hai lần nhập mật khẩu không khớp.');
  process.exit(1);
}

mkdirSync(dirname(cauHinh.DATABASE_URL), { recursive: true });
const sqlite = new Database(cauHinh.DATABASE_URL);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './src/server/db/migrations' });

try {
  const nguoi = taoAdmin(db, { tenDangNhap, matKhau });
  console.log(`Đã tạo admin "${nguoi.tenDangNhap}".`);
} catch (loi) {
  if (
    loi instanceof MatKhauQuaNganError ||
    loi instanceof TenDangNhapDaTonTaiError ||
    loi instanceof TenDangNhapKhongHopLeError
  ) {
    console.error(loi.message);
    process.exitCode = 1;
  } else {
    throw loi;
  }
} finally {
  sqlite.close();
}
