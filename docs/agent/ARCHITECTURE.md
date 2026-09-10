# ARCHITECTURE — quyết định kỹ thuật

File này là **quyết định đã chốt**, không phải gợi ý. Muốn đổi thì ghi
`BLOCKED.md`, đừng tự đổi.

Yêu cầu sản phẩm ở `SPEC.md`. Luật giao diện ở `UI-FIDELITY.md`.

---

## 1. Stack

| Tầng | Chọn | Vì sao |
|---|---|---|
| Client | **Vite + React + TypeScript**, SPA thuần | Offline-first cần app chạy khi máy chủ không tồn tại. SSR chỉ tổ cản đường |
| PWA | **vite-plugin-pwa** (Workbox) | Service worker cache vỏ app |
| Lưu cục bộ | **Dexie** (IndexedDB) | Hàng đợi thao tác khi offline |
| Server | **Hono** trên Node | API mỏng, ít phụ thuộc, khởi động nhanh |
| ORM | **Drizzle** | Kiểu suy ra từ schema, migration bằng file SQL đọc được |
| CSDL | **SQLite** (WAL) qua `better-sqlite3` | 20–60 đơn/ngày. Không cần dịch vụ ngoài — test chạy in-memory, backup là copy một file |
| Hợp đồng API | **Zod** dùng chung client/server | Một nguồn kiểu cho cả hai đầu |
| ID | **ULID** | Client sinh được khi offline, sắp xếp theo thời gian |
| Test | **Vitest** (unit/tích hợp) + **Playwright** (e2e smoke) | |
| Lint | **ESLint** (flat config) + **Prettier** + **dependency-cruiser** | dependency-cruiser cưỡng chế ranh giới module |

Một `package.json`, không workspace, không monorepo. Cài nhanh hơn và ít chỗ cho
agent nhầm lẫn.

**Đã cân nhắc và loại**: framework server-driven (LiveView/HTMX — chết khi offline),
SSR framework (quy ước giả định server luôn với tới được), Postgres (thừa ở quy mô
này, lại bắt CI dựng dịch vụ ngoài), Rust (cold compile phá ngân sách CI).

---

## 2. Cấu trúc thư mục

```
src/
  shared/            # dùng chung client + server — KHÔNG import gì từ hai bên kia
    tien/            # số học tiền: làm tròn, phân bổ số dư lớn nhất
    don-vi/          # quy đổi đơn vị
    hop-dong/        # Zod schema cho API
    kieu/            # branded types
  server/
    db/
      schema.ts      # bảng Drizzle
      migrations/    # file SQL do drizzle-kit sinh
    kho/             # sổ cái, FEFO, tồn kho, giá vốn  ← xem §5
    ban-hang/
    nhap-hang/
    kiem-ke/
    dong-bo/         # nhận hàng đợi thao tác từ client
    api/             # route Hono
  client/
    man-hinh/        # mỗi màn hình một thư mục
    thanh-phan/      # component dùng lại
    offline/         # Dexie, hàng đợi, chỉ báo trạng thái
    design/          # token — xem .claude/skills/design-system/
tests/
  e2e/               # Playwright
```

## 3. Quy ước đặt tên

- **Thuật ngữ miền viết bằng tiếng Việt không dấu**: `theKho`, `loHang`, `tonKho`,
  `donViTinh`, `giaVon`, `hoaDon`, `phieuNhap`. Thuật ngữ kỹ thuật viết tiếng Anh:
  `repository`, `handler`, `queue`.
  Lý do: tài liệu và cơ sở dữ liệu đều dùng tiếng Việt. Dịch qua lại là chỗ sinh ra
  sai lệch âm thầm giữa "lô", "batch" và "lot".
- Bảng và cột CSDL: `snake_case` tiếng Việt không dấu — `the_kho`, `lo_hang`,
  `so_luong`, `gia_tri_ton`.
- Biến và hàm TypeScript: `camelCase`. Kiểu và component: `PascalCase`.
- File: `kebab-case.ts`. Component React: `PascalCase.tsx`.
- Test đặt cạnh file được test: `tien.ts` → `tien.test.ts`.

---

## 4. Kiểu chặt — CI là cổng duy nhất

`tsconfig.json` bật `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`.

**Branded types bắt buộc** cho các đại lượng dễ cộng nhầm:

```ts
type Dong          = number & { readonly __brand: 'Dong' };
type SoLuongCoSo   = number & { readonly __brand: 'SoLuongCoSo' };
type SoLuongHienThi= number & { readonly __brand: 'SoLuongHienThi' };
type Ulid          = string & { readonly __brand: 'Ulid' };
```

Cộng `Dong` với `SoLuongCoSo` phải là **lỗi biên dịch**, không phải lỗi lúc chạy.
Chuyển đổi chỉ qua hàm dựng có kiểm tra trong `src/shared/kieu/`.

Zod đứng ở mọi biên: body request, dữ liệu đọc từ IndexedDB, file Excel nhập vào.

---

## 5. Ranh giới module — cưỡng chế bằng máy

`dependency-cruiser` chặn, không phải quy ước miệng:

1. `src/server/kho/**` **không được import** hàm giải nghĩa cài đặt quản lý lô.
   Cài đặt chỉ được dùng ở validation form, render giao diện, và bộ lọc báo cáo.
2. `src/shared/**` không được import từ `src/server/**` hay `src/client/**`.
3. `src/client/**` không được import từ `src/server/**` (trừ kiểu trong `hop-dong/`).

ESLint chặn số thực trong `src/shared/tien/**` và `src/server/kho/**`: cấm toán tử
`/` trần, cấm `parseFloat`, cấm `Number.prototype.toFixed` dùng cho tính toán. Phép
chia hợp lệ phải đi qua hàm trong `src/shared/tien/`.

---

## 6. Cơ sở dữ liệu và migration

- Một file SQLite, chế độ **WAL**, `foreign_keys = ON`, `busy_timeout` đặt sẵn.
- Migration do `drizzle-kit generate` sinh ra file SQL, **commit vào repo**, chạy
  tự động lúc khởi động server. Không bao giờ sửa file migration đã merge.
- Bảng `the_kho` **chỉ ghi thêm**: có trigger chặn `UPDATE` và `DELETE`. Đây là
  ràng buộc ở tầng CSDL, không phải quy ước ở tầng ứng dụng.
- Bảng đệm `ton_kho_lo` cập nhật **trong cùng transaction** với thẻ kho.
- Ràng buộc phải có ở tầng CSDL, không chỉ ở code: unique lô ngầm định mỗi sản
  phẩm, unique `(san_pham_id, so_lo, hsd)` cho lô thật, unique đơn vị cơ sở mỗi sản
  phẩm, `he_so >= 1`.

---

## 7. Bộ lệnh chuẩn

**Dùng đúng những lệnh này. Không tự soạn biến thể, không thêm cờ verbose.** Output
dài đi vào context và bị gửi lại ở mọi lượt sau trong cùng run.

| Việc | Lệnh |
|---|---|
| Cài phụ thuộc | `npm ci` |
| Kiểm tra kiểu | `npm run typecheck` |
| Lint + ranh giới module | `npm run lint` |
| Test đơn vị và tích hợp | `npm test` |
| Test e2e | `npm run test:e2e` |
| Build | `npm run build` |
| Sinh migration | `npm run db:generate` |
| Chạy migration | `npm run db:migrate` |
| Chạy dev | `npm run dev` |
| **Chạy tất cả như CI** | `npm run ci` |

`npm run ci` = `typecheck && lint && test && build`. Chạy nó trước khi mở PR.

Cần một thao tác không có trong bảng này? Đó là dấu hiệu môi trường chưa sẵn sàng
cho task — ghi `BLOCKED.md` và dừng.

---

## 8. Chiến lược test

Kim tự tháp, không phải kim cương:

- **Phần lớn logic của hệ này là hàm thuần** — gấp sổ cái, cấp phát FEFO, làm tròn
  tiền, phân bổ giảm giá, quy đổi đơn vị. Test chúng bằng Vitest, **không chạm CSDL**.
- Test tích hợp chạy trên **SQLite in-memory**, không cần dịch vụ ngoài.
- Playwright chỉ giữ **smoke**: ít luồng, mỗi luồng đi hết một đường sống. Bắt buộc
  có ít nhất một luồng **bán hàng hoàn toàn bằng bàn phím**: quét mã → thêm giỏ →
  thanh toán → in.
- Mỗi bất biến ở `SPEC.md` §9 phải có test mang tên chỉ rõ nó.

Ngân sách CI: **cold install + toàn bộ test dưới ~5 phút**, vì nó bị trả 28 lần mỗi
tuần. Thứ chi phối ngân sách này là Playwright, không phải stack — image CI phải
bake sẵn `node_modules` và browser.

---

## 9. Bí mật và cấu hình

- Cấu hình qua biến môi trường, đọc một lần lúc khởi động và validate bằng Zod.
  Thiếu biến bắt buộc thì server **không khởi động**, không chạy với mặc định ngầm.
- `.env` **không commit**. `.env.example` có commit, liệt kê đủ tên biến.
- Không có secret nào trong client bundle. Không log secret.

---

## 10. Triển khai và sao lưu

Chạy trên Proxmox: một Node process sau reverse proxy có TLS, quản lý bằng systemd,
tự khởi động lại khi lỗi.

**Sao lưu** (đây là lý do dùng SQLite):

- Hằng đêm: `VACUUM INTO` ra một file mới, nén, giữ theo lịch xoay vòng, đẩy sang
  một máy khác. Bản sao trên cùng một máy không phải bản sao.
- Kiểm tra toàn vẹn định kỳ bằng `PRAGMA integrity_check`.
- **Khôi phục phải được diễn tập thật ít nhất một lần, có tài liệu các bước, trước
  khi quầy dùng thật.** Backup chưa từng khôi phục thì chưa phải backup.

---

## 11. Ghi chú vận hành cho phần offline

- Service worker chỉ cache vỏ ứng dụng và dữ liệu tra cứu (danh mục hàng hoá, giá).
  **Không** cache tồn kho như thể nó đúng — tồn hiển thị lúc offline là số gần đúng
  và giao diện phải nói rõ điều đó.
- Hàng đợi thao tác nằm trong Dexie, có trạng thái rõ ràng: chờ gửi / đã gửi / đã
  xác nhận / lỗi. Không bao giờ tự xoá một thao tác chưa được máy chủ xác nhận.
- Máy chủ **không bao giờ từ chối** một đơn đã bán và đã in. Sai lệch xử lý bằng
  cảnh báo lệch kho, không bằng cách vứt đơn.
