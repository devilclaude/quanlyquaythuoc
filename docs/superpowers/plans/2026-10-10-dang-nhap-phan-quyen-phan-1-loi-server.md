# Đăng nhập và phân quyền — Phần 1: lõi server — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server đòi đăng nhập cho mọi `/api/*` (trừ health và đăng nhập), có hai vai trò `ADMIN`/`NHAN_VIEN`, phiên lưu SQLite, chặn dò mật khẩu và CSRF, kèm lệnh tạo admin đầu tiên.

**Architecture:** Mô-đun mới `src/server/auth/` (băm mật khẩu, phiên, giới hạn đăng nhập sai, bảng quyền + middleware, CSRF). Route `/api/auth/*` ở `src/server/api/auth.ts`. `taoApp` gắn middleware **bật sẵn** (an toàn mặc định) trước mọi route. Mỗi file một trách nhiệm, thời gian truyền vào như tham số để test không phụ thuộc đồng hồ.

**Tech Stack:** TypeScript, Hono (`hono/cookie`, `hono/cors`), drizzle-orm + better-sqlite3, `node:crypto` (`scrypt`, `createHash`, `timingSafeEqual`), zod, Vitest (SQLite in-memory, không mock lớp dữ liệu).

**Spec:** `docs/superpowers/specs/2026-10-10-dang-nhap-phan-quyen-design.md` (Phần 1 trong mục "Chia việc"). Lệch spec có chủ ý, đã sửa ở Task 0: bỏ quy tắc CSRF "bắt buộc `Content-Type: application/json`" vì `POST /api/phieu-nhap/tu-excel` tải file `multipart/form-data`.

## Global Constraints

- Không thêm thư viện mới. Mật khẩu băm bằng `scrypt` của `node:crypto`.
- Mật khẩu tối thiểu 8 ký tự. Tên đăng nhập lưu chữ thường, đã `trim`.
- Phiên: cookie tên `phien`, `httpOnly`, `SameSite=Lax`, `Path=/`, hạn 30 ngày, gia hạn trượt; DB chỉ lưu SHA-256 của mã phiên.
- Giới hạn đăng nhập sai: 5 lần trong 15 phút theo cặp (tên đăng nhập, IP) → `429` + `Retry-After`.
- Sai tên hay sai mật khẩu trả cùng một lỗi `401` và cùng chi phí tính toán.
- Phân quyền **chặn mặc định**: route không có trong bảng quyền chỉ `ADMIN` dùng được. Chưa đăng nhập `401`, sai vai trò `403`.
- Không xoá cứng người dùng; khoá bằng `hoat_dong = false`.
- Tên miền nghiệp vụ tiếng Việt không dấu (`nguoiDung`, `phien`, `vaiTro`); tên kỹ thuật tiếng Anh. Bảng/cột `snake_case` tiếng Việt không dấu.
- Không dùng số thực cho tiền (không liên quan Phần 1) và không tắt/skip test.
- Lệnh chuẩn của dự án: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run ci`. Chạy test một file: `npx vitest run <đường-dẫn>`.
- Commit: `git -c user.name="duongnt" -c user.email="duongnt.96@proton.me" commit -m "<tiêu đề>" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017iVt8FPkU2VRb84DTs5AgN"`. `<trailer>` trong các bước commit nghĩa là đúng hai dòng `Co-Authored-By: …` và `Claude-Session: …` ở trên, truyền bằng `-m` thứ hai. Viết tắt `GC` bên dưới là chuỗi `git -c user.name="duongnt" -c user.email="duongnt.96@proton.me"`; luôn `git add` đúng file của task, không `git add -A`.

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `src/shared/hop-dong/auth.ts` (mới) | Zod: `VaiTroSchema`, `NguoiDungSchema`, `DangNhapReqSchema`. Dùng chung client/server |
| `src/server/auth/mat-khau.ts` (mới) | `bamMatKhau`, `kiemTraMatKhau`, `BAM_GIA` |
| `src/server/auth/nguoi-dung.ts` (mới) | `taoNguoiDung`, `timNguoiDungTheoTen`, các lỗi miền |
| `src/server/auth/phien.ts` (mới) | `taoPhien`, `docPhien`, `xoaPhien`, `xoaMoiPhienCua` |
| `src/server/auth/gioi-han-dang-nhap.ts` (mới) | `taoGioiHanDangNhap` |
| `src/server/auth/phan-quyen.ts` (mới) | Bảng quyền, `vaiTroToiThieu`, middleware `batXacThuc` |
| `src/server/auth/chong-csrf.ts` (mới) | Middleware `chongCsrf` |
| `src/server/auth/tao-admin.ts` (mới) | `taoAdmin(db, {tenDangNhap, matKhau})` (hàm thuần, test được) |
| `src/server/auth/tao-admin-cli.ts` (mới) | Vỏ dòng lệnh đọc mật khẩu từ terminal |
| `src/server/api/auth.ts` (mới) | Route `dang-nhap`, `dang-xuat`, `toi` |
| `src/server/db/schema.ts` (sửa) | Bảng `nguoi_dung`, `phien` |
| `src/server/db/migrations/*` (sinh) | Migration do `npm run db:generate` |
| `src/server/app.ts` (sửa) | Gắn CSRF + xác thực + route `/api/auth` |
| `package.json` (sửa) | Script `tao-admin` |

Mỗi file test nằm cạnh file được test (`x.ts` → `x.test.ts`).

---

### Task 0: Dọn nền — sửa spec và commit công việc đang treo

Nhánh hiện có thay đổi chưa commit từ trước (tìm không dấu, Tổng quan, CORS + cấu hình domain). Đã chạy `npm run ci` xanh. Tách thành hai commit riêng để lịch sử rõ ràng và không lẫn vào các commit đăng nhập.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-10-dang-nhap-phan-quyen-design.md` (mục "Xác thực", gạch đầu dòng CSRF)
- Commit (đã sửa sẵn): `src/shared/van-ban/*`, `src/server/api/hang-hoa.ts`, `src/server/api/hang-hoa.test.ts`, `src/client/man-hinh/TongQuan/*`, `src/server/app.ts`, `src/server/app.test.ts`, `src/server/config.ts`, `src/server/index.ts`, `vite.config.ts`, `.env.example`

- [ ] **Step 1: Sửa dòng CSRF trong spec**

Trong `docs/superpowers/specs/2026-10-10-dang-nhap-phan-quyen-design.md`, thay dòng bắt đầu bằng `- CSRF:` (và dòng nối tiếp của nó) bằng:

```markdown
- CSRF: request ghi (không phải GET/HEAD/OPTIONS) có header `Origin` thì `Origin`
  phải cùng host với request (kể cả `X-Forwarded-Host`) hoặc nằm trong
  `CORS_ORIGINS`, ngược lại `403`. Request không có `Origin` (không phải trình
  duyệt) được qua. Không ép `Content-Type: application/json` vì
  `POST /api/phieu-nhap/tu-excel` tải file `multipart/form-data`; phòng thủ chính là
  `SameSite=Lax` + kiểm `Origin`.
```

- [ ] **Step 2: Commit hai nhóm thay đổi cũ**

```bash
git add src/shared/van-ban src/server/api/hang-hoa.ts src/server/api/hang-hoa.test.ts src/client/man-hinh/TongQuan
GC commit -m "Tìm hàng không dấu, thêm tiêu đề và lề cho màn Tổng quan" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017iVt8FPkU2VRb84DTs5AgN"
git add src/server/app.ts src/server/app.test.ts src/server/config.ts src/server/index.ts vite.config.ts .env.example
GC commit -m "CORS theo CORS_ORIGINS và cấu hình host cho domain" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017iVt8FPkU2VRb84DTs5AgN"
git add docs/superpowers/specs/2026-10-10-dang-nhap-phan-quyen-design.md docs/superpowers/plans
GC commit -m "docs: sửa quy tắc CSRF trong spec, thêm kế hoạch Phần 1" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017iVt8FPkU2VRb84DTs5AgN"
```

(`GC` thay bằng chuỗi `git -c user.name="duongnt" -c user.email="duongnt.96@proton.me"` khi chạy thật.)

- [ ] **Step 3: Xác nhận cây làm việc sạch**

Run: `git status --short`
Expected: không in dòng nào (ghi chú: `.env` và `data/` đã nằm trong `.gitignore`).

---

### Task 1: Băm và kiểm tra mật khẩu

**Files:**
- Create: `src/server/auth/mat-khau.ts`
- Test: `src/server/auth/mat-khau.test.ts`

**Interfaces:**
- Produces: `bamMatKhau(matKhau: string): string`; `kiemTraMatKhau(matKhau: string, chuoiBam: string): boolean`; `BAM_GIA: string` (một chuỗi băm hợp lệ không ứng với mật khẩu nào, để đăng nhập tên không tồn tại vẫn tốn cùng chi phí).

- [ ] **Step 1: Viết test đỏ**

```ts
// src/server/auth/mat-khau.test.ts
import { describe, expect, it } from 'vitest';
import { BAM_GIA, bamMatKhau, kiemTraMatKhau } from './mat-khau';

describe('bamMatKhau / kiemTraMatKhau', () => {
  it('mật khẩu đúng thì khớp', () => {
    const bam = bamMatKhau('mat-khau-dai-du');

    expect(kiemTraMatKhau('mat-khau-dai-du', bam)).toBe(true);
  });

  it('mật khẩu sai thì không khớp', () => {
    const bam = bamMatKhau('mat-khau-dai-du');

    expect(kiemTraMatKhau('mat-khau-khac', bam)).toBe(false);
  });

  it('hai lần băm cùng mật khẩu ra chuỗi khác nhau (muối ngẫu nhiên) nhưng đều khớp', () => {
    const a = bamMatKhau('mat-khau-dai-du');
    const b = bamMatKhau('mat-khau-dai-du');

    expect(a).not.toBe(b);
    expect(kiemTraMatKhau('mat-khau-dai-du', a)).toBe(true);
    expect(kiemTraMatKhau('mat-khau-dai-du', b)).toBe(true);
  });

  it('chuỗi băm không đúng định dạng thì trả false, không ném lỗi', () => {
    expect(kiemTraMatKhau('x', '')).toBe(false);
    expect(kiemTraMatKhau('x', 'khong-phai-bam')).toBe(false);
    expect(kiemTraMatKhau('x', 'scrypt$1$2$3$zz$zz')).toBe(false);
  });

  it('chuỗi băm không chứa mật khẩu gốc', () => {
    expect(bamMatKhau('mat-khau-dai-du')).not.toContain('mat-khau-dai-du');
  });

  it('BAM_GIA là chuỗi băm hợp lệ nhưng không khớp mật khẩu thường gặp', () => {
    expect(BAM_GIA.startsWith('scrypt$')).toBe(true);
    expect(kiemTraMatKhau('password', BAM_GIA)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/auth/mat-khau.test.ts`
Expected: FAIL — `Cannot find module './mat-khau'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/auth/mat-khau.ts
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Tham số scrypt lưu cùng chuỗi băm để sau này nâng độ khó mà không làm hỏng
// mật khẩu cũ. N=16384, r=8 dùng ~16MB bộ nhớ, dưới giới hạn mặc định 32MB.
const N = 16384;
const R = 8;
const P = 1;
const DO_DAI_KHOA = 64;

/** Định dạng: `scrypt$N$r$p$muoiHex$khoaHex`. */
export function bamMatKhau(matKhau: string): string {
  const muoi = randomBytes(16);
  const khoa = scryptSync(matKhau, muoi, DO_DAI_KHOA, { N, r: R, p: P });
  return ['scrypt', N, R, P, muoi.toString('hex'), khoa.toString('hex')].join('$');
}

export function kiemTraMatKhau(matKhau: string, chuoiBam: string): boolean {
  const phan = chuoiBam.split('$');
  if (phan.length !== 6 || phan[0] !== 'scrypt') return false;

  const n = Number(phan[1]);
  const r = Number(phan[2]);
  const p = Number(phan[3]);
  const muoiHex = phan[4];
  const khoaHex = phan[5];
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (!muoiHex || !khoaHex || !/^[0-9a-f]+$/.test(muoiHex) || !/^[0-9a-f]+$/.test(khoaHex)) return false;

  const khoaMong = Buffer.from(khoaHex, 'hex');
  try {
    const khoa = scryptSync(matKhau, Buffer.from(muoiHex, 'hex'), khoaMong.length, { N: n, r, p });
    return khoa.length === khoaMong.length && timingSafeEqual(khoa, khoaMong);
  } catch {
    return false;
  }
}

/**
 * Băm dùng khi tên đăng nhập không tồn tại: vẫn phải chạy một lần scrypt để thời
 * gian trả lời không tiết lộ tên nào có thật.
 */
export const BAM_GIA = bamMatKhau('mat-khau-gia-khong-ai-biet');
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/auth/mat-khau.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/mat-khau.ts src/server/auth/mat-khau.test.ts
GC commit -m "Băm và kiểm tra mật khẩu bằng scrypt" -m "<trailer>"
```

---

### Task 2: Hợp đồng chung, schema và migration

**Files:**
- Create: `src/shared/hop-dong/auth.ts`
- Modify: `src/server/db/schema.ts` (thêm cuối file hai bảng)
- Create (sinh): `src/server/db/migrations/00NN_*.sql` + `meta/*`
- Test: `src/server/db/nguoi-dung-schema.test.ts`

**Interfaces:**
- Produces: `VaiTroSchema`, `type VaiTro = 'ADMIN' | 'NHAN_VIEN'`, `NguoiDungSchema`, `type NguoiDungHienTai` (= `z.infer<typeof NguoiDungSchema>`: `{ id: string; tenDangNhap: string; tenHienThi: string; vaiTro: VaiTro }`), `DangNhapReqSchema` (`{ tenDangNhap: string; matKhau: string }`); bảng drizzle `nguoiDung`, `phien`.

- [ ] **Step 1: Viết hợp đồng chung**

```ts
// src/shared/hop-dong/auth.ts
import { z } from 'zod';

export const VaiTroSchema = z.enum(['ADMIN', 'NHAN_VIEN']);
export type VaiTro = z.infer<typeof VaiTroSchema>;

export const NguoiDungSchema = z.object({
  id: z.string().min(1),
  tenDangNhap: z.string().min(1),
  tenHienThi: z.string().min(1),
  vaiTro: VaiTroSchema,
});
export type NguoiDungHienTai = z.infer<typeof NguoiDungSchema>;

export const DangNhapReqSchema = z.object({
  tenDangNhap: z.string().min(1),
  matKhau: z.string().min(1),
});
export type DangNhapReq = z.infer<typeof DangNhapReqSchema>;
```

- [ ] **Step 2: Viết test đỏ cho schema**

```ts
// src/server/db/nguoi-dung-schema.test.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nguoiDung, phien } from './schema';

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

const nguoi = (id: string, ten: string, vaiTro: string = 'NHAN_VIEN') => ({
  id,
  tenDangNhap: ten,
  tenHienThi: ten,
  matKhauBam: 'bam',
  vaiTro: vaiTro as 'ADMIN' | 'NHAN_VIEN',
});

describe('bảng nguoi_dung', () => {
  it('tên đăng nhập là duy nhất', () => {
    db.insert(nguoiDung).values(nguoi('u1', 'lan')).run();

    expect(() => db.insert(nguoiDung).values(nguoi('u2', 'lan')).run()).toThrow(/UNIQUE/i);
  });

  it('chặn vai trò ngoài ADMIN/NHAN_VIEN', () => {
    expect(() => db.insert(nguoiDung).values(nguoi('u1', 'lan', 'GIAM_DOC')).run()).toThrow(/CHECK/i);
  });

  it('chặn tên đăng nhập có chữ hoa hoặc khoảng trắng đầu/cuối', () => {
    expect(() => db.insert(nguoiDung).values(nguoi('u1', 'Lan')).run()).toThrow(/CHECK/i);
    expect(() => db.insert(nguoiDung).values(nguoi('u2', ' lan')).run()).toThrow(/CHECK/i);
  });

  it('mặc định hoạt động = true', () => {
    db.insert(nguoiDung).values(nguoi('u1', 'lan')).run();

    expect(db.select().from(nguoiDung).all()[0]?.hoatDong).toBe(true);
  });
});

describe('bảng phien', () => {
  it('phiên phải trỏ tới người dùng có thật (khoá ngoại)', () => {
    expect(() =>
      db.insert(phien).values({ idBam: 'h1', nguoiDungId: 'khong-co', hetHan: '2030-01-01T00:00:00.000Z' }).run(),
    ).toThrow(/FOREIGN KEY/i);
  });
});
```

- [ ] **Step 3: Chạy, thấy đỏ**

Run: `npx vitest run src/server/db/nguoi-dung-schema.test.ts`
Expected: FAIL — `nguoiDung`/`phien` không export từ `./schema`.

- [ ] **Step 4: Thêm bảng vào cuối `src/server/db/schema.ts`**

```ts
// Người dùng đăng nhập (đăng nhập/phân quyền, Phần 1). Không xoá cứng — khoá
// bằng `hoat_dong = false` để mọi chứng từ cũ vẫn truy được người làm.
// `ten_dang_nhap` luôn chữ thường đã trim: so khớp không phân biệt hoa/thường mà
// không cần hàm trong truy vấn.
export const nguoiDung = sqliteTable(
  'nguoi_dung',
  {
    id: text('id').primaryKey(),
    tenDangNhap: text('ten_dang_nhap').notNull().unique(),
    tenHienThi: text('ten_hien_thi').notNull(),
    matKhauBam: text('mat_khau_bam').notNull(),
    vaiTro: text('vai_tro').notNull().$type<'ADMIN' | 'NHAN_VIEN'>(),
    hoatDong: integer('hoat_dong', { mode: 'boolean' }).notNull().default(true),
    ngayTao: text('ngay_tao')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check('nguoi_dung_vai_tro_hop_le', sql`${t.vaiTro} IN ('ADMIN', 'NHAN_VIEN')`),
    check(
      'nguoi_dung_ten_dang_nhap_chu_thuong_da_trim',
      sql`length(${t.tenDangNhap}) > 0 AND ${t.tenDangNhap} = lower(trim(${t.tenDangNhap}))`,
    ),
  ],
);

// Phiên đăng nhập. Chỉ lưu SHA-256 của mã phiên: lộ DB không lộ được cookie đang dùng.
export const phien = sqliteTable('phien', {
  idBam: text('id_bam').primaryKey(),
  nguoiDungId: text('nguoi_dung_id')
    .notNull()
    .references(() => nguoiDung.id),
  hetHan: text('het_han').notNull(),
  ngayTao: text('ngay_tao')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
```

- [ ] **Step 5: Sinh migration**

Run: `npm run db:generate`
Expected: tạo thêm đúng 1 file `src/server/db/migrations/00NN_*.sql` chứa `CREATE TABLE nguoi_dung` và `CREATE TABLE phien`, cập nhật `meta/_journal.json` và thêm snapshot. Nếu drizzle-kit hỏi tương tác, dừng và báo (không đoán).

- [ ] **Step 6: Chạy, thấy xanh**

Run: `npx vitest run src/server/db`
Expected: PASS toàn bộ test trong `src/server/db` (gồm 5 test mới).

- [ ] **Step 7: Commit**

```bash
git add src/shared/hop-dong/auth.ts src/server/db/schema.ts src/server/db/nguoi-dung-schema.test.ts src/server/db/migrations
GC commit -m "Thêm bảng nguoi_dung, phien và hợp đồng auth" -m "<trailer>"
```

---

### Task 3: Tạo và tìm người dùng

**Files:**
- Create: `src/server/auth/nguoi-dung.ts`
- Test: `src/server/auth/nguoi-dung.test.ts`

**Interfaces:**
- Consumes: `bamMatKhau`, `nguoiDung` (schema), `taoUlid` (`src/shared/kieu/ulid.ts`), `NguoiDungHienTai`, `VaiTro`.
- Produces:
  - `taoNguoiDung(db: Db, dauVao: { tenDangNhap: string; tenHienThi: string; matKhau: string; vaiTro: VaiTro }): NguoiDungHienTai`
  - `timNguoiDungTheoTen(db: Db, tenDangNhap: string): { id: string; tenDangNhap: string; tenHienThi: string; matKhauBam: string; vaiTro: VaiTro; hoatDong: boolean } | undefined`
  - `chuanHoaTenDangNhap(ten: string): string`
  - lỗi: `MatKhauQuaNganError`, `TenDangNhapKhongHopLeError`, `TenDangNhapDaTonTaiError`
  - hằng `MAT_KHAU_TOI_THIEU = 8`

- [ ] **Step 1: Viết test đỏ**

```ts
// src/server/auth/nguoi-dung.test.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { kiemTraMatKhau } from './mat-khau';
import {
  MatKhauQuaNganError,
  TenDangNhapDaTonTaiError,
  TenDangNhapKhongHopLeError,
  chuanHoaTenDangNhap,
  taoNguoiDung,
  timNguoiDungTheoTen,
} from './nguoi-dung';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
});

afterEach(() => {
  sqlite.close();
});

const dauVao = { tenDangNhap: 'lan', tenHienThi: 'Chị Lan', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' as const };

describe('taoNguoiDung', () => {
  it('tạo người dùng, trả về thông tin công khai không có mật khẩu', () => {
    const nd = taoNguoiDung(db, dauVao);

    expect(nd).toEqual({ id: expect.any(String), tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN' });
    expect(JSON.stringify(nd)).not.toContain('mat-khau-dai-du');
  });

  it('lưu mật khẩu đã băm, không lưu mật khẩu gốc', () => {
    taoNguoiDung(db, dauVao);

    const hang = timNguoiDungTheoTen(db, 'lan');
    expect(hang?.matKhauBam).not.toContain('mat-khau-dai-du');
    expect(kiemTraMatKhau('mat-khau-dai-du', hang?.matKhauBam ?? '')).toBe(true);
  });

  it('chuẩn hoá tên đăng nhập: trim và chữ thường', () => {
    const nd = taoNguoiDung(db, { ...dauVao, tenDangNhap: '  Lan ' });

    expect(nd.tenDangNhap).toBe('lan');
  });

  it('từ chối mật khẩu ngắn hơn 8 ký tự', () => {
    expect(() => taoNguoiDung(db, { ...dauVao, matKhau: '1234567' })).toThrow(MatKhauQuaNganError);
  });

  it('chấp nhận mật khẩu đúng 8 ký tự', () => {
    expect(() => taoNguoiDung(db, { ...dauVao, matKhau: '12345678' })).not.toThrow();
  });

  it('từ chối tên đăng nhập rỗng hoặc có khoảng trắng ở giữa', () => {
    expect(() => taoNguoiDung(db, { ...dauVao, tenDangNhap: '   ' })).toThrow(TenDangNhapKhongHopLeError);
    expect(() => taoNguoiDung(db, { ...dauVao, tenDangNhap: 'chi lan' })).toThrow(TenDangNhapKhongHopLeError);
  });

  it('từ chối tên đã tồn tại, kể cả khác hoa/thường', () => {
    taoNguoiDung(db, dauVao);

    expect(() => taoNguoiDung(db, { ...dauVao, tenDangNhap: 'LAN' })).toThrow(TenDangNhapDaTonTaiError);
  });
});

describe('timNguoiDungTheoTen', () => {
  it('tìm không phân biệt hoa/thường và khoảng trắng', () => {
    taoNguoiDung(db, dauVao);

    expect(timNguoiDungTheoTen(db, ' LAN ')?.tenDangNhap).toBe('lan');
  });

  it('không có thì trả undefined', () => {
    expect(timNguoiDungTheoTen(db, 'khong-co')).toBeUndefined();
  });
});

describe('chuanHoaTenDangNhap', () => {
  it('trim và hạ chữ thường', () => {
    expect(chuanHoaTenDangNhap('  Admin ')).toBe('admin');
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/auth/nguoi-dung.test.ts`
Expected: FAIL — `Cannot find module './nguoi-dung'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/auth/nguoi-dung.ts
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { taoUlid } from '../../shared/kieu/ulid';
import { nguoiDung } from '../db/schema';
import { bamMatKhau } from './mat-khau';

type Db = ReturnType<typeof drizzle>;

export const MAT_KHAU_TOI_THIEU = 8;

export class MatKhauQuaNganError extends Error {
  constructor() {
    super(`Mật khẩu phải có ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`);
    this.name = 'MatKhauQuaNganError';
  }
}

export class TenDangNhapKhongHopLeError extends Error {
  constructor() {
    super('Tên đăng nhập không được rỗng và không chứa khoảng trắng');
    this.name = 'TenDangNhapKhongHopLeError';
  }
}

export class TenDangNhapDaTonTaiError extends Error {
  constructor(public readonly tenDangNhap: string) {
    super(`Tên đăng nhập "${tenDangNhap}" đã tồn tại`);
    this.name = 'TenDangNhapDaTonTaiError';
  }
}

export function chuanHoaTenDangNhap(ten: string): string {
  return ten.trim().toLowerCase();
}

export function timNguoiDungTheoTen(db: Db, tenDangNhap: string) {
  return db
    .select()
    .from(nguoiDung)
    .where(eq(nguoiDung.tenDangNhap, chuanHoaTenDangNhap(tenDangNhap)))
    .get();
}

export function taoNguoiDung(
  db: Db,
  dauVao: { tenDangNhap: string; tenHienThi: string; matKhau: string; vaiTro: VaiTro },
): NguoiDungHienTai {
  const ten = chuanHoaTenDangNhap(dauVao.tenDangNhap);
  if (ten.length === 0 || /\s/.test(ten)) throw new TenDangNhapKhongHopLeError();
  if (dauVao.matKhau.length < MAT_KHAU_TOI_THIEU) throw new MatKhauQuaNganError();
  if (timNguoiDungTheoTen(db, ten)) throw new TenDangNhapDaTonTaiError(ten);

  const id = taoUlid();
  db.insert(nguoiDung)
    .values({
      id,
      tenDangNhap: ten,
      tenHienThi: dauVao.tenHienThi.trim() || ten,
      matKhauBam: bamMatKhau(dauVao.matKhau),
      vaiTro: dauVao.vaiTro,
    })
    .run();

  return { id, tenDangNhap: ten, tenHienThi: dauVao.tenHienThi.trim() || ten, vaiTro: dauVao.vaiTro };
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/auth/nguoi-dung.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/nguoi-dung.ts src/server/auth/nguoi-dung.test.ts
GC commit -m "Tạo và tìm người dùng, chuẩn hoá tên đăng nhập" -m "<trailer>"
```

---

### Task 4: Phiên đăng nhập

**Files:**
- Create: `src/server/auth/phien.ts`
- Test: `src/server/auth/phien.test.ts`

**Interfaces:**
- Consumes: `nguoiDung`, `phien` (schema), `NguoiDungHienTai`, `taoNguoiDung` (chỉ trong test).
- Produces:
  - `THOI_HAN_PHIEN_MS = 30 * 24 * 60 * 60 * 1000`
  - `taoPhien(db, nguoiDungId: string, bay: number): { maPhien: string; hetHan: string }` — `bay` là mili-giây epoch, truyền vào để test không dùng đồng hồ thật
  - `docPhien(db, maPhien: string, bay: number): NguoiDungHienTai | undefined`
  - `xoaPhien(db, maPhien: string): void`
  - `xoaMoiPhienCua(db, nguoiDungId: string): void`

- [ ] **Step 1: Viết test đỏ**

```ts
// src/server/auth/phien.test.ts
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nguoiDung, phien } from '../db/schema';
import { taoNguoiDung } from './nguoi-dung';
import { THOI_HAN_PHIEN_MS, docPhien, taoPhien, xoaMoiPhienCua, xoaPhien } from './phien';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;
let nguoiId: string;
const T0 = Date.parse('2026-10-10T00:00:00.000Z');
const NGAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  nguoiId = taoNguoiDung(db, {
    tenDangNhap: 'lan',
    tenHienThi: 'Chị Lan',
    matKhau: 'mat-khau-dai-du',
    vaiTro: 'NHAN_VIEN',
  }).id;
});

afterEach(() => {
  sqlite.close();
});

describe('taoPhien / docPhien', () => {
  it('mã phiên tạo ra đọc lại được người dùng đúng', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    expect(docPhien(db, maPhien, T0 + 1000)).toEqual({
      id: nguoiId,
      tenDangNhap: 'lan',
      tenHienThi: 'Chị Lan',
      vaiTro: 'NHAN_VIEN',
    });
  });

  it('DB chỉ lưu bản băm, không lưu mã phiên gốc', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    const hang = db.select().from(phien).all()[0];
    expect(hang?.idBam).not.toBe(maPhien);
    expect(hang?.idBam).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hai phiên có mã khác nhau', () => {
    expect(taoPhien(db, nguoiId, T0).maPhien).not.toBe(taoPhien(db, nguoiId, T0).maPhien);
  });

  it('mã phiên lạ thì không đọc được', () => {
    expect(docPhien(db, 'khong-co-phien-nay', T0)).toBeUndefined();
  });

  it('hết hạn sau 30 ngày: không đọc được và dòng phiên bị xoá', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    expect(docPhien(db, maPhien, T0 + THOI_HAN_PHIEN_MS + 1)).toBeUndefined();
    expect(db.select().from(phien).all()).toHaveLength(0);
  });

  it('còn hạn đúng sát mốc 30 ngày thì vẫn đọc được', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    expect(docPhien(db, maPhien, T0 + THOI_HAN_PHIEN_MS - 1000)).toBeDefined();
  });

  it('gia hạn trượt: dùng sau 2 ngày thì hạn dời ra 30 ngày kể từ lúc đó', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    docPhien(db, maPhien, T0 + 2 * NGAY);

    const hang = db.select().from(phien).all()[0];
    expect(Date.parse(hang?.hetHan ?? '')).toBe(T0 + 2 * NGAY + THOI_HAN_PHIEN_MS);
  });

  it('không gia hạn khi mới dùng trong vòng 1 ngày (tránh ghi DB mỗi request)', () => {
    const { maPhien, hetHan } = taoPhien(db, nguoiId, T0);

    docPhien(db, maPhien, T0 + 60 * 60 * 1000);

    expect(db.select().from(phien).all()[0]?.hetHan).toBe(hetHan);
  });

  it('người dùng bị khoá thì phiên không còn dùng được', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);
    db.update(nguoiDung).set({ hoatDong: false }).where(eq(nguoiDung.id, nguoiId)).run();

    expect(docPhien(db, maPhien, T0 + 1000)).toBeUndefined();
  });
});

describe('xoaPhien / xoaMoiPhienCua', () => {
  it('xoaPhien xoá đúng một phiên', () => {
    const a = taoPhien(db, nguoiId, T0);
    const b = taoPhien(db, nguoiId, T0);

    xoaPhien(db, a.maPhien);

    expect(docPhien(db, a.maPhien, T0)).toBeUndefined();
    expect(docPhien(db, b.maPhien, T0)).toBeDefined();
  });

  it('xoaMoiPhienCua xoá mọi phiên của người đó', () => {
    const a = taoPhien(db, nguoiId, T0);
    const b = taoPhien(db, nguoiId, T0);

    xoaMoiPhienCua(db, nguoiId);

    expect(docPhien(db, a.maPhien, T0)).toBeUndefined();
    expect(docPhien(db, b.maPhien, T0)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/auth/phien.test.ts`
Expected: FAIL — `Cannot find module './phien'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/auth/phien.ts
import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { nguoiDung, phien } from '../db/schema';

type Db = ReturnType<typeof drizzle>;

export const THOI_HAN_PHIEN_MS = 30 * 24 * 60 * 60 * 1000;
// Chỉ ghi lại hạn mới khi đã tiêu hơn 1 ngày, để không ghi DB ở mọi request.
const NGUONG_GIA_HAN_MS = 24 * 60 * 60 * 1000;

function bamMaPhien(maPhien: string): string {
  return createHash('sha256').update(maPhien).digest('hex');
}

/** `bay` = mili-giây epoch hiện tại, truyền vào để test không phụ thuộc đồng hồ. */
export function taoPhien(db: Db, nguoiDungId: string, bay: number): { maPhien: string; hetHan: string } {
  const maPhien = randomBytes(32).toString('base64url');
  const hetHan = new Date(bay + THOI_HAN_PHIEN_MS).toISOString();
  db.insert(phien).values({ idBam: bamMaPhien(maPhien), nguoiDungId, hetHan }).run();
  return { maPhien, hetHan };
}

export function docPhien(db: Db, maPhien: string, bay: number): NguoiDungHienTai | undefined {
  const idBam = bamMaPhien(maPhien);
  const hang = db
    .select({
      hetHan: phien.hetHan,
      id: nguoiDung.id,
      tenDangNhap: nguoiDung.tenDangNhap,
      tenHienThi: nguoiDung.tenHienThi,
      vaiTro: nguoiDung.vaiTro,
    })
    .from(phien)
    .innerJoin(nguoiDung, and(eq(nguoiDung.id, phien.nguoiDungId), eq(nguoiDung.hoatDong, true)))
    .where(eq(phien.idBam, idBam))
    .get();
  if (!hang) return undefined;

  const hetHanMs = Date.parse(hang.hetHan);
  if (hetHanMs <= bay) {
    db.delete(phien).where(eq(phien.idBam, idBam)).run();
    return undefined;
  }

  if (hetHanMs - bay < THOI_HAN_PHIEN_MS - NGUONG_GIA_HAN_MS) {
    db.update(phien)
      .set({ hetHan: new Date(bay + THOI_HAN_PHIEN_MS).toISOString() })
      .where(eq(phien.idBam, idBam))
      .run();
  }

  return { id: hang.id, tenDangNhap: hang.tenDangNhap, tenHienThi: hang.tenHienThi, vaiTro: hang.vaiTro };
}

export function xoaPhien(db: Db, maPhien: string): void {
  db.delete(phien).where(eq(phien.idBam, bamMaPhien(maPhien))).run();
}

export function xoaMoiPhienCua(db: Db, nguoiDungId: string): void {
  db.delete(phien).where(eq(phien.nguoiDungId, nguoiDungId)).run();
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/auth/phien.test.ts`
Expected: PASS (11 test).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/phien.ts src/server/auth/phien.test.ts
GC commit -m "Phiên đăng nhập lưu băm, gia hạn trượt 30 ngày" -m "<trailer>"
```

---

### Task 5: Giới hạn đăng nhập sai

**Files:**
- Create: `src/server/auth/gioi-han-dang-nhap.ts`
- Test: `src/server/auth/gioi-han-dang-nhap.test.ts`

**Interfaces:**
- Produces: `taoGioiHanDangNhap(tuyChon?: { toiDa?: number; cuaSoMs?: number }): GioiHanDangNhap` với
  `interface GioiHanDangNhap { kiemTra(khoa: string, bay: number): { duocPhep: true } | { duocPhep: false; thuLaiSauGiay: number }; ghiThatBai(khoa: string, bay: number): void; xoa(khoa: string): void }`.
  Mặc định `toiDa = 5`, `cuaSoMs = 15 * 60 * 1000`. Lưu trong bộ nhớ.

- [ ] **Step 1: Viết test đỏ**

```ts
// src/server/auth/gioi-han-dang-nhap.test.ts
import { describe, expect, it } from 'vitest';
import { taoGioiHanDangNhap } from './gioi-han-dang-nhap';

const T0 = 1_000_000;
const PHUT = 60 * 1000;

describe('taoGioiHanDangNhap', () => {
  it('cho phép khi chưa thất bại lần nào', () => {
    expect(taoGioiHanDangNhap().kiemTra('lan|1.2.3.4', T0)).toEqual({ duocPhep: true });
  });

  it('vẫn cho phép sau 4 lần sai, chặn từ lần sai thứ 5', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 4; i++) gh.ghiThatBai('lan|1.2.3.4', T0);
    expect(gh.kiemTra('lan|1.2.3.4', T0).duocPhep).toBe(true);

    gh.ghiThatBai('lan|1.2.3.4', T0);

    expect(gh.kiemTra('lan|1.2.3.4', T0).duocPhep).toBe(false);
  });

  it('báo số giây phải chờ tính từ lần sai sớm nhất còn trong cửa sổ', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 5; i++) gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0 + 5 * PHUT)).toEqual({ duocPhep: false, thuLaiSauGiay: 10 * 60 });
  });

  it('hết 15 phút thì cho thử lại', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 5; i++) gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0 + 15 * PHUT).duocPhep).toBe(true);
  });

  it('khoá khác nhau không ảnh hưởng nhau', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 5; i++) gh.ghiThatBai('lan|1.1.1.1', T0);

    expect(gh.kiemTra('lan|2.2.2.2', T0).duocPhep).toBe(true);
    expect(gh.kiemTra('minh|1.1.1.1', T0).duocPhep).toBe(true);
  });

  it('đăng nhập thành công (xoa) đặt lại bộ đếm', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 4; i++) gh.ghiThatBai('k', T0);

    gh.xoa('k');
    gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0).duocPhep).toBe(true);
  });

  it('tuỳ chọn toiDa và cuaSoMs được tôn trọng', () => {
    const gh = taoGioiHanDangNhap({ toiDa: 2, cuaSoMs: PHUT });
    gh.ghiThatBai('k', T0);
    gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0).duocPhep).toBe(false);
    expect(gh.kiemTra('k', T0 + PHUT).duocPhep).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/auth/gioi-han-dang-nhap.test.ts`
Expected: FAIL — `Cannot find module './gioi-han-dang-nhap'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/auth/gioi-han-dang-nhap.ts
export interface GioiHanDangNhap {
  kiemTra(khoa: string, bay: number): { duocPhep: true } | { duocPhep: false; thuLaiSauGiay: number };
  ghiThatBai(khoa: string, bay: number): void;
  xoa(khoa: string): void;
}

/**
 * Chặn dò mật khẩu: quá `toiDa` lần sai trong `cuaSoMs` thì từ chối cho tới khi lần
 * sai sớm nhất rời khỏi cửa sổ. Khoá là "tenDangNhap|ip" — khoá theo riêng tên sẽ cho
 * kẻ lạ khoá người thật. Lưu trong bộ nhớ: khởi động lại thì đặt lại, chấp nhận được.
 */
export function taoGioiHanDangNhap(tuyChon: { toiDa?: number; cuaSoMs?: number } = {}): GioiHanDangNhap {
  const toiDa = tuyChon.toiDa ?? 5;
  const cuaSoMs = tuyChon.cuaSoMs ?? 15 * 60 * 1000;
  const thatBai = new Map<string, number[]>();

  function conTrongCuaSo(khoa: string, bay: number): number[] {
    const con = (thatBai.get(khoa) ?? []).filter((t) => bay - t < cuaSoMs);
    if (con.length === 0) thatBai.delete(khoa);
    else thatBai.set(khoa, con);
    return con;
  }

  return {
    kiemTra(khoa, bay) {
      const con = conTrongCuaSo(khoa, bay);
      if (con.length < toiDa) return { duocPhep: true };
      const somNhat = con[0] ?? bay;
      return { duocPhep: false, thuLaiSauGiay: Math.ceil((somNhat + cuaSoMs - bay) / 1000) };
    },
    ghiThatBai(khoa, bay) {
      const con = conTrongCuaSo(khoa, bay);
      con.push(bay);
      thatBai.set(khoa, con);
    },
    xoa(khoa) {
      thatBai.delete(khoa);
    },
  };
}
```


- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/auth/gioi-han-dang-nhap.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/gioi-han-dang-nhap.ts src/server/auth/gioi-han-dang-nhap.test.ts
GC commit -m "Giới hạn đăng nhập sai theo cặp tên và IP" -m "<trailer>"
```

---

### Task 6: Chống CSRF theo Origin

**Files:**
- Create: `src/server/auth/chong-csrf.ts`
- Test: `src/server/auth/chong-csrf.test.ts`

**Interfaces:**
- Produces: `chongCsrf(originChoPhep: readonly string[]): MiddlewareHandler` (Hono). Request GET/HEAD/OPTIONS luôn qua. Request ghi: không có `Origin` → qua; có `Origin` → qua nếu `new URL(origin).host` bằng `X-Forwarded-Host` (nếu có) hoặc `Host`, hoặc `origin` nằm trong `originChoPhep`; còn lại `403 { loi: 'Nguồn gốc request không hợp lệ' }`.

- [ ] **Step 1: Viết test đỏ**

```ts
// src/server/auth/chong-csrf.test.ts
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
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/auth/chong-csrf.test.ts`
Expected: FAIL — `Cannot find module './chong-csrf'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/auth/chong-csrf.ts
import type { MiddlewareHandler } from 'hono';

const PHUONG_THUC_AN_TOAN = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Lớp phòng thủ CSRF thứ hai bên cạnh cookie `SameSite=Lax`: request ghi từ trình
 * duyệt luôn mang `Origin`; nếu nó không cùng host với app và không nằm trong danh
 * sách cho phép thì từ chối. Request không có `Origin` (curl, máy chủ khác) không
 * phải CSRF — kẻ tấn công qua trình duyệt nạn nhân không bỏ được header này.
 */
export function chongCsrf(originChoPhep: readonly string[]): MiddlewareHandler {
  return async (c, next) => {
    if (PHUONG_THUC_AN_TOAN.has(c.req.method)) return next();

    const origin = c.req.header('Origin');
    if (origin === undefined) return next();
    if (originChoPhep.includes(origin)) return next();

    const hostApp = c.req.header('X-Forwarded-Host') ?? c.req.header('Host');
    let hostOrigin: string | undefined;
    try {
      hostOrigin = new URL(origin).host;
    } catch {
      hostOrigin = undefined;
    }
    if (hostOrigin !== undefined && hostApp !== undefined && hostOrigin === hostApp) return next();

    return c.json({ loi: 'Nguồn gốc request không hợp lệ' }, 403);
  };
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/auth/chong-csrf.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/chong-csrf.ts src/server/auth/chong-csrf.test.ts
GC commit -m "Chặn CSRF bằng kiểm Origin cho request ghi" -m "<trailer>"
```

---

### Task 7: Bảng quyền và middleware xác thực

**Files:**
- Create: `src/server/auth/phan-quyen.ts`
- Test: `src/server/auth/phan-quyen.test.ts`

**Interfaces:**
- Consumes: `docPhien`, `NguoiDungHienTai`, `VaiTro`.
- Produces:
  - `type MucQuyen = 'CONG_KHAI' | 'DA_DANG_NHAP' | 'NHAN_VIEN' | 'ADMIN'` (`NHAN_VIEN` = vai trò tối thiểu: nhân viên **và** admin dùng được)
  - `layMucQuyen(phuongThuc: string, duongDan: string): MucQuyen`
  - `TEN_COOKIE_PHIEN = 'phien'`
  - `type BienHono = { Variables: { nguoiDung: NguoiDungHienTai } }`
  - `batXacThuc(db: Db, bayGio: () => number): MiddlewareHandler<BienHono>`: bắt cookie `phien`, `401 { loi: 'Chưa đăng nhập' }` / `403 { loi: 'Không đủ quyền' }`, gắn `c.set('nguoiDung', …)`.

- [ ] **Step 1: Viết test đỏ — ma trận quyền**

```ts
// src/server/auth/phan-quyen.test.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { taoNguoiDung } from './nguoi-dung';
import { type BienHono, TEN_COOKIE_PHIEN, batXacThuc, layMucQuyen } from './phan-quyen';
import { taoPhien } from './phien';

describe('layMucQuyen — bảng quyền', () => {
  it.each([
    ['GET', '/api/suc-khoe', 'CONG_KHAI'],
    ['POST', '/api/auth/dang-nhap', 'CONG_KHAI'],
    ['OPTIONS', '/api/hoa-don', 'CONG_KHAI'],
    ['GET', '/api/auth/toi', 'DA_DANG_NHAP'],
    ['POST', '/api/auth/dang-xuat', 'DA_DANG_NHAP'],
    ['POST', '/api/hoa-don', 'NHAN_VIEN'],
    ['POST', '/api/dong-bo', 'NHAN_VIEN'],
    ['GET', '/api/hang-hoa', 'NHAN_VIEN'],
    ['GET', '/api/tra-hang', 'NHAN_VIEN'],
    ['GET', '/api/tra-hang/hoa-don/HD000001', 'NHAN_VIEN'],
    ['POST', '/api/tra-hang', 'NHAN_VIEN'],
    ['GET', '/api/hoa-don/HD000001', 'NHAN_VIEN'],
  ] as const)('%s %s → %s', (phuongThuc, duongDan, mong) => {
    expect(layMucQuyen(phuongThuc, duongDan)).toBe(mong);
  });

  it.each([
    ['GET', '/api/hang-hoa/sp-1'],
    ['POST', '/api/hang-hoa'],
    ['PUT', '/api/hang-hoa/sp-1'],
    ['DELETE', '/api/hang-hoa/sp-1'],
    ['POST', '/api/hang-hoa/sp-1/ngung-hoat-dong'],
    ['PUT', '/api/hang-hoa/sp-1/quan-ly-lo'],
    ['GET', '/api/phieu-nhap'],
    ['POST', '/api/phieu-nhap'],
    ['POST', '/api/phieu-nhap/tu-excel'],
    ['GET', '/api/tra-hang-nhap'],
    ['POST', '/api/tra-hang-nhap'],
    ['GET', '/api/tong-quan/canh-bao-lech-kho'],
    ['GET', '/api/cai-dat/quan-ly-lo'],
    ['PUT', '/api/cai-dat/quan-ly-lo'],
  ])('%s %s chỉ ADMIN', (phuongThuc, duongDan) => {
    expect(layMucQuyen(phuongThuc, duongDan)).toBe('ADMIN');
  });

  it('route không có trong bảng thì mặc định chỉ ADMIN (chặn mặc định)', () => {
    expect(layMucQuyen('GET', '/api/chua-co-gi-ca')).toBe('ADMIN');
    expect(layMucQuyen('DELETE', '/api/hoa-don/HD000001')).toBe('ADMIN');
  });

  it('không bị lừa bằng đường dẫn có tiền tố giống', () => {
    expect(layMucQuyen('GET', '/api/hang-hoa-bi-mat')).toBe('ADMIN');
    expect(layMucQuyen('POST', '/api/hoa-don-gia')).toBe('ADMIN');
  });
});

describe('batXacThuc', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  let admin: NguoiDungHienTai;
  let nhanVien: NguoiDungHienTai;
  const T0 = Date.parse('2026-10-10T00:00:00.000Z');

  function taoApp() {
    const app = new Hono<BienHono>();
    app.use('/api/*', batXacThuc(db, () => T0 + 1000));
    app.all('/api/*', (c) => c.json({ ai: c.get('nguoiDung')?.tenDangNhap ?? null }));
    return app;
  }

  function cookieCua(nguoi: NguoiDungHienTai): string {
    return `${TEN_COOKIE_PHIEN}=${taoPhien(db, nguoi.id, T0).maPhien}`;
  }

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './src/server/db/migrations' });
    admin = taoNguoiDung(db, { tenDangNhap: 'admin', tenHienThi: 'Admin', matKhau: 'mat-khau-dai-du', vaiTro: 'ADMIN' });
    nhanVien = taoNguoiDung(db, { tenDangNhap: 'lan', tenHienThi: 'Lan', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' });
  });

  afterEach(() => {
    sqlite.close();
  });

  it('đường công khai không cần cookie', async () => {
    const res = await taoApp().request('/api/suc-khoe');

    expect(res.status).toBe(200);
  });

  it('chưa đăng nhập vào đường cần quyền thì 401', async () => {
    const res = await taoApp().request('/api/hang-hoa');

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ loi: 'Chưa đăng nhập' });
  });

  it('cookie phiên rác thì 401', async () => {
    const res = await taoApp().request('/api/hang-hoa', { headers: { Cookie: `${TEN_COOKIE_PHIEN}=rac` } });

    expect(res.status).toBe(401);
  });

  it('nhân viên vào đường nhân viên được và route đọc được người dùng', async () => {
    const res = await taoApp().request('/api/hang-hoa', { headers: { Cookie: cookieCua(nhanVien) } });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ai: 'lan' });
  });

  it('nhân viên vào đường admin thì 403', async () => {
    const res = await taoApp().request('/api/phieu-nhap', { headers: { Cookie: cookieCua(nhanVien) } });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ loi: 'Không đủ quyền' });
  });

  it('admin vào được cả đường nhân viên lẫn đường admin', async () => {
    const cookie = cookieCua(admin);
    const app = taoApp();

    expect((await app.request('/api/hang-hoa', { headers: { Cookie: cookie } })).status).toBe(200);
    expect((await app.request('/api/phieu-nhap', { headers: { Cookie: cookie } })).status).toBe(200);
  });

  it('route chưa khai báo: nhân viên 403, admin 200', async () => {
    const app = taoApp();

    expect((await app.request('/api/chua-co-gi-ca', { headers: { Cookie: cookieCua(nhanVien) } })).status).toBe(403);
    expect((await app.request('/api/chua-co-gi-ca', { headers: { Cookie: cookieCua(admin) } })).status).toBe(200);
  });

  it('DA_DANG_NHAP: cả hai vai trò đều vào được, chưa đăng nhập thì 401', async () => {
    const app = taoApp();

    expect((await app.request('/api/auth/toi', { headers: { Cookie: cookieCua(nhanVien) } })).status).toBe(200);
    expect((await app.request('/api/auth/toi')).status).toBe(401);
  });

  it('người dùng bị khoá thì cookie cũ không còn dùng được', async () => {
    const cookie = cookieCua(nhanVien);
    sqlite.prepare('UPDATE nguoi_dung SET hoat_dong = 0 WHERE id = ?').run(nhanVien.id);

    const res = await taoApp().request('/api/hang-hoa', { headers: { Cookie: cookie } });

    expect(res.status).toBe(401);
  });
});
```


- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/auth/phan-quyen.test.ts`
Expected: FAIL — `Cannot find module './phan-quyen'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/auth/phan-quyen.ts
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { docPhien } from './phien';

type Db = ReturnType<typeof drizzle>;

export const TEN_COOKIE_PHIEN = 'phien';

export type BienHono = { Variables: { nguoiDung: NguoiDungHienTai } };

/**
 * `NHAN_VIEN` là vai trò TỐI THIỂU: nhân viên và admin đều dùng được.
 * `ADMIN` chỉ admin. `DA_DANG_NHAP` là mọi vai trò nhưng phải có phiên.
 */
export type MucQuyen = 'CONG_KHAI' | 'DA_DANG_NHAP' | 'NHAN_VIEN' | 'ADMIN';

interface QuyTac {
  phuongThuc: readonly string[];
  mau: RegExp;
  muc: MucQuyen;
}

// Khớp theo thứ tự, quy tắc đầu tiên thắng. Mẫu neo `^…$` để `/api/hang-hoa-bi-mat`
// không lọt vào quy tắc của `/api/hang-hoa`. Không khớp quy tắc nào → ADMIN.
const BANG_QUYEN: readonly QuyTac[] = [
  { phuongThuc: ['OPTIONS'], mau: /^\/api\/.*$/, muc: 'CONG_KHAI' },
  { phuongThuc: ['GET'], mau: /^\/api\/suc-khoe$/, muc: 'CONG_KHAI' },
  { phuongThuc: ['POST'], mau: /^\/api\/auth\/dang-nhap$/, muc: 'CONG_KHAI' },
  { phuongThuc: ['GET'], mau: /^\/api\/auth\/toi$/, muc: 'DA_DANG_NHAP' },
  { phuongThuc: ['POST'], mau: /^\/api\/auth\/dang-xuat$/, muc: 'DA_DANG_NHAP' },
  // Bán hàng và đồng bộ offline.
  { phuongThuc: ['POST'], mau: /^\/api\/hoa-don$/, muc: 'NHAN_VIEN' },
  { phuongThuc: ['GET'], mau: /^\/api\/hoa-don(\/[^/]+)?$/, muc: 'NHAN_VIEN' },
  { phuongThuc: ['POST'], mau: /^\/api\/dong-bo$/, muc: 'NHAN_VIEN' },
  // Tìm hàng khi bán — chỉ danh sách, không có chi tiết hàng.
  { phuongThuc: ['GET'], mau: /^\/api\/hang-hoa$/, muc: 'NHAN_VIEN' },
  // Trả hàng bán (tra cứu hoá đơn + tạo phiếu).
  { phuongThuc: ['GET', 'POST'], mau: /^\/api\/tra-hang(\/.*)?$/, muc: 'NHAN_VIEN' },
];

export function layMucQuyen(phuongThuc: string, duongDan: string): MucQuyen {
  const pt = phuongThuc.toUpperCase();
  for (const quyTac of BANG_QUYEN) {
    if (quyTac.phuongThuc.includes(pt) && quyTac.mau.test(duongDan)) return quyTac.muc;
  }
  return 'ADMIN';
}

export function batXacThuc(db: Db, bayGio: () => number): MiddlewareHandler<BienHono> {
  return async (c, next) => {
    const muc = layMucQuyen(c.req.method, c.req.path);
    if (muc === 'CONG_KHAI') return next();

    const maPhien = getCookie(c, TEN_COOKIE_PHIEN);
    const nguoiDung = maPhien ? docPhien(db, maPhien, bayGio()) : undefined;
    if (!nguoiDung) return c.json({ loi: 'Chưa đăng nhập' }, 401);

    if (muc === 'ADMIN' && nguoiDung.vaiTro !== 'ADMIN') return c.json({ loi: 'Không đủ quyền' }, 403);

    c.set('nguoiDung', nguoiDung);
    return next();
  };
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/auth/phan-quyen.test.ts`
Expected: PASS (toàn bộ).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/phan-quyen.ts src/server/auth/phan-quyen.test.ts
GC commit -m "Bảng quyền chặn mặc định và middleware xác thực" -m "<trailer>"
```

---

### Task 8: Route đăng nhập, đăng xuất, người dùng hiện tại

**Files:**
- Create: `src/server/api/auth.ts`
- Test: `src/server/api/auth.test.ts`

**Interfaces:**
- Consumes: `DangNhapReqSchema`, `NguoiDungSchema`, `timNguoiDungTheoTen`, `kiemTraMatKhau`, `BAM_GIA`, `taoPhien`, `xoaPhien`, `GioiHanDangNhap`, `TEN_COOKIE_PHIEN`, `BienHono`, `THOI_HAN_PHIEN_MS`.
- Produces: `dangKyAuthRoutes(app: Hono<BienHono>, db: Db, tuyChon: { gioiHan: GioiHanDangNhap; bayGio: () => number }): void` gắn `POST /dang-nhap`, `POST /dang-xuat`, `GET /toi`. Giả định mount ở `/api/auth` và middleware `batXacThuc` đã chạy trước (route `toi`/`dang-xuat` đọc `c.get('nguoiDung')`).
- Phản hồi: `200` `NguoiDungSchema` (đăng nhập, toi); `204` (đăng xuất); `400 { loi }` (sai dạng); `401 { loi: 'Sai tên đăng nhập hoặc mật khẩu' }`; `429 { loi }` + `Retry-After`.

- [ ] **Step 1: Viết test đỏ**

```ts
// src/server/api/auth.test.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { taoGioiHanDangNhap } from '../auth/gioi-han-dang-nhap';
import { taoNguoiDung } from '../auth/nguoi-dung';
import { type BienHono, batXacThuc } from '../auth/phan-quyen';
import { dangKyAuthRoutes } from './auth';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;
let bay: number;

function taoApp() {
  const app = new Hono<BienHono>();
  app.use('/api/*', batXacThuc(db, () => bay));
  const router = new Hono<BienHono>();
  dangKyAuthRoutes(router, db, { gioiHan: taoGioiHanDangNhap(), bayGio: () => bay });
  app.route('/api/auth', router);
  return app;
}

function dangNhap(app: Hono<BienHono>, tenDangNhap: string, matKhau: string, headers: Record<string, string> = {}) {
  return app.request('/api/auth/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ tenDangNhap, matKhau }),
  });
}

function layCookiePhien(res: Response): string {
  const setCookie = res.headers.get('Set-Cookie') ?? '';
  return setCookie.split(';')[0] ?? '';
}

beforeEach(() => {
  bay = Date.parse('2026-10-10T00:00:00.000Z');
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  taoNguoiDung(db, { tenDangNhap: 'lan', tenHienThi: 'Chị Lan', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' });
});

afterEach(() => {
  sqlite.close();
});

describe('POST /api/auth/dang-nhap', () => {
  it('đúng tên và mật khẩu: 200, trả người dùng (không có mật khẩu) và đặt cookie phiên', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: expect.any(String),
      tenDangNhap: 'lan',
      tenHienThi: 'Chị Lan',
      vaiTro: 'NHAN_VIEN',
    });
    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toMatch(/^phien=[^;]+/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=2592000/);
  });

  it('tên đăng nhập không phân biệt hoa/thường', async () => {
    const res = await dangNhap(taoApp(), 'LAN', 'mat-khau-dai-du');

    expect(res.status).toBe(200);
  });

  it('cookie không có Secure khi chạy http thuần', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du');

    expect(res.headers.get('Set-Cookie')).not.toMatch(/Secure/i);
  });

  it('cookie có Secure khi đứng sau proxy https (X-Forwarded-Proto)', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du', { 'X-Forwarded-Proto': 'https' });

    expect(res.headers.get('Set-Cookie')).toMatch(/Secure/i);
  });

  it('cookie có Secure khi Cloudflare báo scheme https (CF-Visitor)', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du', { 'CF-Visitor': '{"scheme":"https"}' });

    expect(res.headers.get('Set-Cookie')).toMatch(/Secure/i);
  });

  it('sai mật khẩu và tên không tồn tại cho cùng một phản hồi 401, không đặt cookie', async () => {
    const app = taoApp();

    const saiMatKhau = await dangNhap(app, 'lan', 'sai-mat-khau-xyz');
    const khongCoTen = await dangNhap(app, 'khong-co', 'sai-mat-khau-xyz');

    expect(saiMatKhau.status).toBe(401);
    expect(khongCoTen.status).toBe(401);
    expect(await saiMatKhau.json()).toEqual({ loi: 'Sai tên đăng nhập hoặc mật khẩu' });
    expect(await khongCoTen.json()).toEqual({ loi: 'Sai tên đăng nhập hoặc mật khẩu' });
    expect(saiMatKhau.headers.get('Set-Cookie')).toBeNull();
  });

  it('tài khoản bị khoá không đăng nhập được dù đúng mật khẩu', async () => {
    sqlite.prepare("UPDATE nguoi_dung SET hoat_dong = 0 WHERE ten_dang_nhap = 'lan'").run();

    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du');

    expect(res.status).toBe(401);
  });

  it('thiếu trường hoặc body không phải JSON thì 400', async () => {
    const app = taoApp();

    const thieu = await app.request('/api/auth/dang-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenDangNhap: 'lan' }),
    });
    const khongPhaiJson = await app.request('/api/auth/dang-nhap', { method: 'POST', body: 'xin chao' });

    expect(thieu.status).toBe(400);
    expect(khongPhaiJson.status).toBe(400);
  });

  it('sai 5 lần liên tiếp thì lần thứ 6 bị 429 kèm Retry-After, kể cả khi đúng mật khẩu', async () => {
    const app = taoApp();
    for (let i = 0; i < 5; i++) await dangNhap(app, 'lan', 'sai-mat-khau-xyz');

    const res = await dangNhap(app, 'lan', 'mat-khau-dai-du');

    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('bị chặn theo cặp (tên, IP): IP khác vẫn đăng nhập được', async () => {
    const app = taoApp();
    for (let i = 0; i < 5; i++) await dangNhap(app, 'lan', 'sai-mat-khau-xyz', { 'CF-Connecting-IP': '1.1.1.1' });

    const res = await dangNhap(app, 'lan', 'mat-khau-dai-du', { 'CF-Connecting-IP': '2.2.2.2' });

    expect(res.status).toBe(200);
  });

  it('đăng nhập thành công đặt lại bộ đếm sai', async () => {
    const app = taoApp();
    for (let i = 0; i < 4; i++) await dangNhap(app, 'lan', 'sai-mat-khau-xyz');
    await dangNhap(app, 'lan', 'mat-khau-dai-du');

    const res = await dangNhap(app, 'lan', 'sai-mat-khau-xyz');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/toi và POST /api/auth/dang-xuat', () => {
  it('có cookie hợp lệ thì /toi trả người dùng hiện tại', async () => {
    const app = taoApp();
    const cookie = layCookiePhien(await dangNhap(app, 'lan', 'mat-khau-dai-du'));

    const res = await app.request('/api/auth/toi', { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tenDangNhap: 'lan', vaiTro: 'NHAN_VIEN' });
  });

  it('không có cookie thì /toi trả 401', async () => {
    const res = await taoApp().request('/api/auth/toi');

    expect(res.status).toBe(401);
  });

  it('đăng xuất: 204, xoá cookie, và cookie cũ không còn dùng được', async () => {
    const app = taoApp();
    const cookie = layCookiePhien(await dangNhap(app, 'lan', 'mat-khau-dai-du'));

    const res = await app.request('/api/auth/dang-xuat', { method: 'POST', headers: { Cookie: cookie } });

    expect(res.status).toBe(204);
    expect(res.headers.get('Set-Cookie')).toMatch(/phien=;/);
    const sau = await app.request('/api/auth/toi', { headers: { Cookie: cookie } });
    expect(sau.status).toBe(401);
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/api/auth.test.ts`
Expected: FAIL — `Cannot find module './auth'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/api/auth.ts
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Context, Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { DangNhapReqSchema } from '../../shared/hop-dong/auth';
import type { GioiHanDangNhap } from '../auth/gioi-han-dang-nhap';
import { BAM_GIA, kiemTraMatKhau } from '../auth/mat-khau';
import { chuanHoaTenDangNhap, timNguoiDungTheoTen } from '../auth/nguoi-dung';
import { type BienHono, TEN_COOKIE_PHIEN } from '../auth/phan-quyen';
import { THOI_HAN_PHIEN_MS, taoPhien, xoaPhien } from '../auth/phien';

type Db = ReturnType<typeof drizzle>;

const LOI_DANG_NHAP = 'Sai tên đăng nhập hoặc mật khẩu';

/** Đứng sau Cloudflare/proxy nên đọc scheme từ header proxy để đặt cờ `Secure` đúng. */
function laHttps(c: Context): boolean {
  if (c.req.header('X-Forwarded-Proto')?.split(',')[0]?.trim() === 'https') return true;
  if (c.req.header('CF-Visitor')?.includes('"scheme":"https"')) return true;
  return new URL(c.req.url).protocol === 'https:';
}

function layIp(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'khong-ro'
  );
}

export function dangKyAuthRoutes(
  app: Hono<BienHono>,
  db: Db,
  tuyChon: { gioiHan: GioiHanDangNhap; bayGio: () => number },
): void {
  const { gioiHan, bayGio } = tuyChon;

  app.post('/dang-nhap', async (c) => {
    const than = DangNhapReqSchema.safeParse(await c.req.json().catch(() => null));
    if (!than.success) return c.json({ loi: 'Dữ liệu không hợp lệ' }, 400);

    const ten = chuanHoaTenDangNhap(than.data.tenDangNhap);
    const khoa = `${ten}|${layIp(c)}`;
    const kiemTra = gioiHan.kiemTra(khoa, bayGio());
    if (!kiemTra.duocPhep) {
      c.header('Retry-After', String(kiemTra.thuLaiSauGiay));
      return c.json({ loi: 'Đăng nhập sai quá nhiều lần, thử lại sau' }, 429);
    }

    const nguoi = timNguoiDungTheoTen(db, ten);
    // Luôn chạy đúng một lần scrypt, có tên hay không, để thời gian trả lời đồng đều.
    const matKhauDung = kiemTraMatKhau(than.data.matKhau, nguoi?.matKhauBam ?? BAM_GIA);
    if (!nguoi || !matKhauDung || !nguoi.hoatDong) {
      gioiHan.ghiThatBai(khoa, bayGio());
      return c.json({ loi: LOI_DANG_NHAP }, 401);
    }

    gioiHan.xoa(khoa);
    const { maPhien } = taoPhien(db, nguoi.id, bayGio());
    setCookie(c, TEN_COOKIE_PHIEN, maPhien, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      secure: laHttps(c),
      maxAge: THOI_HAN_PHIEN_MS / 1000,
    });
    return c.json(
      { id: nguoi.id, tenDangNhap: nguoi.tenDangNhap, tenHienThi: nguoi.tenHienThi, vaiTro: nguoi.vaiTro },
      200,
    );
  });

  app.post('/dang-xuat', (c) => {
    const maPhien = getCookie(c, TEN_COOKIE_PHIEN);
    if (maPhien) xoaPhien(db, maPhien);
    deleteCookie(c, TEN_COOKIE_PHIEN, { path: '/' });
    return c.body(null, 204);
  });

  app.get('/toi', (c) => c.json(c.get('nguoiDung'), 200));
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/api/auth.test.ts`
Expected: PASS (14 test). Nếu `Set-Cookie` của `deleteCookie` không khớp `/phien=;/`, in ra giá trị thật và sửa **regex trong test** cho khớp định dạng hono (giá trị phải rỗng + `Max-Age=0`), không sửa hành vi.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/auth.ts src/server/api/auth.test.ts
GC commit -m "Route đăng nhập, đăng xuất và người dùng hiện tại" -m "<trailer>"
```

---

### Task 9: Gắn xác thực vào `taoApp`

`taoApp` được dùng đúng ba nơi: `app.ts`, `app.test.ts`, `index.ts` — nên **bật xác thực mặc định** (an toàn mặc định) và cập nhật test cũ.

**Files:**
- Modify: `src/server/app.ts`
- Modify: `src/server/app.test.ts`

**Interfaces:**
- Consumes: `chongCsrf`, `batXacThuc`, `BienHono`, `dangKyAuthRoutes`, `taoGioiHanDangNhap`.
- Produces: `TuyChonApp` thêm `bayGio?: () => number` (mặc định `Date.now`). `taoApp(db, tuyChon)` trả `Hono<BienHono>`. Thứ tự middleware trong `/api/*`: CORS (nếu có) → `chongCsrf(corsOrigins)` → `batXacThuc`. CORS thêm `credentials: true`.

- [ ] **Step 1: Viết test đỏ — thêm vào `src/server/app.test.ts`**

Thêm import và helper ở đầu file (cạnh import hiện có):

```ts
import { taoNguoiDung } from './auth/nguoi-dung';
```

Thêm helper dưới `afterEach`:

```ts
async function dangNhapLayCookie(app: ReturnType<typeof taoApp>, vaiTro: 'ADMIN' | 'NHAN_VIEN'): Promise<string> {
  taoNguoiDung(db, { tenDangNhap: 'nguoi-test', tenHienThi: 'Người test', matKhau: 'mat-khau-dai-du', vaiTro });
  const res = await app.request('/api/auth/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenDangNhap: 'nguoi-test', matKhau: 'mat-khau-dai-du' }),
  });
  return (res.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
}
```

Sửa các test cũ chạm route cần quyền (`/api/hang-hoa`, `/api/cai-dat/...`): đăng nhập admin trước và gửi `Cookie`. Ví dụ test `mount đúng route con của hang-hoa`:

```ts
const app = taoApp(db);
const cookie = await dangNhapLayCookie(app, 'ADMIN');

const res = await app.request('/api/hang-hoa', { headers: { Cookie: cookie } });
```

(Áp dụng cùng cách cho test `cai-dat` và các lời gọi `app.request('/api/hang-hoa'…)` khác trong file; test `suc-khoe` và các test CORS gọi `/api/suc-khoe` không cần cookie.) Sửa test preflight `OPTIONS /api/hoa-don` — vẫn đúng vì `OPTIONS` là công khai. Thêm test mới cuối file:

```ts
describe('xác thực bật sẵn trong taoApp', () => {
  it('chưa đăng nhập: mọi route nghiệp vụ trả 401', async () => {
    const app = taoApp(db);

    for (const duongDan of ['/api/hang-hoa', '/api/phieu-nhap', '/api/tong-quan/canh-bao-lech-kho', '/api/cai-dat/quan-ly-lo']) {
      const res = await app.request(duongDan);
      expect(res.status, duongDan).toBe(401);
    }
  });

  it('/api/suc-khoe vẫn công khai', async () => {
    expect((await taoApp(db).request('/api/suc-khoe')).status).toBe(200);
  });

  it('đăng nhập qua taoApp rồi dùng cookie gọi được /api/auth/toi', async () => {
    const app = taoApp(db);
    const cookie = await dangNhapLayCookie(app, 'NHAN_VIEN');

    const res = await app.request('/api/auth/toi', { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tenDangNhap: 'nguoi-test', vaiTro: 'NHAN_VIEN' });
  });

  it('nhân viên: vào được hàng hoá (tìm hàng), bị 403 ở nhập hàng', async () => {
    const app = taoApp(db);
    const cookie = await dangNhapLayCookie(app, 'NHAN_VIEN');

    expect((await app.request('/api/hang-hoa', { headers: { Cookie: cookie } })).status).toBe(200);
    expect((await app.request('/api/phieu-nhap', { headers: { Cookie: cookie } })).status).toBe(403);
  });

  it('POST với Origin lạ bị CSRF chặn 403 trước cả đăng nhập', async () => {
    const res = await taoApp(db).request('/api/auth/dang-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://ke-xau.example', Host: 'quaythuoc.dev2sec.io.vn' },
      body: JSON.stringify({ tenDangNhap: 'a', matKhau: 'b' }),
    });

    expect(res.status).toBe(403);
  });

  it('CORS cho phép gửi cookie chéo origin (credentials)', async () => {
    const origin = 'https://quaythuoc.dev2sec.io.vn';
    const res = await taoApp(db, { corsOrigins: [origin] }).request('/api/suc-khoe', { headers: { Origin: origin } });

    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/app.test.ts`
Expected: FAIL — route `/api/auth/*` chưa mount, các route nghiệp vụ trả 200 thay vì 401, thiếu header credentials.

- [ ] **Step 3: Sửa `src/server/app.ts`**

Thêm import:

```ts
import { chongCsrf } from './auth/chong-csrf';
import { taoGioiHanDangNhap } from './auth/gioi-han-dang-nhap';
import { type BienHono, batXacThuc } from './auth/phan-quyen';
import { dangKyAuthRoutes } from './api/auth';
```

Thêm vào `TuyChonApp`:

```ts
  /** Đồng hồ (mili-giây epoch) — test truyền vào để kiểm hạn phiên. Mặc định `Date.now`. */
  bayGio?: () => number;
```

Thay đầu thân hàm `taoApp`:

```ts
export function taoApp(db: Db, tuyChon: TuyChonApp = {}) {
  const app = new Hono<BienHono>();
  const corsOrigins = tuyChon.corsOrigins ?? [];
  const bayGio = tuyChon.bayGio ?? Date.now;

  if (corsOrigins.length > 0) {
    app.use('/api/*', cors({ origin: [...corsOrigins], credentials: true }));
  }
  app.use('/api/*', chongCsrf(corsOrigins));
  app.use('/api/*', batXacThuc(db, bayGio));

  const authRouter = new Hono<BienHono>();
  dangKyAuthRoutes(authRouter, db, { gioiHan: taoGioiHanDangNhap(), bayGio });
  app.route('/api/auth', authRouter);

  app.get('/api/suc-khoe', (c) => c.json({ trangThai: 'ok' }));
```

(Xoá khối `if (tuyChon.corsOrigins …)` cũ và dòng `app.get('/api/suc-khoe'…)` cũ vì đã chuyển lên trên.) Các `app.route('/api/…', xRouter)` còn lại giữ nguyên; `xRouter` là `new Hono()` thường — `app.route` chấp nhận.

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/app.test.ts && npm run typecheck`
Expected: PASS và typecheck sạch. Nếu typecheck than phiền `app.route` giữa `Hono<BienHono>` và `Hono<BlankEnv>`, ép kiểu router con bằng `new Hono<BienHono>()` ở các chỗ báo lỗi (không dùng `any`).

- [ ] **Step 5: Chạy toàn bộ test server để chắc không vỡ chỗ khác**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 6: Commit**

```bash
git add src/server/app.ts src/server/app.test.ts
GC commit -m "Gắn CSRF và xác thực vào taoApp, bật sẵn mặc định" -m "<trailer>"
```

---

### Task 10: Lệnh tạo admin đầu tiên

**Files:**
- Create: `src/server/auth/tao-admin.ts`
- Test: `src/server/auth/tao-admin.test.ts`
- Create: `src/server/auth/tao-admin-cli.ts` (vỏ mỏng, không test đơn vị — chỉ gọi `taoAdmin`; kiểm bằng chạy tay ở Step 6)
- Modify: `package.json` (thêm script)

**Interfaces:**
- Consumes: `taoNguoiDung`, các lỗi từ `nguoi-dung.ts`.
- Produces: `taoAdmin(db: Db, dauVao: { tenDangNhap: string; matKhau: string; tenHienThi?: string }): NguoiDungHienTai` — tạo `ADMIN`, ném lại các lỗi của `taoNguoiDung`.

- [ ] **Step 1: Viết test đỏ**

```ts
// src/server/auth/tao-admin.test.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MatKhauQuaNganError, TenDangNhapDaTonTaiError } from './nguoi-dung';
import { taoAdmin } from './tao-admin';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
});

afterEach(() => {
  sqlite.close();
});

describe('taoAdmin', () => {
  it('tạo người dùng vai trò ADMIN', () => {
    const nd = taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' });

    expect(nd).toMatchObject({ tenDangNhap: 'admin', vaiTro: 'ADMIN' });
  });

  it('tên hiển thị mặc định là tên đăng nhập, ghi đè được', () => {
    expect(taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' }).tenHienThi).toBe('admin');
    expect(
      taoAdmin(db, { tenDangNhap: 'chu', matKhau: 'mat-khau-dai-du', tenHienThi: 'Chủ quầy' }).tenHienThi,
    ).toBe('Chủ quầy');
  });

  it('từ chối mật khẩu ngắn', () => {
    expect(() => taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'ngan' })).toThrow(MatKhauQuaNganError);
  });

  it('từ chối tên đã tồn tại', () => {
    taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' });

    expect(() => taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' })).toThrow(
      TenDangNhapDaTonTaiError,
    );
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `npx vitest run src/server/auth/tao-admin.test.ts`
Expected: FAIL — `Cannot find module './tao-admin'`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
// src/server/auth/tao-admin.ts
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { taoNguoiDung } from './nguoi-dung';

type Db = ReturnType<typeof drizzle>;

export function taoAdmin(
  db: Db,
  dauVao: { tenDangNhap: string; matKhau: string; tenHienThi?: string },
): NguoiDungHienTai {
  return taoNguoiDung(db, {
    tenDangNhap: dauVao.tenDangNhap,
    tenHienThi: dauVao.tenHienThi ?? dauVao.tenDangNhap,
    matKhau: dauVao.matKhau,
    vaiTro: 'ADMIN',
  });
}
```

- [ ] **Step 4: Chạy, thấy xanh**

Run: `npx vitest run src/server/auth/tao-admin.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Viết vỏ dòng lệnh và script**

```ts
// src/server/auth/tao-admin-cli.ts
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { cauHinh } from '../config';
import { MatKhauQuaNganError, TenDangNhapDaTonTaiError, TenDangNhapKhongHopLeError } from './nguoi-dung';
import { taoAdmin } from './tao-admin';

/** Đọc một dòng từ terminal, không hiện ký tự gõ vào (mật khẩu). */
function hoiAn(cauHoi: string): Promise<string> {
  return new Promise((ketQua) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Ghi đè hàm xuất để che ký tự người dùng gõ, chỉ để lại câu hỏi.
    const rlAny = rl as unknown as { _writeToOutput: (s: string) => void };
    rlAny._writeToOutput = (s: string) => {
      if (s.startsWith(cauHoi)) process.stdout.write(s);
    };
    rl.question(cauHoi, (traLoi) => {
      rl.close();
      process.stdout.write('\n');
      ketQua(traLoi);
    });
  });
}

const tenDangNhap = process.argv[2];
if (!tenDangNhap) {
  console.error('Cách dùng: npm run tao-admin -- <tenDangNhap>');
  process.exit(1);
}

const matKhau = await hoiAn('Mật khẩu (tối thiểu 8 ký tự): ');
const nhapLai = await hoiAn('Nhập lại mật khẩu: ');
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
```

Trong `package.json`, thêm vào `scripts` (sau `db:migrate`):

```json
    "tao-admin": "tsx src/server/auth/tao-admin-cli.ts",
```

- [ ] **Step 6: Kiểm tra tay trên DB tạm (không đụng DB dev)**

Run:
```bash
printf 'mat-khau-dai-du\nmat-khau-dai-du\n' | DATABASE_URL=/tmp/claude-1000/-home-ubuntu-claude-Documents/bd3b5c67-ae00-4d0f-8a47-f3d4e3ae5d8c/scratchpad/thu-admin.sqlite npm run tao-admin -- admin
```
Expected: in `Đã tạo admin "admin".` Chạy lại lần hai in `Tên đăng nhập "admin" đã tồn tại` và thoát mã 1. (Khi stdin không phải TTY, `hoiAn` vẫn đọc được từng dòng từ pipe.) Nếu pipe không hoạt động vì `terminal: true`, đổi thành `terminal: process.stdin.isTTY ?? false` rồi chạy lại.

- [ ] **Step 7: Commit**

```bash
git add src/server/auth/tao-admin.ts src/server/auth/tao-admin.test.ts src/server/auth/tao-admin-cli.ts package.json
GC commit -m "Lệnh npm run tao-admin tạo admin đầu tiên" -m "<trailer>"
```

---

### Task 11: Kiểm tra toàn bộ và chạy thử thật

**Files:** không sửa file nguồn (chỉ sửa nếu CI báo lỗi do chính các task trên).

- [ ] **Step 1: Chạy toàn bộ pipeline CI**

Run: `npm run ci`
Expected: typecheck sạch; lint 0 lỗi (số cảnh báo không tăng so với 71, trừ cảnh báo mới do code của kế hoạch này mà không thể tránh — nếu tăng, sửa); `npm test` xanh; build xanh; e2e 25 test xanh (e2e dùng `vite preview` với API được mock nên không bị xác thực chặn — nếu có test e2e đỏ vì 401, dừng và báo, đó là việc của Phần 2).

- [ ] **Step 2: Chạy thử thật trên server**

Dừng server API cũ theo PID (không dùng `pkill -f`), rồi:

```bash
ss -ltnp | grep ':3000'          # lấy PID, kill <PID>
PORT=3000 CORS_ORIGINS=https://quaythuoc.dev2sec.io.vn nohup npx tsx src/server/index.ts > <scratchpad>/server.log 2>&1 &
printf 'mat-khau-dai-du\nmat-khau-dai-du\n' | npm run tao-admin -- admin
```

Kiểm bằng `curl`:
```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/hang-hoa                       # 401
curl -s -c /tmp/ck -X POST localhost:3000/api/auth/dang-nhap -H 'Content-Type: application/json' \
  -d '{"tenDangNhap":"admin","matKhau":"mat-khau-dai-du"}'                                  # 200 + người dùng
curl -s -b /tmp/ck localhost:3000/api/auth/toi                                              # 200
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/ck localhost:3000/api/hang-hoa             # 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/auth/dang-nhap \
  -H 'Content-Type: application/json' -d '{"tenDangNhap":"admin","matKhau":"sai"}'          # 401
```
Expected: đúng các mã ghi chú. (Lưu ý: từ lúc này màn giao diện hiện tại **chưa đăng nhập được** — sẽ có ở Phần 2; app trên Internet sẽ trả 401 cho mọi thao tác cho tới khi xong Phần 2. Báo người dùng trước khi khởi động lại server production.)

- [ ] **Step 3: Commit (nếu có sửa) và tổng kết**

```bash
git status --short   # chỉ được còn file không liên quan (không có file chưa commit của kế hoạch)
```

---

## Tự rà soát kế hoạch so với spec (Phần 1)

| Yêu cầu spec | Task |
|---|---|
| Bảng `nguoi_dung`, `phien`, không xoá cứng, băm phiên | 2, 3, 4 |
| `scrypt`, `timingSafeEqual`, mật khẩu ≥ 8, tên chữ thường | 1, 3 |
| `dang-nhap`/`dang-xuat`/`toi`, cùng lỗi + cùng chi phí | 8 |
| Cookie `httpOnly`/`SameSite=Lax`/`Secure` theo proxy/30 ngày trượt | 4, 8 |
| CSRF theo `Origin` | 6, 9 |
| Chống dò 5 lần/15 phút theo (tên, IP), `429` + `Retry-After` | 5, 8 |
| Bảng quyền chặn mặc định, 401/403 | 7, 9 |
| Nhân viên: hoá đơn, trả hàng, đồng bộ, `GET /api/hang-hoa`; Admin: còn lại | 7 |
| `npm run tao-admin` | 10 |
| CORS `credentials` cho domain API riêng | 9 |
| Hạng mục **không** thuộc Phần 1: UI, cache SW, offline 401, quản lý người dùng, `nguoi_ban_id` | Phần 2, Phần 3 |

Nhất quán kiểu giữa các task: `NguoiDungHienTai` (Task 2) dùng ở 3, 4, 7, 8; `BienHono` và `TEN_COOKIE_PHIEN` (Task 7) dùng ở 8, 9; `GioiHanDangNhap` (Task 5) dùng ở 8, 9; chữ ký `docPhien(db, ma, bay)` (Task 4) dùng đúng ở 7.
