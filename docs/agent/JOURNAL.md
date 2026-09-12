# Nhật ký

Append-only. Mỗi run thêm đúng một entry vào CUỐI file. Không sửa entry cũ.
Giữ mỗi entry dưới 8 dòng — file này được đọc lại ở mọi run, dài ra là tốn
context của chính bạn.

Format:

```
## <ngày giờ> — <task-id>
Làm: <một câu>
PR: <link>
Tầng: A | B
Quyết định: <chỉ ghi nếu có lựa chọn kỹ thuật đáng nhớ>
Khác KiotViet: <chỉ ghi nếu cố ý làm khác, kèm lý do một câu>
Kế tiếp: <task-id dự kiến, hoặc "cần người quyết">
```

Nếu run kết thúc mà không làm được task nào, vẫn ghi entry nói rõ vì sao. Run
sau cần biết điều đó.

---

## 2026-01-01 00:00 — T-000
Làm: khởi tạo docs/agent, CLAUDE.md, UI-FIDELITY.md, DOMAIN-NOTES.md.
PR: —
Tầng: B
Kế tiếp: T-001

## 2026-09-08 — T-000b (phiên plan 4, chạy local)
Làm: sinh SPEC.md, ARCHITECTURE.md, viết lại BACKLOG.md, bổ sung bảng phím tắt vào
UI-FIDELITY.md, vendor 3 skill + 1 subagent, thêm CI và auto-merge workflow.
PR: —
Tầng: B
Quyết định: stack Vite+React+Hono+Drizzle+SQLite; giá vốn bình quân gia quyền lưu
theo cặp (tồn, giá trị tồn); FEFO `NULLS FIRST`; offline chỉ cho bán và trả hàng.
Khác KiotViet: chưa có — phiên này không dựng giao diện nào.
Kế tiếp: T-001

## 2026-09-10 — T-001
Làm: dựng khung dự án (Vite+React+TS, Hono, Drizzle+SQLite, Vitest, Playwright,
ESLint flat+Prettier+dependency-cruiser); `npm run ci` xanh.
PR: (xem mô tả PR)
Tầng: B
Quyết định: nâng drizzle-orm/vite/vitest lên bản mới nhất — bản ghim ban đầu
dính CVE (SQL injection ở drizzle-orm, path traversal ở vitest).
Kế tiếp: T-002 hoặc T-004 (không phụ thuộc nhau, chọn theo prio).

## 2026-09-11 — T-004 (chẻ task, không code)
Làm: T-002 đã có PR#14 mở (xanh, chờ duyệt) nên chọn T-004. Dựng xong toàn bộ
schema+migration+trigger+seed+test, `npm run ci` xanh — nhưng diff thật (kể cả
`meta/*.json` do drizzle-kit tự sinh) là 1054 dòng, vượt ngưỡng 1000. CLAUDE.md chỉ
trừ lockfile, không trừ snapshot tự sinh, và cấm tự cấp ngoại lệ. Bỏ toàn bộ code
(không commit), chẻ T-004 thành T-004a/b/c trong BACKLOG.md, chỉ mở PR chứa việc
chẻ này.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-004a.
## 2026-09-11 — T-008
Làm: copy tokens.css skill vào src/client/design/, self-host font Fira Sans
(TTF gốc mozilla/Fira → woff2, đủ dấu tiếng Việt), dựng 4 component dùng lại
(Nut, TruongNhap, Bang/OSo, BadgeTrangThai) có test.
PR: (xem mô tả PR)
Tầng: A
Quyết định: build font từ TTF gốc thay vì woff2 subset của Google Fonts vì bản
subset "latin" thiếu glyph tiếng Việt (ư, ơ, ệ...); TTF gốc có sẵn full Unicode.
Kế tiếp: T-002/T-004 đang chờ merge; T-009 hoặc T-020 sau khi T-004 xong.

## 2026-09-11 — T-002
Làm: branded types `Dong`/`SoLuongCoSo`/`SoLuongHienThi`/`Ulid` trong
`src/shared/kieu/`; số học tiền `chiaLayThuongVaDu`/`chiaLamTronNuaLen`/
`phanBoSoDuLonNhat` trong `src/shared/tien/`; ví dụ SPEC §3.4 là một test.
PR: (xem mô tả PR)
Tầng: B
Quyết định: chỉ một điểm chia `/` trần trong toàn tầng tiền (`chiaLayThuongVaDu`,
có eslint-disable tại chỗ); làm tròn nửa lên qua công thức nguyên
`floor((2a+b)/2b)` để tránh số thực.
Kế tiếp: T-004 (schema kho theo lô).

## 2026-09-11 (run dọn PR) — không chọn task mới
Làm: T-008 merge vào main khiến PR #14 và PR #15 đều conflict (cùng append
JOURNAL.md). Sửa PR #14: merge main, giải xung đột (giữ cả hai entry), `npm
run ci` xanh, push lại. PR #15 CHƯA sửa, vẫn conflict — dừng run tại đây theo
luật "một PR chưa xanh thì không mở task mới".
Kế tiếp: run sau sửa conflict PR #15 trước, rồi mới chọn task TODO mới.

## 2026-09-12 — dọn PR + chỉ đạo #quaythuoc-admin
Làm: không còn PR agent nào mở; PR#14 (T-002), PR#15 (chẻ T-004), PR#16 (T-008)
đều đã merge → chuyển T-002/T-008 sang DONE. Theo chỉ đạo Dương ở
#quaythuoc-admin (2026-09-11 22:25): thêm ngoại lệ vào CLAUDE.md — file migration
`drizzle-kit` tự sinh (`src/server/db/migrations/**`, cả `.sql` và `meta/*.json`)
không tính vào ngưỡng 1000 dòng/24 file, để khỏi lặp lại việc chẻ như T-004.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-004a, giờ có thể không cần chẻ do file snapshot đã được loại khỏi
ngưỡng đếm dòng.

## 2026-09-12 — T-003
Làm: quy đổi đơn vị trong `src/shared/don-vi/quy-doi.ts` — `quyDoiSangCoSo`
(nhân, hiển thị→cơ sở), `quyDoiTuCoSo` (chia lấy thương/dư, cơ sở→hiển thị),
`hienThiGanDung` (chuỗi "≈ 4,8 hộp", trả về `string` nên không quay lại tính
toán được); ví dụ SPEC.md §3.3 (5 hộp − 3 vỉ = 864 viên) là test.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-004a.

## 2026-09-12 — dọn PR + T-004a
Làm: không còn PR agent nào mở; PR#18 (T-003) đã merge → chuyển DONE. Chọn
T-004a: schema `chi_nhanh`, `san_pham` (`ma_hang` unique), `don_vi_tinh`
(`he_so >= 1`, `gia_ban >= 0`, unique tên/sản phẩm, unique index một đơn vị cơ
sở/sản phẩm qua partial index `WHERE la_co_so = 1`); test tích hợp SQLite
in-memory cho từng ràng buộc, viết trước và xác nhận đỏ (thiếu bảng) trước khi
thêm schema.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-004b (lô hàng + trigger cấp lô ngầm định).

## 2026-09-12 — dọn PR + T-004b
Làm: PR#19 (T-004a) đã merge → chuyển DONE. Chọn T-004b: bảng `lo_hang` (không
có `chi_nhanh_id` — một lô là một lô); trigger CSDL `AFTER INSERT ON san_pham`
tự cấp lô ngầm định (`so_lo`/`hsd` = NULL, `la_lo_mac_dinh` = true) qua migration
custom (`drizzle-kit generate --custom`, vì trigger không biểu diễn được trong
schema.ts); unique partial index chặn lô ngầm định thứ hai; unique
`(san_pham_id, so_lo, hsd)` chặn lô thật trùng. Test viết trước, xác nhận đỏ
đúng lý do (thiếu bảng, rồi thiếu trigger) trước khi thêm từng phần.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-004c (thẻ kho + tồn kho đệm + seed minh hoạ).
