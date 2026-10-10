# Đăng nhập và phân quyền — Phần 2 và 3: giao diện, quản lý người dùng, người bán — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất đăng nhập end-to-end: màn đăng nhập, menu theo vai trò, xử lý hết phiên, xoá cache khi đăng xuất, màn quản lý người dùng cho admin, ghi người bán lên hoá đơn; kiểm thử trên trình duyệt thật.

**Architecture:** Client thêm mô-đun `src/client/xac-thuc/` (vai trò, bọc `fetch` toàn cục bắt `401`, gọi API phiên, màn đăng nhập, hook trạng thái). `App.tsx` đặt cổng đăng nhập quanh app hiện có và lọc menu theo vai trò. Server thêm API `/api/nguoi-dung` (chỉ admin), cột `hoa_don.nguoi_ban_id`, và lọc `giaVon` khỏi danh sách hàng với nhân viên.

**Tech Stack:** React 18 (test bằng `renderToStaticMarkup` như dự án), Hono, drizzle, zod, Vitest, Playwright, Chrome thật qua extension.

**Spec:** `docs/superpowers/specs/2026-10-10-dang-nhap-phan-quyen-design.md`. Phần 1 đã xong (`docs/superpowers/plans/2026-10-10-dang-nhap-phan-quyen-phan-1-loi-server.md`).

## Global Constraints

- Quyền thật luôn ở server; ẩn menu chỉ là tiện dụng.
- Không sửa 19 file màn hình để bắt `401`: bọc `window.fetch` một chỗ.
- Đăng xuất: gọi API, xoá cache SW `danh-muc-tra-cuu`, xoá người dùng lưu; **không** động vào hàng đợi Dexie.
- Giao diện theo `docs/agent/UI-FIDELITY.md` và token `.claude/skills/design-system/tokens.css`: dùng biến CSS, không viết mã màu thẳng; xanh dương = hành động chính; chữ ≥ 4.5:1; vùng bấm ≥ 44px; tiếng Việt có dấu; không `@import` font/CDN.
- Mọi test e2e hiện có phải xanh sau khi thêm cổng đăng nhập (đăng nhập giả bằng fixture, không sửa nội dung từng test).
- Không xoá cứng người dùng. Luôn còn ít nhất một admin hoạt động; không tự khoá/hạ quyền chính mình (server cưỡng chế).
- Mật khẩu tối thiểu 8 ký tự (đã có ở `taoNguoiDung`).
- `GC` = `git -c user.name="duongnt" -c user.email="duongnt.96@proton.me"`; commit bằng script `cm.sh` ở scratchpad (`cm.sh "tiêu đề" file...`), luôn `git add` đúng file của task.
- Lệnh chuẩn: `npm run typecheck | lint | test | build | test:e2e | ci`; chạy một file: `npx vitest run <đường-dẫn>`.

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `src/client/xac-thuc/vai-tro.ts` | `Man`, `cacManChoPhep(vaiTro)`, `manMacDinh` |
| `src/client/xac-thuc/fetch-xac-thuc.ts` | `boocFetch`, `caiDatFetchToanCuc` — bắt `401` ở mọi `/api/*` |
| `src/client/xac-thuc/phien-client.ts` | `dangNhap`, `dangXuat`, `layNguoiHienTai`, người dùng lưu, xoá cache tra cứu |
| `src/client/xac-thuc/trang-thai-khoi-dong.ts` | Hàm thuần quyết định trạng thái lúc mở app |
| `src/client/xac-thuc/use-xac-thuc.ts` | Hook ghép các phần trên |
| `src/client/xac-thuc/ManDangNhap.tsx` + `.css` | Màn đăng nhập |
| `src/client/xac-thuc/DieuHuong.tsx` | Thanh menu theo vai trò + tên người dùng + Đăng xuất |
| `src/client/App.tsx` | Cổng đăng nhập |
| `tests/e2e/co-so.ts` | `test` mở rộng: tự giả `GET /api/auth/toi` là admin |
| `tests/e2e/dang-nhap.spec.ts` | E2E đăng nhập/vai trò/đăng xuất |
| `src/server/db/schema.ts` + migration | `hoa_don.nguoi_ban_id` |
| `src/server/ban-hang/tao-hoa-don.ts`, `src/server/api/hoa-don.ts` | Ghi người bán (online) |
| `src/shared/hop-dong/dong-bo.ts`, `src/server/dong-bo/ap-dung-thao-tac.ts`, `src/server/api/dong-bo.ts` | Ghi người bán (offline) |
| `src/shared/hop-dong/nguoi-dung.ts` | Hợp đồng API quản lý người dùng |
| `src/server/auth/quan-ly-nguoi-dung.ts` | Quy tắc quản lý (không tự khoá, còn admin) |
| `src/server/api/nguoi-dung.ts` | Route `/api/nguoi-dung` |
| `src/server/app.ts` | Mount route + lọc `giaVon` cho nhân viên |
| `src/client/man-hinh/CaiDat/QuanLyNguoiDung.tsx` + `.css` | UI quản lý người dùng |

---

## PHẦN 2 — Giao diện đăng nhập

### Task 1: Vai trò → màn được phép

**Files:** Create `src/client/xac-thuc/vai-tro.ts`, `src/client/xac-thuc/vai-tro.test.ts`.

**Interfaces:** Produces `type Man = 'ban-hang'|'hang-hoa'|'nhap-hang'|'tra-hang'|'tra-hang-nhap'|'tong-quan'|'cai-dat'`; `cacManChoPhep(vaiTro: VaiTro): readonly Man[]` (ADMIN: cả 7 theo đúng thứ tự trên; NHAN_VIEN: `['ban-hang','tra-hang']`); `manMacDinh = 'ban-hang'`.

- [ ] Test: ADMIN có đủ 7 màn đúng thứ tự; NHAN_VIEN đúng `['ban-hang','tra-hang']`; mọi vai trò đều chứa `manMacDinh`. Xem đỏ (thiếu module) → viết code → xanh → commit.

### Task 2: Bọc fetch bắt 401

**Files:** Create `src/client/xac-thuc/fetch-xac-thuc.ts`, `.test.ts`.

**Interfaces:** `boocFetch(fetchGoc: typeof fetch, khiHetPhien: () => void): typeof fetch` — gọi `fetchGoc`, trả về nguyên `Response`; nếu `status === 401` và đường dẫn bắt đầu `/api/` và không phải `/api/auth/dang-nhap` thì gọi `khiHetPhien()` **một lần cho mỗi response**. `caiDatFetchToanCuc(khiHetPhien): () => void` thay `window.fetch` bằng bản bọc, trả hàm khôi phục.

- [ ] Test (fetch giả): 401 ở `/api/hang-hoa` gọi callback, trả đúng response; 200 không gọi; 401 ở `/api/auth/dang-nhap` không gọi; 401 ở URL ngoài (`https://x.example/api/a`) và đường không bắt đầu `/api/` không gọi; hỗ trợ đối số `string`, `URL`, `Request`; lỗi mạng (fetch ném) được ném lại nguyên, không gọi callback; `caiDatFetchToanCuc` đặt và khôi phục `globalThis.fetch`.
- [ ] Code: chuẩn hoá `input` → `string` đường dẫn bằng `new URL(url, 'http://x')` rồi lấy `pathname` (chỉ tính khi origin trùng nếu là URL tuyệt đối — dùng `location.origin` nếu có, ngược lại coi mọi URL tương đối là cùng origin).

### Task 3: Gọi API phiên + người dùng lưu

**Files:** Create `src/client/xac-thuc/phien-client.ts`, `.test.ts`.

**Interfaces:**
```ts
type KetQuaDangNhap = { loai: 'OK'; nguoi: NguoiDungHienTai } | { loai: 'SAI' } | { loai: 'BI_CHAN'; thuLaiSauGiay: number } | { loai: 'LOI_MANG' };
type KetQuaToi = { loai: 'OK'; nguoi: NguoiDungHienTai } | { loai: 'CHUA_DANG_NHAP' } | { loai: 'LOI_MANG' };
dangNhap(ten: string, matKhau: string, fetchFn?: typeof fetch): Promise<KetQuaDangNhap>
layNguoiHienTai(fetchFn?: typeof fetch): Promise<KetQuaToi>
dangXuat(deps?: { fetchFn?: typeof fetch; kho?: KhoLuu; caches?: Pick<CacheStorage,'delete'> }): Promise<void>
docNguoiDaLuu(kho?: KhoLuu): NguoiDungHienTai | undefined   // kiểm bằng NguoiDungSchema, dữ liệu hỏng → undefined
luuNguoi(nguoi: NguoiDungHienTai, kho?: KhoLuu): void
xoaNguoiDaLuu(kho?: KhoLuu): void
interface KhoLuu { getItem(k:string):string|null; setItem(k:string,v:string):void; removeItem(k:string):void }
```
Khoá lưu: `quaythuoc.nguoi-dung`. Mọi truy cập `localStorage` bọc try/catch (chế độ riêng tư có thể ném).

- [ ] Test: `dangNhap` 200 → OK + parse người dùng bằng `NguoiDungSchema`; 401 → SAI; 429 → BI_CHAN với `Retry-After`; fetch ném → LOI_MANG; body gửi đúng JSON và `Content-Type`. `layNguoiHienTai` 200/401/lỗi mạng. `dangXuat`: gọi `POST /api/auth/dang-xuat`, xoá người dùng lưu, gọi `caches.delete('danh-muc-tra-cuu')`, **kể cả khi fetch ném lỗi** (vẫn xoá cục bộ), không đụng IndexedDB. `docNguoiDaLuu` với JSON hỏng/sai dạng → undefined; kho ném lỗi → undefined, không văng.

### Task 4: Quyết định trạng thái khi mở app (hàm thuần)

**Files:** Create `src/client/xac-thuc/trang-thai-khoi-dong.ts`, `.test.ts`.

**Interfaces:** `type TrangThaiXacThuc = { loai: 'DANG_TAI' } | { loai: 'CHUA_DANG_NHAP'; ghiChu?: string } | { loai: 'DA_DANG_NHAP'; nguoi: NguoiDungHienTai; tamThoiOffline: boolean }`; `quyetDinhKhoiDong(ketQuaToi: KetQuaToi, daLuu: NguoiDungHienTai | undefined): TrangThaiXacThuc`.

Quy tắc: `OK` → `DA_DANG_NHAP` (offline=false); `CHUA_DANG_NHAP` → `CHUA_DANG_NHAP` (không dùng người đã lưu — phiên đã bị server từ chối); `LOI_MANG` + có người đã lưu → `DA_DANG_NHAP` với `tamThoiOffline: true` (để bán tiếp khi mất mạng; quyền thật vẫn do server kiểm); `LOI_MANG` + không có người lưu → `CHUA_DANG_NHAP` với `ghiChu` "Không kết nối được máy chủ".

- [ ] Test đủ 4 nhánh trên.

### Task 5: Màn đăng nhập

**Files:** Create `src/client/xac-thuc/ManDangNhap.tsx`, `ManDangNhap.css`, `ManDangNhap.test.tsx`.

**Interfaces:** `ManDangNhap({ onDangNhapThanhCong(nguoi), ghiChu?: string })`. Có `h1` "Quầy thuốc", tiêu đề "Đăng nhập", hai `TruongNhap` (nhãn "Tên đăng nhập", "Mật khẩu" — `type="password"` qua prop `type` truyền xuống input; **kiểm `TruongNhap` có cho ghi đè `type` không**: hiện `Omit<..., 'type'>` — nếu không, thêm prop `kieu="mat-khau"` vào `TruongNhap` với test riêng), nút "Đăng nhập" (`Nut` chính, Enter gửi form), vùng lỗi `role="alert"`. Thông điệp: SAI → "Sai tên đăng nhập hoặc mật khẩu"; BI_CHAN → "Đăng nhập sai quá nhiều lần. Thử lại sau N phút" (làm tròn lên); LOI_MANG → "Không kết nối được máy chủ". Khi đang gửi: nút disabled và nhãn "Đang đăng nhập…". `autoFocus` ô tên; `autoComplete` `username`/`current-password`.

- [ ] Test (`renderToStaticMarkup`): có hai ô + nút + h1; `ghiChu` hiện trong `role="alert"`; không có chữ "undefined"; ô mật khẩu có `type="password"`.
- [ ] Logic gửi viết dưới dạng hàm tách ra `guiDangNhap(ten, matKhau, fetchFn)` đã nằm ở Task 3 → component chỉ gọi `dangNhap`; trạng thái (đang gửi/lỗi) kiểm bằng e2e (Task 9) vì `renderToStaticMarkup` không chạy sự kiện.

### Task 6: Hook trạng thái xác thực + điều hướng theo vai trò

**Files:** Create `src/client/xac-thuc/use-xac-thuc.ts`, `src/client/xac-thuc/DieuHuong.tsx`, `DieuHuong.test.tsx`; Modify `src/client/App.tsx`, `src/client/App.css`, `src/client/main.tsx`.

**Interfaces:**
- `useXacThuc(): { trangThai: TrangThaiXacThuc; dangNhapXong(nguoi): void; dangXuat(): Promise<void> }` — lúc mount: `layNguoiHienTai()` rồi `quyetDinhKhoiDong`; khi nhận `khiHetPhien` từ fetch toàn cục → `CHUA_DANG_NHAP` với `ghiChu` "Phiên đã hết hạn, vui lòng đăng nhập lại" và xoá người đã lưu; `dangNhapXong` lưu người dùng.
- `DieuHuong({ nguoi, man, onChonMan(man), onDangXuat() })`: chỉ vẽ nút của `cacManChoPhep(nguoi.vaiTro)` với nhãn: Bán hàng, Hàng hoá, Nhập hàng, Trả hàng, Trả hàng nhập, Tổng quan, Cài đặt; hiện `nguoi.tenHienThi` (kèm vai trò "Quản trị"/"Nhân viên") và nút "Đăng xuất" ở cuối thanh.
- `App`: `DANG_TAI` → chữ "Đang tải…"; `CHUA_DANG_NHAP` → `ManDangNhap`; `DA_DANG_NHAP` → thanh `DieuHuong` + màn (như cũ). Khi người dùng đổi/ đăng nhập lại, `man` đặt về `manMacDinh`; nếu `man` hiện tại không còn được phép thì về `manMacDinh`.
- `main.tsx`: gọi `caiDatFetchToanCuc` **trước** khi render, truyền callback qua một "cầu nối" (sự kiện `window` tuỳ biến `quaythuoc:het-phien`) mà `useXacThuc` lắng nghe — để không phụ thuộc thứ tự mount.

- [ ] Test `DieuHuong` (static): ADMIN thấy 7 nút + "Đăng xuất" + tên; NHAN_VIEN chỉ thấy "Bán hàng", "Trả hàng" và **không** thấy "Nhập hàng", "Hàng hoá", "Cài đặt", "Tổng quan", "Trả hàng nhập"; nút của màn đang chọn có biến thể chính.
- [ ] Giữ nguyên cấu trúc `<main>` + `h1.app__tieu-de` "Quầy thuốc" để e2e cũ tìm `heading 'Quầy thuốc'`.

### Task 7: CSS màn đăng nhập và thanh người dùng

**Files:** `ManDangNhap.css`, `src/client/App.css`. Dùng biến token (`--kc-*`, `--mau-nen-the`, `--vien`, `--bo-goc`, `--mau-nguy`, `--chu-*`). Thẻ giữa màn hình rộng tối đa 360px; đẩy cụm người dùng/Đăng xuất sang phải thanh menu (`margin-left: auto`). Không test tự động riêng — kiểm bằng ảnh chụp ở Task 10 và Task 17.

### Task 8: Fixture e2e đăng nhập giả + cập nhật e2e hiện có

**Files:** Create `tests/e2e/co-so.ts`; Modify các spec: `smoke`, `offline`, `ban-hang`, `nhap-hang`, `tra-hang`, `tra-hang-nhap` — **chỉ đổi dòng import** `from '@playwright/test'` → `from './co-so'`.

`co-so.ts`: `export const test = base.extend<{ _phienAdmin: void }>({ _phienAdmin: [async ({ context }, use) => { await context.route('**/api/auth/toi', (r) => r.fulfill({ json: ADMIN })); await use(); }, { auto: true }] }); export { expect } from '@playwright/test';` với `ADMIN = { id: 'u-admin', tenDangNhap: 'admin', tenHienThi: 'Admin', vaiTro: 'ADMIN' }`.

- [ ] Chạy `npm run build && npx playwright test` → 25 test phải xanh. Test `vỏ app tải được khi mất mạng`: nếu đỏ vì `GET /api/auth/toi` lỗi mạng khi offline → xác nhận nhánh "dùng người đã lưu" hoạt động (người được lưu sau lần tải đầu); nếu không, sửa `use-xac-thuc` chứ không sửa test.

### Task 9: E2E đăng nhập, vai trò, đăng xuất

**Files:** Create `tests/e2e/dang-nhap.spec.ts` (dùng `test` từ `@playwright/test` gốc để tự quản `/api/auth/toi`).

Các ca (API giả bằng `context.route`):
1. `toi` → 401: thấy màn đăng nhập; nhập sai (`dang-nhap` → 401) thấy "Sai tên đăng nhập hoặc mật khẩu", vẫn ở màn đăng nhập.
2. Đăng nhập đúng (đổi `toi` sang 200 admin + `dang-nhap` → 200): vào app, thấy đủ 7 nút menu và tên người dùng.
3. Đăng nhập bằng Enter (không bấm chuột).
4. Nhân viên (`toi` → NHAN_VIEN): chỉ có "Bán hàng", "Trả hàng"; **không** có "Nhập hàng", "Cài đặt".
5. Hết phiên giữa chừng: đang ở app, request `/api/hang-hoa` trả 401 → tự về màn đăng nhập với "Phiên đã hết hạn".
6. Đăng xuất: bấm "Đăng xuất" → gọi `POST /api/auth/dang-xuat`, về màn đăng nhập; `caches.has('danh-muc-tra-cuu')` là false; dữ liệu IndexedDB `thaoTac` còn nguyên (thêm một thao tác bằng `page.evaluate` qua Dexie của app là phức tạp — thay bằng kiểm tra `localStorage['quaythuoc.nguoi-dung']` đã bị xoá; việc hàng đợi không bị xoá được bảo đảm bằng test đơn vị Task 3 và quy ước code).
7. 429: `dang-nhap` → 429 kèm `Retry-After: 600` → hiện "thử lại sau 10 phút".

- [ ] Chạy cả bộ e2e xanh. Commit.

### Task 10: Kiểm tra Phần 2 + CI

- [ ] `npm run ci` xanh (lint 0 lỗi, không tăng cảnh báo vô cớ). Commit.

---

## PHẦN 3 — Người dùng và người bán

### Task 11: Cột `hoa_don.nguoi_ban_id` và ghi người bán khi bán online

**Files:** Modify `src/server/db/schema.ts` (+ migration sinh bằng `npm run db:generate`), `src/server/ban-hang/tao-hoa-don.ts`, `src/server/api/hoa-don.ts`, `src/server/api/hoa-don.test.ts` (đổi `new Hono()` → `new Hono<BienHono>()`), `src/server/app.ts`; Test thêm vào `src/server/app.test.ts` và `src/server/ban-hang/tao-hoa-don.test.ts` (nếu có).

**Interfaces:** `hoaDon.nguoiBanId: text('nguoi_ban_id').references(() => nguoiDung.id)` (nullable — hoá đơn cũ). `TaoHoaDonInput.nguoiBanId?: string`. `dangKyHoaDonRoutes(app: Hono<BienHono>, db)` truyền `nguoiBanId: c.get('nguoiDung')?.id`.

- [ ] Test (tích hợp qua `taoApp`): admin đăng nhập, `POST /api/hoa-don` với một giỏ hợp lệ (tạo sản phẩm + tồn bằng helper giống test hoá đơn hiện có) → hàng `hoa_don` có `nguoi_ban_id` = id người đăng nhập; giá trị `nguoiBanId` do client gửi trong body bị bỏ qua (schema Zod không nhận).
- [ ] Test đơn vị `taoHoaDonTuGioHang` với `nguoiBanId` → lưu; không truyền → `null`.

### Task 12: Người bán khi đồng bộ offline

**Files:** Modify `src/shared/hop-dong/dong-bo.ts` (thêm `nguoiBanId: z.string().min(1).optional()` vào `ThaoTacBanHangOfflineSchema`), `src/server/dong-bo/ap-dung-thao-tac.ts`, `src/server/api/dong-bo.ts`; Test `ap-dung-thao-tac.test.ts`, `dong-bo.test.ts`.

**Interfaces:** `apDungLoThaoTac(db, thaoTac, nguoiPhienId?: string)`. Quy tắc: nếu `thaoTac.nguoiBanId` tồn tại trong `nguoi_dung` → dùng nó; ngược lại dùng `nguoiPhienId` (người đang gọi API); không có cả hai → `null`. Route đồng bộ truyền `c.get('nguoiDung')?.id`.

- [ ] Test: payload có `nguoiBanId` hợp lệ → hoá đơn ghi đúng người đó; `nguoiBanId` không tồn tại → rơi về người phiên; thiếu → người phiên; idempotency (gửi lại cùng id) không đổi người bán.

### Task 13: Dịch vụ quản lý người dùng (quy tắc)

**Files:** Create `src/server/auth/quan-ly-nguoi-dung.ts`, `.test.ts`.

**Interfaces:**
```ts
layDanhSachNguoiDung(db): NguoiDungQuanLy[]   // { id, tenDangNhap, tenHienThi, vaiTro, hoatDong, ngayTao }, sắp theo ngayTao tăng, KHÔNG có mật khẩu băm
capNhatNguoiDung(db, nguoiThucHienId, id, thayDoi: { tenHienThi?: string; vaiTro?: VaiTro; hoatDong?: boolean }): NguoiDungQuanLy
datLaiMatKhau(db, id, matKhauMoi): void
lỗi: NguoiDungKhongTonTaiError, KhongTuThayDoiMinhError, PhaiConAdminError
```
Quy tắc: không tồn tại → `NguoiDungKhongTonTaiError`; tự đổi `vaiTro` hoặc `hoatDong` của chính mình → `KhongTuThayDoiMinhError` (đổi `tenHienThi` của mình được); thay đổi làm số admin **hoạt động** về 0 → `PhaiConAdminError`; `hoatDong: false` → `xoaMoiPhienCua(id)`; đổi `vaiTro` → xoá mọi phiên của người đó (buộc đăng nhập lại để quyền mới có hiệu lực); `datLaiMatKhau` kiểm `MAT_KHAU_TOI_THIEU`, băm, và xoá mọi phiên.

- [ ] Test từng quy tắc trên (gồm: hai admin, khoá một → được; chỉ còn một admin, người khác (nhân viên không có quyền, nên dùng admin thứ hai làm người thực hiện) hạ vai trò admin cuối → `PhaiConAdminError`; khoá người dùng thì phiên cũ không dùng được; đặt lại mật khẩu thì đăng nhập bằng mật khẩu mới được, cũ thì không; `layDanhSachNguoiDung` không chứa chuỗi `scrypt`).

### Task 14: API `/api/nguoi-dung` + lọc giá vốn cho nhân viên

**Files:** Create `src/shared/hop-dong/nguoi-dung.ts`, `src/server/api/nguoi-dung.ts`, `src/server/api/nguoi-dung.test.ts`; Modify `src/server/app.ts`, `src/server/app.test.ts`.

**Hợp đồng (zod):** `TaoNguoiDungReqSchema { tenDangNhap, tenHienThi, matKhau, vaiTro }`; `CapNhatNguoiDungReqSchema { tenHienThi?, vaiTro?, hoatDong? }` (ít nhất một trường); `DatLaiMatKhauReqSchema { matKhau }`; `NguoiDungQuanLySchema`; `DanhSachNguoiDungResSchema { duLieu: NguoiDungQuanLy[] }`.

**Route:** `GET /` → 200 danh sách; `POST /` → 201 người mới (409 tên trùng, 400 sai dạng/mật khẩu ngắn); `PUT /:id` → 200 (404 không có, 409 `KhongTuThayDoiMinhError`/`PhaiConAdminError`, 400 sai dạng); `POST /:id/dat-lai-mat-khau` → 204 (404, 400). Mount `/api/nguoi-dung`; **không** thêm vào bảng quyền (mặc định ADMIN).

**Lọc giá vốn:** middleware trong `taoApp` cho `GET /api/hang-hoa` (đúng đường dẫn, không có `/:id`): nếu người dùng là `NHAN_VIEN` và response 200 JSON thì bỏ khoá `giaVon` khỏi từng phần tử `duLieu` (và khỏi `donViTinh` nếu có). Admin nhận nguyên.

- [ ] Test API (qua `taoApp` + cookie): admin tạo nhân viên → 201, đăng nhập được bằng tài khoản mới; nhân viên gọi `GET/POST /api/nguoi-dung` → 403; chưa đăng nhập → 401; tạo trùng → 409; mật khẩu ngắn → 400; tự khoá mình → 409; hạ admin cuối → 409; khoá nhân viên xong cookie của họ → 401; đặt lại mật khẩu → mật khẩu cũ không đăng nhập được; phản hồi không bao giờ chứa `matKhauBam`/`scrypt`.
- [ ] Test lọc giá vốn: tạo một sản phẩm; admin `GET /api/hang-hoa` có `giaVon`; nhân viên `GET /api/hang-hoa` **không có** khoá `giaVon`; các trường khác giữ nguyên.

### Task 15: UI quản lý người dùng trong Cài đặt

**Files:** Create `src/client/man-hinh/CaiDat/QuanLyNguoiDung.tsx`, `.css`, `.test.tsx`; Modify `src/client/man-hinh/CaiDat/CaiDat.tsx` (thêm khối "Người dùng" dưới khối "Quản lý theo lô").

**Hành vi:** bảng (`Bang` của dự án) cột: Tên đăng nhập, Tên hiển thị, Vai trò (Quản trị/Nhân viên), Trạng thái (badge "Hoạt động"/"Đã khoá"), Thao tác (nút "Khoá"/"Mở khoá", "Đặt lại mật khẩu"). Hàng của chính mình: không có nút khoá. Form "Thêm người dùng": Tên đăng nhập, Tên hiển thị, Mật khẩu, Vai trò (chọn Nhân viên mặc định), nút "Thêm". "Đặt lại mật khẩu" mở ô nhập mật khẩu mới ngay dưới hàng + nút "Lưu". Lỗi server hiện trong `role="alert"`. Tách hàm thuần `nhanVaiTro(vaiTro)`, `nhanTrangThai(hoatDong)` để test.

- [ ] Test static: render danh sách mẫu → có đủ cột và nhãn tiếng Việt; hàng của chính mình không có nút "Khoá"; trạng thái rỗng "Chưa có người dùng"; trạng thái lỗi; hàm nhãn.
- [ ] E2E (thêm vào `dang-nhap.spec.ts` hoặc `nguoi-dung.spec.ts`): admin mở Cài đặt, thấy bảng; thêm người dùng gửi đúng `POST /api/nguoi-dung` (body kiểm bằng route giả) và dòng mới xuất hiện; bấm "Khoá" gửi `PUT` với `{ hoatDong: false }`.

### Task 16: CI đầy đủ

- [ ] `npm run ci` xanh; số cảnh báo lint không tăng do code mới. Commit.

---

## KIỂM THỬ TRÌNH DUYỆT THẬT (cả Phần 1, 2, 3)

### Task 17: Khởi động lại server thật và kiểm tra trên Chrome

**Chuẩn bị**
- [ ] `npm run build`; dừng API (3000) và preview (4173) cũ theo PID (không `pkill -f`); chạy lại API `PORT=3000 CORS_ORIGINS=https://quaythuoc.dev2sec.io.vn npx tsx src/server/index.ts` và `npx vite preview --port 4173 --host`.
- [ ] Tạo admin trên DB dev bằng `npm run tao-admin -- admin` (mật khẩu truyền qua pipe; **không** in ra log/hội thoại — đọc từ biến tạm). Tài khoản nhân viên sẽ tạo qua chính màn Cài đặt (kiểm thử luôn tính năng).

**Kịch bản trên Chrome (qua `http://localhost:4173`, dữ liệu mẫu có sẵn)**
1. Mở app khi chưa đăng nhập → thấy màn đăng nhập, không lộ dữ liệu; `GET /api/hang-hoa` trực tiếp trên tab khác → JSON `401`.
2. Đăng nhập sai → thông báo lỗi; sai liên tiếp quá 5 lần → thông báo chờ (kiểm cả mã 429).
3. Đăng nhập admin → thấy đủ 7 mục + tên + "Đăng xuất"; tải lại trang vẫn đăng nhập (cookie).
4. Cài đặt → thêm nhân viên `nhanvien1`; thử trùng tên (báo lỗi), mật khẩu ngắn (báo lỗi).
5. Đăng xuất → về màn đăng nhập; nút Back của trình duyệt không bật lại dữ liệu.
6. Đăng nhập `nhanvien1` → chỉ thấy Bán hàng/Trả hàng; bán một đơn (tìm, thêm, thanh toán Enter) → thành công; mở `GET /api/phieu-nhap`, `/api/nguoi-dung`, `/api/hang-hoa/<id>` → `403`; `GET /api/hang-hoa` không có `giaVon`.
7. Kiểm DB: `hoa_don.nguoi_ban_id` của đơn vừa bán = id `nhanvien1`.
8. Đăng nhập admin lại, khoá `nhanvien1` → tab nhân viên (còn mở) thao tác tiếp bị đưa về màn đăng nhập "Phiên đã hết hạn"; thử đăng nhập lại `nhanvien1` → bị từ chối.
9. Admin không có nút tự khoá mình; thử qua API (`fetch` từ console của trang đã đăng nhập) → `409`.
10. Kiểm tra cookie trong DevTools qua `document.cookie` **không** thấy `phien` (httpOnly).
11. Offline: tắt mạng tab (mô phỏng bằng `navigator`/CDP nếu extension hỗ trợ; nếu không, ghi rõ không kiểm được) — app đã đăng nhập vẫn mở được vỏ và bán được giao diện (đúng hành vi cũ); cache tra cứu bị xoá sau đăng xuất.
12. Thử qua domain thật `https://quaythuoc.dev2sec.io.vn` (nếu truy cập được): đăng nhập, kiểm cookie có `Secure` (qua `GET /api/auth/toi` thành công sau tải lại) và bộ chặn đăng nhập sai nhận đúng IP.

- [ ] Ghi kết quả từng bước (đạt/không đạt) vào báo cáo cuối; lỗi nào phát hiện thì sửa bằng TDD rồi chạy lại bước đó.

### Task 18: Hoàn tất

- [ ] `npm run ci` lần cuối; `git status` sạch; báo cáo kết quả, danh sách commit, các điểm cần chủ dự án quyết (merge/PR, cập nhật SPEC.md, bật Cloudflare Access hay không).

---

## Tự rà soát so với spec

| Yêu cầu spec | Task |
|---|---|
| Màn đăng nhập; menu theo vai trò; tên + Đăng xuất | 1, 5, 6, 7, 9 |
| Bắt `401` một chỗ; hết phiên → đăng nhập lại | 2, 6, 9 |
| Offline: dùng người dùng lưu; không xoá hàng đợi; xoá cache khi đăng xuất | 3, 4, 9, 17 |
| Quản lý người dùng; không tự khoá; luôn còn admin | 13, 14, 15 |
| `nguoi_ban_id` online + offline | 11, 12 |
| Nhân viên không thấy giá vốn | 14 |
| Kiểm thử trình duyệt thật cho cả 3 phần | 17 |

Ghi chú phát hiện khi lập kế hoạch: giao diện hiện **chưa** gửi hàng đợi offline lên `/api/dong-bo` (không có chỗ gọi `xuLyHangDoi`), nên "401 khi đồng bộ" chưa có đường chạy ở client; kế hoạch này chỉ đảm bảo đăng xuất không xoá hàng đợi và server đã sẵn sàng nhận `nguoiBanId` offline.
