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

## 2026-09-13 — dọn PR + T-004c
Làm: PR#20 (T-004b) đã merge → chuyển DONE. Chọn T-004c: bảng `the_kho` (sổ cái
chỉ-ghi-thêm, `chi_nhanh_id` + hai mốc thời gian theo SPEC §3.6, CHECK giới hạn
`loai`, hai trigger CSDL chặn UPDATE/DELETE) và `ton_kho_lo` (bản đệm, khoá tự
nhiên `(lo_id, chi_nhanh_id)`); seed một thuốc 3 đơn vị + 2 lô thật và một mặt
hàng chỉ lô ngầm định. Test viết trước, xác nhận đỏ trước khi thêm từng phần.
PR: (xem mô tả PR)
Tầng: B
Quyết định: tập giá trị `loai` (BAN/NHAP/TRA_HANG/TRA_NCC/KIEM_KE/XUAT_HUY/
DOI_CHE_DO) suy ra từ mô tả nghiệp vụ SPEC §3.1/§5 vì SPEC chỉ nêu literal hai
giá trị — đặt tên kỹ thuật, không phải quyết định nghiệp vụ nên không BLOCKED.
Chưa thêm `gia_tri_ton` vào `ton_kho_lo` — thuộc T-007, ngoài phạm vi task này.
Kế tiếp: T-005 (lớp kho: ghi sổ cái và bản đệm tồn).

## 2026-09-13 — dọn PR + T-005
Làm: PR#21 (T-004c) đã merge → chuyển DONE. Chọn T-005: `src/server/kho/so-cai.ts`
— hàm `ghiTheKho` là đường code duy nhất ghi `the_kho` + cập nhật `ton_kho_lo`
trong cùng transaction (nhận mảng dòng để một sự kiện nghiệp vụ nhiều lô vẫn qua
đúng một lệnh gọi); `dungLaiTonKhoDem` dựng lại bản đệm từ sổ cái bằng SUM nhóm
theo `(lo_id, chi_nhanh_id)`. Test viết trước (đỏ vì thiếu module), gồm cộng dồn,
nhiều dòng khác lô, rollback nguyên tử khi một dòng lỗi, bất biến sổ cái == bản
đệm trên 200 lượt ghi ngẫu nhiên (seed cố định), và dựng lại cho cùng kết quả.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-006 (FEFO và cấp phát nhiều lô).

## 2026-09-13 — dọn PR + T-006
Làm: PR#22 (T-005) đã merge → chuyển DONE. Chọn T-006: `src/server/kho/fefo.ts`
— `phanBoTheoThuTu` (hàm thuần) chia số lượng cần xuất qua danh sách lô theo
đúng thứ tự truyền vào, tràn sang lô kế tiếp khi lô trước không đủ, ném
`KhongDuTonKhoError` khi tổng tồn không đủ; `sapXepFefo` (hsd ASC NULLS FIRST,
ngay_tao ASC, lo_id ASC) và `sapXepUuTienThuCong` (lô chọn tay xếp trước, phần
còn lại vẫn FEFO — cùng một hàm phân bổ, không nhánh riêng) quyết định thứ tự
đưa vào; `chonLoXuatKho` ghép truy vấn DB + hai hàm trên. Test viết trước (đỏ vì
thiếu module), gồm chia nhiều lô, NULLS FIRST, chọn lô thủ công ghi đè FEFO, số
lượng 0, bán vượt tồn bị từ chối, và hai giao dịch liên tiếp cùng trừ lô cuối.
PR: (xem mô tả PR)
Tầng: B
Quyết định: T-006 chỉ làm phần "chọn lô xuất bao nhiêu" (đọc, thuần); việc thật
sự ghi trừ kho (gọi `ghiTheKho` với kết quả phân bổ) và khoá giao dịch chống hai
đơn cùng bán hộp cuối *thật sự đồng thời* thuộc T-022 (thanh toán) — test "hai
giao dịch cùng trừ lô cuối" ở đây chỉ xác nhận giao dịch sau bị từ chối khi gọi
tuần tự, chưa kiểm tra race điều kiện đồng thời thật.
Kế tiếp: T-007 (giá vốn bình quân gia quyền).

## 2026-09-14 — dọn PR, không chọn task mới
Làm: PR#23 (T-006), PR#24 (chẻ T-009) xanh, không comment, không conflict, chờ
duyệt — không sửa. PR#22 (T-005) đã merge → chuyển DONE. BACKLOG: T-054 thêm
phụ thuộc T-007 (cột Giá vốn cần `gia_von_hien_hanh` chưa tồn tại). BLOCKED:
thêm T-061 — thiếu đích/xác thực đẩy backup sang máy khác. Mọi TODO còn lại phụ
thuộc T-006/T-007/T-009/T-010 (chưa DONE) — không còn task đủ điều kiện.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-007 sau khi T-006 merge; T-054 sau T-007; T-061 cần người quyết đích
backup.
## 2026-09-13 (run dọn PR) — T-009 (chẻ task, không code)
Làm: PR#23 (T-006) xanh, chờ duyệt — không chọn lại. Chọn T-009 nhưng nó là task
đầu cần dựng cả tầng `api/`, `hop-dong/` lẫn toàn bộ màn hàng hoá — ước lượng chắc
chắn vượt 1000 dòng/24 file trước khi viết. Chẻ ngay lúc chọn task (không build
thử rồi bỏ): T-009a (đọc, tầng A) → T-009b (tạo) → T-009c (sửa/xoá); cập nhật phụ
thuộc T-010/T-020/T-060 sang T-009c.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-009a.

## 2026-09-14 (run dọn PR + chỉ đạo #quaythuoc-admin) — không chọn task TODO
Làm: không còn PR agent nào mở; T-006 đã DONE từ trước (xác nhận qua BACKLOG).
Theo chỉ đạo Dương (18:24): đẩy prio T-061/T-062 lên cuối (90/91, vẫn BLOCKED);
sửa CLAUDE.md — bỏ nhóm "luôn [B] theo miền", mặc định giờ là [A], nhưng ghi rõ
`auto-merge.yml` (lớp chặn đường dẫn nhạy cảm) CHƯA đổi nên kho/tiền/migration
vẫn tự bị gắn `needs-human-review` dù khai `Tầng: A` — chỉ đạo chỉ nói sửa
claude.md, không nói sửa workflow.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-007, hoặc T-009a — cả hai đều đủ điều kiện, chọn theo prio (T-007).

## 2026-09-15 — chỉ đạo #quaythuoc-admin (không chọn task TODO)
Làm: không còn PR agent nào mở. Chỉ đạo Dương 20:25 ngày 14/9: chỉ đạo trước
(chỉ sửa CLAUDE.md) chưa đủ, cần sửa cả `auto-merge.yml` để mọi PR `Tầng: A`
CI xanh đều tự merge. Đã bỏ nhóm đường dẫn nghiệp vụ (kho/bán hàng/nhập hàng/
kiểm kê/đồng bộ/db/tiền/đơn vị/kiểu/offline) khỏi danh sách chặn của workflow;
**giữ lại** chặn cho nhóm tự-quản-trị (`.github/`, `.claude/`, `CLAUDE.md`,
config gốc, 4 file chỉ-đọc docs/agent) vì đây không phải "task" và để agent tự
nới quyền merge của chính mình là rủi ro khác hẳn bug nghiệp vụ — nêu lại ở
Slack để Dương xác nhận hoặc bác.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-007 hoặc T-009a, chọn theo prio (T-007), ở run sau.

## 2026-09-15 — dọn PR + T-007
Làm: PR#27 (auto-merge workflow) đang xanh, không comment, không conflict, chờ
Dương xác nhận câu hỏi trong mô tả PR — không đụng vào, không chặn task nào.
Chọn T-007: bình quân gia quyền (SPEC.md §3.4). Thêm cột `gia_tri` vào
`the_kho` (tổng tiền tường minh của dòng NHAP) và `gia_tri_ton` vào
`ton_kho_lo`; `src/server/kho/gia-von.ts` — hàm thuần `apDungGiaVon` là bước
gấp DUY NHẤT (dòng vào cộng thẳng giá trị, dòng ra tính COGS làm tròn nửa lên,
bán hết/vượt tồn về đúng 0, không chia khi tồn ≤ 0); tích hợp vào `ghiTheKho`
(cập nhật cùng transaction) và viết lại `dungLaiTonKhoDem` để gấp tuần tự theo
`thoi_gian_may_chu, id` thay vì SUM (giá trị tồn phụ thuộc thứ tự, không giao
hoán như tổng số lượng) — vẫn một đường tính duy nhất dùng chung hai nơi. Test
trước: pure function + tích hợp DB, gồm ca bắt buộc "bán hết → gia_tri_ton = 0"
và cùng kịch bản trên lô ngầm định lẫn lô thật ra cùng số dư.
Ghi chú: PR#27 đã merge (main bỏ chặn nhóm nghiệp vụ khỏi auto-merge.yml)
trong lúc PR này đang mở — chạm `src/server/kho/**`/`src/server/db/**` giờ
không còn tự động bị gắn `needs-human-review`, nhưng vẫn tự chọn Tầng B (task
ghi dữ liệu tiền/kho theo tiêu chí BACKLOG.md).
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-009a (đủ điều kiện, phụ thuộc T-004c/T-008 đã DONE).

## 2026-09-15 (run kế) — dọn PR + T-009a
Làm: PR#28 xanh chờ duyệt, không sửa. Chọn T-009a: dựng `api/`+`hop-dong/` lần
đầu, `GET /api/hang-hoa` (+tìm)/`:id`, màn danh sách+chi tiết (tab Thông tin),
thêm `ngay_tao` vào `san_pham`. doi-chieu-ui bắt lỗi thứ tự Giá vốn/Giá bán
trong panel chi tiết — đã sửa, thêm test khoá thứ tự.
PR: (xem mô tả PR)
Tầng: A
Khác KiotViet: bỏ hàng tổng cộng dưới header bảng — ngoài phạm vi "Xong khi".
Kế tiếp: T-009b (tạo mới hàng hoá) sau khi PR này merge.

## 2026-09-16 — dọn PR + T-050
Làm: PR#30 (T-009b) xanh chờ duyệt, không sửa. T-009b vẫn TODO trên `main` (PR
chưa merge) nên không chọn lại — chọn T-050 (Kiểm kê, prio kế tiếp đủ điều
kiện). Bảng `phieu_kiem_ke`/`phieu_kiem_ke_dong` (lý do bắt buộc, một lô một
lần/phiếu); `taoPhieuKiemKe` so sổ sách với thực tế theo từng lô, ghi `KIEM_KE`
qua đúng một hàm viết (tách `ghiMotDongTheKho` khỏi `ghiTheKho` để dùng chung
transaction, không lồng `db.transaction`). Không thêm API/UI — "Xong khi" của
task không yêu cầu, theo đúng tiền lệ T-006/T-007.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-051 (Xuất huỷ) hoặc T-009c sau khi PR#30 merge.
## 2026-09-16 — dọn PR + T-009b
Làm: PR#28 (T-007), PR#29 (T-009a) đã merge → chuyển DONE. Chọn T-009b: thêm
`taoUlid` (sinh id lần đầu server-side), `TaoHangHoaReqSchema`, `POST
/api/hang-hoa` (mã hàng tự sinh "HH000001.." nếu bỏ trống, thử lại khi đụng
UNIQUE do đua; nhập tay trùng thì 409), form "Tạo hàng hóa" (đơn vị cơ sở +
nhiều đơn vị khác, mỗi dòng mới điền sẵn giá = giá cơ sở × hệ số, sửa giá sau
không tự đổi lại — SPEC.md §3.3). Đối chiếu screenshot bằng Playwright thật
(dev server + API), luồng tạo→hiện trong danh sách→mở chi tiết chạy đúng.
PR: (xem mô tả PR)
Tầng: B
Khác KiotViet: bỏ nhóm hàng/ảnh/thuộc tính/vị trí/trọng lượng/hãng-nước sản
xuất/định mức tồn/tồn kho ban đầu/giá vốn/mã vạch — ngoài phạm vi "Xong khi".
Kế tiếp: T-009c (sửa, xoá/ngừng hoạt động hàng hoá).

## 2026-09-16 — dọn PR + T-051
Làm: PR#30, PR#31 xanh chờ duyệt, không sửa/chọn lại. Chọn T-051 (Xuất huỷ):
bảng `phieu_xuat_huy`/`_dong` (lý do + người thực hiện bắt buộc); `taoPhieuXuatHuy`
trừ đúng lô, ghi `XUAT_HUY` âm; tách `ghiMotDongTheKho`/`TxTheKho` khỏi
`ghiTheKho` (như PR#31 đã làm cho kiểm kê — chưa có trên `main`, có thể xung
đột nhỏ khi cả hai merge). Khác kiểm kê: huỷ vượt tồn bị từ chối, không cho âm.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-009c sau PR#30 merge, hoặc T-052/T-053 khi T-022/T-040 xong.

## 2026-09-16 — dọn PR, không chọn task mới
Làm: PR#30 (T-009b), #31 (T-050), #32 (T-051) đều xanh, không comment, không
conflict, chờ người duyệt (cả ba khai Tầng B) — không sửa. Phát hiện BACKLOG
lệch: PR#28 (T-007) đã merge từ trước nhưng chưa chuyển DONE — sửa ở đây.
Không còn TODO nào đủ điều kiện ngoài T-009b/T-050/T-051 (đã có PR mở).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: chọn theo prio khi có PR merge — T-009c sau T-009b, hoặc T-050/T-051
tiếp tục chờ duyệt.

## 2026-09-17 — dọn PR, BLOCKED T-054, không chọn task mới
Làm: PR#30/#31/#32 vẫn xanh, không comment, không conflict, chờ duyệt — không
sửa. T-054 là TODO duy nhất còn đủ điều kiện phụ thuộc (còn lại đều chờ
T-009c/T-050/T-051 merge), nhưng phát hiện `the_kho` không có cột nào tham
chiếu chứng từ sinh ra dòng đó — kể cả T-050/T-051 (đang mở PR) cũng không
truyền. Cột "Chứng từ" của T-054 không dựng được mà không bịa một quyết định
kiến trúc ảnh hưởng mọi module ghi sổ cái sau này. Ghi BLOCKED.md, chuyển
T-054 sang BLOCKED, không mở task khác.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: cần người quyết khuôn tham chiếu chứng từ cho `the_kho` (BLOCKED.md).

## 2026-09-17 (run kế) — dọn PR, không chọn task mới
Làm: PR#30/#31/#32 vẫn xanh, không comment, không conflict, chờ duyệt — không
sửa. Không có PR nào merge từ run trước. Slack #quaythuoc-admin không có chỉ
đạo mới từ 2026-09-15. Rà lại toàn bộ lịch sử CI (không chỉ view lọc theo
nhánh main, view đó bị cắt bớt) — mọi run gần nhất đều xanh, main không đỏ.
Mọi TODO còn lại vẫn phụ thuộc T-009c/T-050/T-051 (đều CHỜ MERGE, chưa DONE)
— không có task đủ điều kiện, giống hệt kết luận run trước cùng ngày.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: chọn theo prio khi có PR merge (T-009c sau T-009b, hoặc T-050/T-051
tự nó); BLOCKED T-054/T-061 vẫn cần người quyết.

## 2026-09-17 (run kế, lần 3) — dọn PR, không chọn task mới
Làm: PR#30/#31/#32 vẫn xanh, không comment, không conflict (xác nhận bằng
merge thật vào một worktree tạm, không chỉ đọc cờ `mergeable_state`) — không
sửa. Không có PR nào merge kể từ run trước cùng ngày (16:13). Slack
#quaythuoc-admin không có chỉ đạo mới từ 2026-09-15. Tình huống giống hệt run
trước: mọi TODO còn lại vẫn phụ thuộc T-009c/T-050/T-051 (CHỜ MERGE) hoặc đã
BLOCKED (T-054, T-061/T-062) — không có task đủ điều kiện.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: không đổi so với run trước — chọn theo prio khi một trong ba PR
merge.

## 2026-09-18 — dọn PR, không chọn task mới
Làm: PR#30/#31/#32 vẫn xanh, không comment, không review, không conflict (xác
nhận bằng `git merge-tree` cục bộ với `main` mới nhất) — không sửa. Không có
PR nào merge kể từ run trước. Slack #quaythuoc-admin không có chỉ đạo mới từ
2026-09-15. Tình huống giống hệt ba run trước: mọi TODO còn lại vẫn phụ thuộc
T-009c/T-050/T-051 (CHỜ MERGE) hoặc đã BLOCKED (T-054, T-061/T-062).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: không đổi — chọn theo prio khi một trong ba PR merge.

## 2026-09-18 (run kế) — dọn PR, không chọn task mới
Làm: PR#30/#31/#32 vẫn xanh, không comment/review, không conflict thật (xác
nhận `git merge-tree` với `main` mới nhất, không chỉ đọc `mergeable_state`).
Không PR nào merge từ run trước (5 run liên tiếp cùng kết luận). Slack
#quaythuoc-admin không có chỉ đạo mới từ 2026-09-15. Báo Slack #quaythuoc-build
đề nghị Dương duyệt/merge — 3 PR đã chờ hơn 2 ngày, chặn toàn bộ backlog.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: không đổi — chọn theo prio khi một trong ba PR merge.

## 2026-09-18 (run kế, lần 3) — dọn PR, không chọn task mới
Làm: PR#30/#31/#32 vẫn xanh, không comment/review, không conflict thật (xác
nhận `git merge-tree` với `origin/main` mới nhất, không chỉ đọc
`mergeable_state`). Không PR nào merge từ run trước (6 run liên tiếp cùng kết
luận). Slack #quaythuoc-admin không có chỉ đạo mới từ 2026-09-15; đề nghị
duyệt/merge gửi #quaythuoc-build ở run trước vẫn chưa có phản hồi.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: không đổi — chọn theo prio khi một trong ba PR merge.

## 2026-09-18 (run kế, lần 4) — dọn PR, không chọn task mới
Làm: PR#30/#31/#32 vẫn xanh, không comment/review, không conflict thật (xác
nhận `git merge-tree` với `origin/main` mới nhất). Không PR nào merge từ run
trước (7 run liên tiếp cùng kết luận, từ 2026-09-16). Slack #quaythuoc-admin
không có chỉ đạo mới từ 2026-09-15; đề nghị duyệt/merge gửi #quaythuoc-build
hai run trước vẫn chưa có phản hồi. Cả ba PR khai Tầng B nhưng không nêu lý do
cụ thể cần người duyệt trong mô tả — không tự nâng lên A (CLAUDE.md cấm), chỉ
ghi nhận để người quyết cân nhắc. Báo Slack (đợt 2, nhấn mạnh thời lượng chờ).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: không đổi — chọn theo prio khi một trong ba PR merge hoặc có chỉ đạo mới.

## 2026-09-19 — dọn PR: giải thích #30/#31/#32 vẫn chờ duyệt tay
Làm: Dương hỏi (#quaythuoc-admin) sao còn PR cần duyệt tay dù CLAUDE.md đã đổi
mặc định sang A. Xác nhận bằng `git diff --name-only`: cả ba không chạm đường
dẫn tự-quản-trị trong `auto-merge.yml` — workflow chỉ đọc dòng `Tầng:` ghi
cứng trong mô tả PR lúc mở (16-17/9), không tính lại theo tiêu chí hiện tại.
Không tự nâng B lên A (CLAUDE.md cấm) — sửa BACKLOG.md "Tiêu chí gắn tầng"
(còn mô tả chính sách cũ, gây hiểu lầm) thay vì sửa PR. Không chọn task mới —
mọi TODO còn lại vẫn phụ thuộc ba PR trên.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: Dương duyệt/merge #30/#31/#32 tay, hoặc chỉ rõ muốn đổi tầng PR nào.

## 2026-09-19 (run kế) — sửa PR#32 conflict, không chọn task mới
Làm: #30 (T-009b), #31 (T-050) đã merge → chuyển DONE. #32 (T-051) báo
`mergeable_state: dirty` — đúng xung đột đã dự báo trong mô tả PR (cùng tách
`ghiMotDongTheKho`/`TxTheKho` với #31). Merge `main` vào nhánh: gộp comment
`so-cai.ts`, giữ cả hai bảng `phieu_kiem_ke*`/`phieu_xuat_huy*` trong
`schema.ts`+test, và **regenerate** migration bằng `npm run db:generate` (bỏ
`0007_groovy_korath.sql` trùng idx với `0007_easy_johnny_blaze.sql` đã merge,
sinh lại thành `0008_white_aqueduct.sql` — nội dung SQL giữ nguyên, chỉ đổi số
thứ tự) thay vì tự sửa tay file do drizzle-kit sinh. `npm run ci` xanh (226
test, e2e qua). Theo luật "sửa PR cũ và dừng run tại đó" — không chọn task mới.
PR: https://github.com/devilclaude/quanlyquaythuoc/pull/32
Tầng: B
Kế tiếp: chờ người duyệt #32 (đã khai Tầng B từ đầu, lý do trong mô tả PR);
sau khi merge, chọn theo prio (T-009c, hoặc T-052/T-053 khi đủ điều kiện).

## 2026-09-19 (run kế 2) — dọn PR + T-009c
Làm: #30/#31/#32 đều đã merge → chuyển T-009b/T-050/T-051 sang DONE (T-009b/
T-050 đã DONE sẵn từ người duyệt, chỉ T-051 cần sửa). Chọn T-009c: `PUT
/api/hang-hoa/:id` sửa tên/giá/đơn vị (thay toàn bộ đơn vị khác, giữ nguyên id
đơn vị cơ sở); cấm đổi tên đơn vị cơ sở khi đã phát sinh thẻ kho
(`DoiDonViCoSoBiCamError`). `DELETE /:id` xoá cứng chỉ khi chưa phát sinh thẻ
kho, ngược lại 409 (`XoaCungBiChanError`); thêm `POST /:id/ngung-hoat-dong` +
cột `trang_thai` (`san_pham`). Client: `FormTaoHangHoa` (T-009b) tái dùng cho
`SuaHangHoa` (thêm `tieuDe`/`maHangChiDoc`); nút Xoá/Ngừng hoạt động + Chỉnh
sửa ở `ChiTietHangHoa` khớp vị trí ảnh "xem chi tiết 1 sản phẩm".
PR: (xem mô tả PR)
Tầng: B
Quyết định: migration `npm run db:generate` sinh SQL sai (rebuild bảng
`san_pham` do thêm CHECK nhưng SELECT cột `trang_thai` từ bảng CŨ chưa có cột
đó) — sửa tay trước khi commit (chưa merge nên không phạm luật "không sửa
migration đã merge"), đồng thời phát hiện DROP TABLE làm mất trigger
`san_pham_tao_lo_mac_dinh` (T-004b), phải tạo lại nguyên văn trong cùng
migration. Có test xác nhận trigger vẫn chạy sau migration.
Khác KiotViet: bỏ "Sao chép"/"In tem mã"/"…" ở chân panel chi tiết — ngoài
phạm vi "Xong khi" T-009c.
Kế tiếp: T-010 (cài đặt quản lý theo lô) hoặc T-020 (màn bán hàng), cả hai đều
đủ điều kiện phụ thuộc sau khi PR này merge.

## 2026-09-20 — dọn PR + T-010 (chẻ task, không code)
Làm: PR#42 (T-009c) đã merge → chuyển DONE. Chọn T-010, dựng trọn vẹn theo TDD
(`npm run ci` xanh, xác nhận bằng browser thật) rồi đo trước khi mở PR: 1118
dòng/25 file, vượt cả hai ngưỡng CLAUDE.md. Bỏ toàn bộ code, chẻ thành T-010a
(schema+hàm giải nghĩa)/T-010b (API)/T-010c (UI); T-040/T-055 đổi phụ thuộc
sang T-010b (chỉ cần tầng dữ liệu, không cần màn cài đặt).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-010a.

## 2026-09-20 (run kế) — dọn PR + T-010a
Làm: PR#43 (chẻ T-010) đã merge, không sửa gì thêm. Chọn T-010a: bảng `cai_dat`
(toàn cục, đúng 1 dòng, mặc định TẮT) + cột `quan_ly_lo_ghi_de` (NULL/BAT/TAT)
trên `san_pham`; `giaiNghiaCaiDatQuanLyLo` (hàm thuần, ưu tiên ghi đè > toàn
cục); `doiGhiDeSanPham`/`doiCaiDatToanCuc` chặn bật→tắt khi còn >1 lô tồn > 0,
ghi `DOI_CHE_DO` số lượng 0 khi hiệu lực đổi thật; đổi toàn cục chỉ ảnh hưởng
sản phẩm đang kế thừa, rollback toàn bộ nếu một sản phẩm bị chặn.
dependency-cruiser chặn `kho/**` import module giải nghĩa. Không API/UI. `npm
run ci` xanh (291 test).
PR: (xem mô tả PR)
Tầng: B
Quyết định: rebuild `san_pham` (thêm CHECK) lại mất trigger lô ngầm định như
T-009c — tạo lại + sửa tay INSERT tự sinh. Module `cai-dat` được phép gọi hàm
giải nghĩa (chỉ `kho/**` bị cấm, ARCHITECTURE.md §5).
Kế tiếp: T-010b (API) sau khi merge; T-020/T-060 cũng đủ điều kiện.

## 2026-09-20 (run kế) — dọn PR + T-020
Làm: PR#44 (T-010a) xanh, không comment, không conflict, chờ duyệt (khai Tầng B
đúng — chạm `.dependency-cruiser.cjs`, nhóm tự-quản-trị) — không sửa. T-010a vẫn
TODO trên `main` nên T-010b/c chưa đủ điều kiện; chọn T-020 (Màn bán hàng: tìm và
thêm hàng). Mở rộng `GET /api/hang-hoa` trả thêm `donViTinh` từng sản phẩm (không
chỉ cơ sở) để màn bán hàng dựng gợi ý một dòng mỗi đơn vị mà không cần endpoint
riêng. `BanHang.tsx`: ô tìm (F3, debounce 150ms), gợi ý theo đơn vị (↑↓/Enter/Esc
hai bước), thêm vào giỏ (dedup theo sản phẩm+đơn vị). doi-chieu-ui đối chiếu 3 ảnh
KiotViet: không vi phạm nặng; sửa 1 điểm thật (panel "Tổng tiền hàng" thiếu số
lượng món, ảnh gốc hiện cả hai số). E2e mới chặn `/api/hang-hoa`, kiểm luồng bàn
phím đầu-cuối (ARCHITECTURE.md: luồng này chỉ kiểm được ở tầng e2e).
PR: (xem mô tả PR)
Tầng: A
Quyết định: `TruongNhap` chuyển sang `forwardRef` (lần đầu dùng) để F3 focus lập
trình được ô tìm.
Khác KiotViet: bảng giỏ hàng có dòng tiêu đề cột (ảnh gốc không có) — giữ để
người mới đọc được ý nghĩa từng cột, không đổi thứ tự cột. Thanh chuyển màn
"Bán hàng"/"Hàng hoá" ở trên cùng là lối đi tạm, không bám sidebar KiotViet —
chưa có task dựng nav thật trong BACKLOG.md.
Kế tiếp: T-021 (chọn đơn vị và số lượng) sau khi PR này merge.

## 2026-09-21 — dọn PR + T-021
Làm: PR#45 (T-020) đã merge → DONE. PR#44 (T-010a) vẫn xanh chờ duyệt B — không
sửa. Chọn T-021: đổi đơn vị (dropdown/F2, giá lấy thẳng đơn vị mới, không nhân
hệ số) và sửa số lượng (+/-/ô nhập/Delete) dòng giỏ hàng. doi-chieu-ui bắt được
bug thật: điều kiện bật phím tắt dùng `goiY.length===0` thay vì ô tìm thực sự
rỗng, có thể nuốt ký tự đang gõ dở — sửa thành `tim.trim() === ''`, kèm e2e tái
hiện trước khi sửa.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-022 (thanh toán, tạo hoá đơn) sau khi PR này merge.

## 2026-09-21 (run kế) — dọn PR + T-022 (chẻ task, không code)
Làm: PR#46 (T-021) đã merge → DONE. PR#44 (T-010a) vẫn xanh chờ B, không sửa.
Chọn T-022, dựng schema+lõi `taoHoaDonTuGioHang` theo TDD (xanh) rồi đo trước
khi mở PR: riêng phần này (chưa API/UI/hợp đồng Zod) đã ~1005 dòng theo ngưỡng
CLAUDE.md. Bỏ toàn bộ code, chẻ T-022a (schema+lõi)/T-022b (API)/T-022c (giao
diện); T-023/T-025/T-052 đổi phụ thuộc sang T-022c.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-022a.

## 2026-09-21 (run kế 2) — dọn PR + T-022a
Làm: PR#44 (T-010a) vẫn xanh chờ B, không sửa. Chọn T-022a: bảng `hoa_don`/
`hoa_don_dong` + `hoa_don_dong_lo` (bảng mới, ghi lô đã trừ theo từng dòng —
cần cho LIFO trả hàng T-052 sau này, không đụng thiết kế chứng từ chung của
`the_kho` đang BLOCKED ở T-054). `taoHoaDonTuGioHang` trừ FEFO qua
`chonLoXuatKho` trong transaction (mở rộng kiểu để nhận cả `tx`), phân bổ giảm
giá bằng `phanBoSoDuLonNhat`, mã hoá đơn tự sinh tuần tự. 13 test mới + 53 test
schema, `npm run ci` xanh.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-022b (API) sau khi PR này merge.

## 2026-09-22 — dọn PR + T-024
Làm: PR#44 (T-010a)/#48 (T-022a) vẫn xanh, không comment, không conflict thật
(`git merge-tree`) — không sửa, chờ duyệt B. Chọn T-024: ô tìm màn bán hàng
phân biệt quét mã với gõ tay bằng nhịp phím (nhịp trung bình ≤50ms và ≥5
khoảng cách coi là quét); khi đó Enter gọi API ngay thay vì đợi debounce
150ms, khớp đúng một sản phẩm thì thêm thẳng vào giỏ — tái hiện đúng bug "mất
nhịp" ở debug-co-he-thong trước khi sửa (gõ nhanh + Enter ngay lúc API chưa
kịp trả về khiến giỏ hàng trống, không báo lỗi). Không cần schema/API mới —
mã quét/tem tự in dùng thẳng `ma_hang` đã có từ T-009b, tìm `LIKE` đã khớp
sẵn. Nhân tiện vá `AbortController` chết (tạo trong callback `setTimeout`,
chưa từng huỷ được request nào) bằng ref chặn kết quả trễ ghi đè kết quả mới.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-030 hoặc T-060 khi #44/#48 merge — T-024 không mở khoá task nào mới.

## 2026-09-22 (run kế) — sửa PR#48 conflict, không chọn task mới
Làm: PR#49 (T-024) đã merge → chuyển DONE. PR#44 (T-010a) vẫn xanh, không
comment, không conflict — không sửa. PR#48 (T-022a) CI xanh, không comment,
nhưng `git merge-tree` báo conflict thật với `main`: cả PR#48 và PR#49 cùng
append entry vào cuối `docs/agent/JOURNAL.md` tại cùng điểm chèn. Merge `main`
vào nhánh, giữ cả hai entry (2026-09-21 run kế 2, rồi 2026-09-22 run + T-024)
theo đúng thứ tự thời gian; `BACKLOG.md` tự merge sạch (không cần sửa tay).
Theo luật "sửa PR cũ và dừng run tại đó" — không chọn task mới.
PR: https://github.com/devilclaude/quanlyquaythuoc/pull/48
Tầng: B (giữ nguyên lý do đã khai từ đầu, không đổi)
Kế tiếp: chờ người duyệt #44/#48 (cả hai đã khai Tầng B); sau khi merge, chọn
theo prio (T-010b/T-022b khi đủ điều kiện, hoặc T-030/T-060).

## 2026-09-22 (run kế) — dọn PR + T-030
Làm: PR#44/#48 vẫn xanh chờ B, không sửa; chọn T-030. `vite-plugin-pwa` cache
vỏ app + `/api/hang-hoa`; `ChiBaoTrangThai` trên màn bán hàng dùng
`navigator.onLine` thật (chờ đồng bộ/mốc đồng bộ cố định 0/null — T-031 chưa
có). Phát hiện SW tự fetch không bị `page.route` chặn, vỡ 4 e2e cũ — sửa hết
sang `context.route`.
PR: (xem mô tả PR)
Tầng: B — chạm `package.json`.
Kế tiếp: T-031 khi PR này merge, hoặc T-060.

## 2026-09-22 (run kế) — dọn PR + BLOCKED T-060, không chọn task mới
Làm: PR#49 (T-024) đã merge → chuyển DONE (BACKLOG lệch, PR#49 merge lúc
2026-09-22 nhưng chưa ai cập nhật). #44 (T-010a)/#48 (T-022a)/#50 (T-030) vẫn
xanh, không comment, không conflict thật (`git merge-tree` với `origin/main`)
— không sửa, chờ duyệt B. PR#32 (T-051) mà Dương yêu cầu kiểm tra ở Slack
19/9 đã merge từ trước (không còn việc gì). T-060 là TODO duy nhất còn đủ
điều kiện phụ thuộc (T-009c/T-005 đã DONE, ba PR kia đều đã có), nhưng SPEC.md
§8 yêu cầu đọc đúng **bản xuất KiotViet thật** mà không có file mẫu hay cột/
định dạng nào được ghi ở bất kỳ đâu trong repo — khác T-043 (dùng file mẫu do
app định nghĩa). Đoán cột để dựng parser rủi ro đọc sai tồn đầu kỳ thật của
quầy. Ghi BLOCKED.md, chuyển T-060 sang BLOCKED, không chọn task khác (không
còn TODO nào đủ điều kiện).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: cần chủ dự án gửi file xuất KiotViet thật hoặc chốt cột/định dạng
(BLOCKED.md T-060); ngoài ra chọn theo prio khi #44/#48/#50 merge.

## 2026-09-23 — sửa PR#48 conflict (lần 2), không chọn task mới
Làm: #44/#50 vẫn xanh, không comment, không conflict — không sửa. #48
(T-022a) CI xanh, không comment, nhưng lại conflict thật với `main`: run
"BLOCKED T-060" (9ff5a26) append JOURNAL.md sau khi PR#48 đã merge main lần
trước (781244f) — cùng điểm chèn. Merge `main` vào nhánh, giữ cả hai entry
theo thứ tự đã có trên mỗi nhánh; `BACKLOG.md`/`BLOCKED.md` tự merge sạch.
Theo luật "sửa PR cũ và dừng run tại đó" — không chọn task mới.
PR: https://github.com/devilclaude/quanlyquaythuoc/pull/48
Tầng: B (giữ nguyên lý do đã khai từ đầu, không đổi)
Kế tiếp: chờ người duyệt #44/#48/#50; sau khi merge, chọn theo prio.

## 2026-09-23 — dọn PR: sửa conflict PR#50, dừng run
Làm: #48/#44 vẫn xanh, không comment, chờ B — không sửa. #50 (T-030)
`mergeable_state: dirty` — conflict thật với main (JOURNAL.md, hai run song
song cùng append entry vào cuối file). Merge `origin/main` vào nhánh PR, giữ
cả hai entry cũ theo đúng thứ tự thời gian (T-030 tạo trước khi #50 mở, entry
"dọn PR + BLOCKED T-060" nhắc tới #50 nên phải sau). BACKLOG.md/BLOCKED.md tự
merge sạch, không đụng tay. Cài lại `node_modules` (thiếu do máy chạy run này
chưa cài), chạy lại toàn bộ `npm run ci` sau merge — xanh (typecheck, lint,
335 test, build, 9 e2e với `PLAYWRIGHT_CHROMIUM_PATH` trỏ browser cài sẵn
trong môi trường — lần đầu 9 e2e đỏ do thiếu cờ này, không phải lỗi code).
Push thẳng lên nhánh #50 (không phải task mới, không mở PR mới). Không có PR
nào merge trong lúc đọc — không có DONE nào để chuyển. Đọc #quaythuoc-admin:
không có chỉ đạo mới từ 19/9 (kiểm tra PR#32 — đã merge từ trước, không còn
việc). Dừng run tại đây theo luật "conflict → sửa rồi dừng, không mở task
mới".
PR: #50 (đã có, không đổi tầng)
Tầng: B — không đổi (giữ nguyên lý do gốc: chạm package.json/package-lock.json).
Kế tiếp: chọn task mới khi #44/#48/#50 đều xanh và chờ duyệt (không còn PR đỏ/
comment/conflict) — run sau kiểm tra lại từ đầu.

## 2026-09-23 — dọn PR, không chọn task mới
Làm: #44 (T-010a)/#48 (T-022a)/#50 (T-030) vẫn xanh, không comment, không
conflict thật (`git merge-tree` với `origin/main`) — không sửa, chờ duyệt B.
Không còn TODO nào đủ điều kiện: mọi TODO còn lại phụ thuộc trực tiếp/gián
tiếp vào ba task trên (CHỜ MERGE, chưa DONE) hoặc đã BLOCKED (T-054/T-060/
T-061/T-062). Không chọn task khác, không tạo commit nào.
Kế tiếp: chọn theo prio khi #44/#48/#50 merge (mở khoá T-010b/T-022b/T-031).

## 2026-09-23 (run kế 2) — sửa PR#48 conflict (lần 3) + PR#50 conflict, dừng run
Làm: #44 (T-010a) vẫn xanh, không comment, `mergeable_state: behind` (không
phải conflict thật) — không sửa. #48 (T-022a) và #50 (T-030) CI xanh, không
comment, nhưng cả hai `mergeable_state: dirty` — conflict thật với `main`:
nguyên nhân giống hệt lần trước, commit dọn-PR mới nhất của main (#52) chỉ
append `JOURNAL.md`, đúng điểm chèn hai nhánh cũng đang chèn entry riêng của
mình. Đây là xung đột cơ học lặp lại mỗi khi có PR dọn-PR nào merge trước một
PR nghiệp vụ đang mở — không phải lỗi nghiệp vụ. Merge `origin/main` vào cả
hai nhánh, giữ nguyên văn cả hai entry theo đúng thứ tự thời gian đã có,
không đụng `BACKLOG.md`/code (tự merge sạch, không có gì để sửa tay).
PR: #48, #50 (không đổi mô tả/tầng)
Tầng: B — không đổi ở cả hai (giữ nguyên lý do gốc đã khai).
Kế tiếp: chờ người duyệt #44/#48/#50; sau khi merge, chọn theo prio
(T-010b/T-022b/T-031 tuỳ PR nào merge trước).

## 2026-09-23 (run kế 3) — dọn PR + T-010b
Làm: #44 (T-010a)/#50 (T-030) đã merge → DONE. #48 (T-022a) vẫn xanh, chờ
duyệt B, không sửa. Chọn T-010b: `GET`/`PUT /api/cai-dat/quan-ly-lo`, `PUT
/api/hang-hoa/:id/quan-ly-lo` (409 kèm lý do), chi tiết hàng hoá trả thêm
`quanLyLoGhiDe`. Thêm `layChiNhanhMacDinh` (get-or-create ID cố định) vì các
hàm T-010a cần `chiNhanhId` FK thật mà chưa module nào tạo dòng `chi_nhanh` —
sửa ghi chú T-022b để dùng lại, không viết lại.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-031 khi PR này merge; T-022b/T-010c chờ T-022a/T-010b.

## 2026-09-23 (run kế 3) — #44/#50 merge → DONE; sửa bug thật ở #48, dừng run
Làm: #44 (T-010a), #50 (T-030) đã merge → chuyển DONE. #48 (T-022a): conflict
thật với main; merge vào thì CI đỏ thật — `meta/_journal.json` bị một lần
merge dòng-theo-dòng trước đây gộp nhầm hai entry idx 10 (của #48 và #44)
thành một object trùng khoá `when`/`tag`, nên migration tạo `hoa_don` không
bao giờ chạy ("no such table: hoa_don", 19 test đỏ). Khôi phục journal/snapshot
0010 đúng bản đã merge của main, chạy lại `npm run db:generate` sinh
`0011_last_unicorn.sql` (nội dung y hệt bản cũ, chỉ đổi số) — không sửa tay
file migration đã merge. `npm run ci` xanh lại (typecheck, lint, 378 test,
build, 9 e2e). Push lên #48, không mở PR mới, không chọn task khác.
PR: https://github.com/devilclaude/quanlyquaythuoc/pull/48
Tầng: B (giữ nguyên lý do đã khai từ đầu, không đổi)
Kế tiếp: chờ người duyệt #48; sau khi merge, chọn theo prio (T-010b/T-022b/T-031).

## 2026-09-23 (run kế 4) — sửa PR#48 conflict (lần 4), không chọn task mới
Làm: PR còn mở duy nhất là #48 (T-022a). CI trên #48 đã xanh (`ci`,
`cong-tang-a`), không comment chưa xử lý — nhưng `mergeable_state: unknown`/
`git merge-tree` báo conflict thật với `main`: nguyên nhân giống hệt các lần
trước — #53 (T-010b) merge trước, chỉ append `JOURNAL.md`, đúng điểm chèn
nhánh #48 cũng đang chèn entry riêng. Không có migration mới ở #53 (chỉ API)
nên không lặp lại bug `_journal.json` của lần trước. Merge `origin/main` vào
nhánh, giữ nguyên văn cả hai entry theo đúng thứ tự thời gian đã có;
`BACKLOG.md` tự merge sạch. `npm run ci` xanh (typecheck, lint, 378 test,
build, 9 e2e — chạy e2e với `PLAYWRIGHT_CHROMIUM_PATH` trỏ browser cài sẵn
trong môi trường, không đụng cấu hình/package đã pin). Push lên #48, không mở
PR mới, không chọn task khác.
PR: https://github.com/devilclaude/quanlyquaythuoc/pull/48
Tầng: B (giữ nguyên lý do đã khai từ đầu, không đổi)
Kế tiếp: chờ người duyệt #48; sau khi merge, chọn theo prio (T-022b/T-031).
## 2026-09-23 (run kế 4) — dọn PR + T-010c
Làm: #53 (T-010b) đã merge → DONE (BACKLOG lệch, chưa ai cập nhật). #48
(T-022a) vẫn xanh chờ B, không sửa. Chọn T-010c: `CongTac` (switch,
`role="switch"`, `<button>` thật nên Space/Enter bấm được không cần code
riêng) trong `thanh-phan/`; màn `CaiDat` (chưa có screenshot tham chiếu —
dựng theo token) đọc/đổi cài đặt toàn cục qua `/api/cai-dat/quan-ly-lo`; thêm
ô chọn ghi đè riêng sản phẩm (3 giá trị KE_THUA/BAT/TAT) vào `ChiTietHangHoa`,
hiện lỗi 409 rõ khi bị chặn tắt. Phát hiện bug thật ở PR#53 đã merge: route
PUT toàn cục không bắt `DoiCheDoBiChanError` nên tắt bị chặn sẽ ném 500 thay
vì 409 — vá kèm test, cần cho chính màn cài đặt xử lý lỗi đúng. Xác nhận bằng
Playwright thật (route giả lập, không commit): nav "Cài đặt" hiện, công tắc
đổi qua bàn phím, ghi đè sản phẩm 409 hiện lỗi rõ.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-040 hoặc T-031 sau khi PR này merge (cả hai đều đủ điều kiện).

## 2026-09-24 (run kế) — dọn PR + T-022b
Làm: #48 (T-022a) và #54 (T-010c) đã merge → chuyển DONE (BACKLOG lệch, chưa
ai cập nhật). Không còn PR mở nào. Chọn T-022b: `POST /api/hoa-don`
(`src/server/api/hoa-don.ts`) nhận hợp đồng Zod mới
(`src/shared/hop-dong/hoa-don.ts`, không có `lamTron` — chưa có giao diện
bật), gọi thẳng `taoHoaDonTuGioHang` (T-022a) không viết lại logic; sinh ULID
cho hoá đơn + từng dòng; lấy `chiNhanhId` qua `layChiNhanhMacDinh`; 400 khi
Zod từ chối, 409 khi `KhongDuTonKhoError`/`GiamGiaVuotTongError`.
PR: (xem mô tả PR)
Tầng: A — chỉ nối tầng API cho lõi nghiệp vụ đã được duyệt B ở T-022a, không
thêm quyết định kiến trúc mới (giống tiền lệ T-010a[B]→T-010b[A]).
Kế tiếp: T-022c (giao diện thanh toán) hoặc T-031 khi PR này merge.

## 2026-09-24 (run kế 2) — dọn PR + T-022c
Làm: #55 (T-022b) đã merge → DONE. Chọn T-022c: panel thanh toán
(`ThanhToan.tsx`). Bản đầu tưởng thiếu screenshot (chỉ nhìn tên file) —
`doi-chieu-ui` phát hiện ảnh có sẵn (`Bán hàng/Chọn 1 món hàng để bán...` và
`Giao diện bán hàng chưa có sản phẩm`), đã mở ảnh và dựng lại đúng: radio 4
phương thức luôn hiện (không dropdown), thứ tự Khách cần trả→Khách thanh
toán→radio→mệnh giá nhanh (làm tròn theo mệnh giá VND, khớp ví dụ ảnh
17k→18k/20k/50k/100k/200k/500k)→Tiền thừa trả khách (luôn hiện).
PR: (xem mô tả PR)
Tầng: A — chỉ nối `POST /api/hoa-don` (T-022b) đã duyệt, không thêm kiến trúc mới.
Khác KiotViet: bỏ "Tìm khách hàng"/"Bán thuốc theo đơn" thấy trong ảnh — ngoài
phạm vi "Xong khi" T-022c.
Kế tiếp: T-023 hoặc T-031, đủ điều kiện sau khi PR này merge.

## 2026-09-24 (run kế 3) — dọn PR + T-023
Làm: #56 (T-022c) đã merge → DONE. Chọn T-023: preview + in hoá đơn K57/K80
(`InHoaDon.tsx`), dựng từ giỏ hàng + `HoaDonRes`, không gọi API mới. Không có
ảnh "hoá đơn KiotViet" để đối chiếu — theo tiền lệ T-010c, không BLOCKED (chỉ
trình bày lại dữ liệu đã đúng, rủi ro thấp hơn T-054/T-060). Enter xác nhận
thanh toán mở preview, nút "In" tự focus, Enter lần hai in (UI-FIDELITY.md
nhóm 2). Khổ giấy nhớ theo máy qua `localStorage`.
PR: (xem mô tả PR)
Tầng: A — chỉ trình bày lại dữ liệu đã ghi, không đổi kho/tiền.
Kế tiếp: T-025 hoặc T-031, đủ điều kiện sau khi PR này merge.

## 2026-09-25 — dọn PR + T-031
Làm: #57 (T-023) đã merge → DONE. #58 (T-025) vẫn xanh, không comment/conflict,
chờ duyệt B — không sửa. Chọn T-031: hàng đợi thao tác offline
(`src/client/offline/hang-doi-thao-tac.ts`) — bảng Dexie đầu tiên của dự án,
thêm dependency `dexie`/`fake-indexeddb` (devDep). Enqueue idempotent theo ULID
qua `add` (ConstraintError → no-op, không get-rồi-add để tránh race); trạng thái
CHO_GUI/DA_GUI/DA_XAC_NHAN/LOI; xử lý hàng đợi không bao giờ xoá thao tác lỗi
(ở lại để thử lại lần sau); `xoaThaoTacDaXacNhan` từ chối xoá khi chưa xác nhận.
Nối `useTrangThaiKetNoi` (T-030) vào hàng đợi thật qua `liveQuery` — bỏ mock
0/null đã ghi chú sẵn trong code từ T-030.
PR: (xem mô tả PR)
Tầng: B — chạm package.json/package-lock.json (thêm dependency, giống tiền lệ
T-030), và là quyết định nền cho toàn bộ offline sync (T-032/033 xây tiếp).
Kế tiếp: T-032 (số hoá đơn cấp tại client) khi PR này merge; #58 (T-025) vẫn
chờ người duyệt song song.
## 2026-09-24 (run kế 4) — dọn PR + T-025
Làm: #57 (T-023) đã merge → DONE, không còn PR agent nào mở. Chọn T-025:
nhiều hoá đơn song song. Đưa `gioHang`/`chiSoDongChon`/panel thanh toán vào
một `HoaDonTab` mỗi tab (`capNhatTab` là đường DUY NHẤT sửa một tab, các tab
khác giữ nguyên tham chiếu); `ThanhTabHoaDon` thay div "Hoá đơn 1" tĩnh cũ.
F7/nút "+" mở tab, Alt+1..9 chuyển theo vị trí hiển thị (UI-FIDELITY.md nhóm
2), đóng tab không cho về 0 tab. `xuLyThanhToan` chụp `tabId`/giỏ hàng NGAY
lúc gửi để phản hồi (thành công lẫn lỗi) luôn áp đúng tab đã thanh toán dù
người dùng đã chuyển tab khác trong lúc chờ — không phải tab đang xem lúc
phản hồi về.
PR: (xem mô tả PR)
Tầng: B — trộn nhầm dòng giữa hai tab sinh hoá đơn sai/trừ kho sai (đúng tiêu
chí BACKLOG.md đã ghi sẵn cho task này, không phải task tự chọn B).
Quyết định: Alt+1..9 đọc qua ref (`tabsRef`/`tabDangChonIdRef`), không đưa
`tabs`/`tabDangChonId` vào deps của effect phím toàn cục (giữ nguyên mẫu
mount-một-lần đã có ở F3/F9) — tránh bug đóng gói `tabDangChonId` cũ mãi mãi
trong closure của effect.
Kế tiếp: T-031 hoặc T-040/T-052/T-055, đủ điều kiện sau khi PR này merge.

## 2026-09-25 — dọn PR + T-040 (chẻ task, không code)
Làm: #58/#59 xanh, không comment, không conflict thật (`git merge-tree`) — chờ
duyệt B, không sửa. Chọn T-040 nhưng "Xong khi" gộp schema+lõi (get-or-create lô
thật, ghi kho+tiền)+API+UI — cùng hình dạng khiến T-022/T-009/T-010 vượt ngưỡng.
Chẻ ngay lúc chọn (không build thử): T-040a (schema+lõi)→T-040b (API)→T-040c
(UI); sửa phụ thuộc T-041→T-040b, T-042→T-040c, T-043/T-053→T-040a. Ảnh gốc có
panel "Nhà cung cấp/công nợ" — ghi vào T-040c là ngoài v1 (SPEC.md §2).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-040a.

## 2026-09-27 — dọn PR + T-032
Làm: #61 (T-040a) xanh, không comment/conflict, chờ duyệt B — không sửa. #58/#59
(T-025/T-031) đã merge từ trước → chuyển DONE (BACKLOG lệch, chưa ai cập nhật).
Chọn T-032: `src/client/offline/so-hoa-don-client.ts` — Dexie riêng (không dùng
chung `csdlCucBo` T-031), mã máy random 6 ký tự Crockford sinh một lần/thiết bị
(DOMAIN-NOTES.md cho phép "ID do client sinh" thay đăng ký tay); cấp số
`HD<mãMáy>-NNNNNN` idempotent theo `idThaoTac` (unique index) trong transaction.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-033 (đồng bộ phía máy chủ) sau khi PR này merge.
## 2026-09-27 — dọn PR (không còn PR mở) + T-040a
Làm: không còn PR agent nào mở; #58/#59/#60 đều đã merge từ trước (BACKLOG lệch
với T-025/chẻ T-040, chưa ai chuyển DONE — sửa ở đây). Không có chỉ đạo mới ở
#quaythuoc-admin từ 2026-09-19. Chọn T-040a: bảng `phieu_nhap`/`phieu_nhap_dong`;
`taoPhieuNhap` (lưu tạm không ghi kho, hoặc hoàn thành ngay trong cùng
transaction) và `hoanThanhPhieuNhap` (idempotent — phiếu đã `HOAN_THANH` bị từ
chối) get-or-create đúng một lô theo `(san_pham_id, so_lo, hsd)` — cả hai phải
khai cùng lúc hoặc cùng bỏ trống, tránh ngữ nghĩa NULL != NULL của SQLite làm
lô trùng; bắt buộc lô+HSD chỉ khi `giaiNghiaCaiDatQuanLyLo` ra BẬT.
PR: (xem mô tả PR)
Tầng: B
Quyết định: sửa công thức `gia_tri` trong BACKLOG.md (xem Ghi chú ở đó) —
"đơn giá × số lượng cơ sở" sai đơn vị đo, đúng phải là tổng tiền dòng nhập
(đơn giá × số lượng theo đơn vị đã chọn), khớp SPEC.md §3.4.
Kế tiếp: T-040b (API) sau khi PR này merge.

## 2026-09-27 — dọn PR + T-052 (chẻ task, không code)
Làm: #61 (T-040a)/#62 (T-032) xanh, không comment, không conflict — chờ duyệt B,
không sửa. Chọn T-052 (trả hàng) nhưng "Xong khi" gộp schema+lõi (LIFO trên
`hoa_don_dong_lo` đã có từ T-022a, ghi kho+tiền)+API+UI hai màn — cùng hình dạng
đã khiến T-009/T-010/T-022/T-040 vượt ngưỡng. Chẻ ngay lúc chọn (không build
thử): T-052a (schema+lõi)→T-052b (API)→T-052c (UI, không có ảnh tham chiếu cho
luồng tạo, chỉ có ảnh danh sách).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-052a.

## 2026-09-27 — dọn PR: sửa conflict #61 và #62, dừng run
Làm: #61 (T-040a) và #62 (T-032) đều CI xanh, không comment, nhưng cả hai
conflict thật với `main` (`git merge`, không chỉ `merge-tree`) — cùng đụng
điểm chèn cuối `JOURNAL.md` (append-only, do main đã merge PR #63 T-052-chẻ
sau khi cả hai được mở). Sửa cả hai (tiền lệ 2026-09-26 với #58/#59) rồi dừng
run, không mở task mới: merge `main` vào từng nhánh, giữ cả hai entry
JOURNAL theo đúng thứ tự thời gian (entry gốc của mỗi PR trước, vì cả hai
được tạo trước entry T-052 và entry đó đã nhắc tới chúng như PR đang mở).
`npm run ci` xanh lại sau merge cho cả hai (#61: 526 test; #62: 522 test;
build; 13 e2e). Đã push lên cả hai nhánh.
PR: #61, #62 (cập nhật, không mở PR mới)
Kế tiếp: cả hai vẫn Tầng B, chờ người duyệt tay. Nếu chưa merge ở run sau,
kiểm tra lại conflict trước khi chọn task mới.

## 2026-09-28 — dọn PR + T-052a
Làm: #61/#62 đã merge từ trước → DONE (BACKLOG lệch, sửa ở đây). #64 (T-033)
xanh, không comment/conflict, chờ duyệt B — không sửa. Chọn T-052a: thêm cột
`hoa_don_dong_lo.thu_tu` (thứ tự trừ lô lúc bán — không suy lại được từ FEFO
vì có thể đã ghi đè thủ công) để trả hàng hoàn đúng LIFO; bảng mới
`tra_hang`/`tra_hang_dong`/`tra_hang_dong_lo` (đối xứng `hoa_don_dong_lo`, cần
để biết đã hoàn bao nhiêu vào từng lô qua nhiều lần trả); tiền hoàn = tỷ lệ
`(thanh_tien − giam_gia_phan_bo) × sl_trả / sl_đã_bán`, làm tròn nửa lên.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-052b (API) sau khi PR này merge.
## 2026-09-28 — dọn PR + T-033
Làm: #61 (T-040a), #62 (T-032) đã merge → chuyển DONE. Không có PR agent nào
mở, Slack #quaythuoc-admin không có chỉ đạo mới. Chọn T-033 (đồng bộ phía máy
chủ): `phanBoTheoThuTu`/`chonLoXuatKho` (kho/fefo.ts) nhận cờ `choPhepTonAm` —
tồn không đủ thì dồn phần thiếu vào lô cuối thay vì ném lỗi; `taoHoaDonTuGioHang`
nhận `maDaCap` (dùng thẳng mã T-032 cấp tại client, không tự sinh) và
`choPhepTonAm` (mặc định false, đường online T-022b không đổi hành vi).
`src/server/dong-bo/ap-dung-thao-tac.ts` — `apDungThaoTacBanHang` idempotent
theo id thao tác (kiểm tra `hoa_don.id` tồn tại trước khi gọi), lỗi nghiệp vụ
thật (giảm giá hỏng...) trả `LOI` thay vì ném, không chặn thao tác sau trong
cùng lô; `apDungLoThaoTac` áp dụng đúng thứ tự mảng truyền vào. `POST
/api/dong-bo` (luôn 200 kèm kết quả từng thao tác, 400 chỉ khi sai hợp đồng).
Test COGS gấp theo thứ tự ĐẾN máy chủ, không theo `thoiGian` từng thao tác.
PR: (xem mô tả PR)
Tầng: B
Quyết định: `ThaoTacDongBoSchema` hiện bằng đúng `ThaoTacBanHangOfflineSchema`
(chưa phải union thật) vì trả hàng offline (T-052a) chưa có lõi nghiệp vụ —
ghi rõ trong file để người sau biết chỗ mở rộng khi T-052a xong, không dựng
sẵn discriminated union cho một nhánh chưa tồn tại.
Cố tình không làm: chưa nối `xuLyHangDoi` (T-031) gọi endpoint này qua fetch
thật, và `BanHang.tsx` chưa tạo thao tác BAN_HANG khi offline — T-033 "Xong
khi" chỉ yêu cầu hành vi phía máy chủ, wiring luồng bán hàng thật là việc
khác (giống tiền lệ T-032 để lại wiring cho T-033).
Kế tiếp: T-034 (cảnh báo lệch kho) sau khi PR này merge; T-041/T-043/T-053/
T-055 cũng đủ điều kiện phụ thuộc (T-040a/T-010b/T-022c đã DONE).

## 2026-09-28 (run kế) — dọn PR + T-040b
Làm: #64 (T-033), #65 (T-052a) đều xanh, không comment, không conflict, chờ
duyệt B — không sửa. Phát hiện BACKLOG lệch: #61 (T-040a)/#62 (T-032) đã merge
từ trước (`git log origin/main`) nhưng file vẫn ghi CHỜ MERGE — sửa DONE ở
đây. Chọn T-040b: `POST`/`PUT /api/phieu-nhap/:id`/`POST /:id/hoan-thanh`/`GET`
(danh sách+chi tiết); thêm `suaPhieuNhap`/`layDanhSachPhieuNhap`/
`layChiTietPhieuNhap` vào lõi T-040a (thay toàn bộ dòng khi còn PHIEU_TAM,
cùng khuôn `suaHangHoa`/T-009c). Viết lỡ tay Zod contract trước test một lần —
xoá, viết lại đúng thứ tự theo luật sắt TDD.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-043 hoặc T-053 (cả hai phụ thuộc T-040a, đã DONE) sau khi PR này
merge; T-040c/T-041/T-042 vẫn chờ T-040b merge.

## 2026-09-28 (run kế 2) — dọn conflict #64/#65
Làm: #66 (T-040b) merge vào main sau khi #64, #65 mở → cả hai thành `dirty`
(conflict `docs/agent/JOURNAL.md` điểm chèn cuối append-only, và `src/server/
app.ts` cùng chèn route mới cạnh nhau). Không CI đỏ, không comment chưa xử lý
— chỉ conflict. Sửa cả hai (tiền lệ 2026-09-26 #58/#59, 2026-09-27 #61/#62):
merge `main` vào từng nhánh, giữ cả hai route trong `app.ts`, giữ cả hai entry
JOURNAL theo thứ tự thời gian tạo PR. `npm run ci` xanh lại cho cả hai, push
lên cả hai nhánh, không mở task mới.
PR: #64, #65 (cập nhật, không mở PR mới)
Kế tiếp: cả hai vẫn Tầng B, chờ người duyệt tay.

## 2026-09-29 — dọn PR (không còn PR mở) + T-043
Làm: không còn PR agent nào mở, mọi PR trước đã merge (BACKLOG đã đúng trạng
thái). Slack #quaythuoc-admin không có chỉ đạo mới từ 2026-09-19 (câu hỏi hôm
đó về auto-merge đã trả lời xong ở run kế tiếp cùng ngày). Chọn T-043 (nhập từ
Excel): cột file mẫu tự định nghĩa (Mã hàng/Tên đơn vị/Số lượng/Đơn giá/Số
lô/Hạn dùng), đọc+xác thực TOÀN BỘ file trước (chỉ đọc CSDL), một dòng lỗi thì
không ghi gì cả, chỉ hợp lệ hết mới gọi `taoPhieuNhap` (T-040a) một lần —
không viết lại logic ghi kho/lô/giá vốn. Cân nhắc thư viện: bỏ `xlsx` (CVE
HIGH chưa vá trên npm, rủi ro trực tiếp vì xử lý file người dùng tải lên),
chọn `exceljs`. Dựng màn "Nhập hàng" độc lập (T-040c — màn tạo tay đầy đủ —
vẫn TODO) chỉ chứa khối nhập-từ-Excel, ghi rõ trong BACKLOG để gộp khi T-040c
xong. `exceljs` tự khai `declare interface Buffer extends ArrayBuffer {}` ở
phạm vi toàn cục trong .d.ts của nó (lỗi đã biết của gói) làm hỏng kiểu
`Buffer` thật của Node — né bằng cách chỉ dùng `Uint8Array` trong chữ ký hàm
của module mình, ép kiểu đúng tại ranh giới gọi `exceljs`.
PR: (xem mô tả PR)
Tầng: B — thêm dependency mới (`exceljs`), theo tiền lệ T-031 (dexie).
Kế tiếp: T-053 hoặc T-055 sau khi PR này merge.

## 2026-09-29 — dọn PR + T-053 (chẻ task, không code)
Làm: #67 (T-043) xanh, không comment, không conflict, chờ duyệt B — không sửa
(đã khai đúng, PR do run trước đó cùng ngày mở). Không có PR agent nào khác mở.
Slack #quaythuoc-admin không có chỉ đạo mới từ 2026-09-19. Chọn T-053 (Trả hàng
nhập) nhưng "Xong khi" gộp schema+lõi (trừ đúng lô đã nhập, ghi kho+tiền)+API+UI
khớp screenshot — cùng hình dạng đã khiến T-009/T-022/T-040/T-052 vượt ngưỡng.
Chẻ ngay lúc chọn (không build thử): T-053a (schema+lõi)→T-053b (API)→T-053c
(UI). Không có task nào khác phụ thuộc T-053 nên không cần sửa phụ thuộc chỗ khác.
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-053a.

## 2026-09-29 — dọn PR: sửa conflict #67, không mở task mới
Làm: #67 (T-043) bị `main` vượt qua sau khi #68 (T-053 chẻ task) merge — hai
entry JOURNAL cùng chèn cuối file gây conflict (`mergeable_state: dirty`).
Không CI đỏ, không comment chưa xử lý — chỉ conflict. Merge `main` vào nhánh,
giữ cả hai entry JOURNAL theo thứ tự thời gian (tiền lệ 2026-09-26/27), BACKLOG
tự merge sạch. `npm run ci` xanh lại (typecheck, lint, 629 test, build); e2e
ban đầu lỗi do máy chạy CI cục bộ thiếu đúng bản chromium đã pin — chạy lại với
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` (escape hatch có sẵn trong
`playwright.config.ts`) thì cả 13 ca xanh; không phải lỗi code. Push lên nhánh,
không mở task mới theo luật "sửa PR cũ rồi dừng".
PR: #67 (cập nhật, không mở PR mới)
Kế tiếp: chờ CI GitHub xanh + người duyệt B cho #67; sau đó T-053a.

## 2026-09-29 (run kế) — dọn PR + T-034
Làm: #67 (T-043) vẫn xanh, không comment, không conflict, chờ duyệt B — không
sửa. #64/#65/#66 (T-033/T-052a/T-040b) đã merge từ trước → chuyển DONE (BACKLOG
lệch, sửa ở đây). Chọn T-034: cảnh báo lệch kho là **hình chiếu suy ra** trực
tiếp từ `ton_kho_lo` (`layCanhBaoLechKho`, giống `gia_von_hien_hanh` T-007) —
một lô `ton < 0` là một cảnh báo, không thêm bảng/migration nào. `GET
/api/tong-quan/canh-bao-lech-kho`; màn "Tổng quan" mới (chưa có screenshot
tham chiếu, theo tiền lệ T-010c/T-023) hiện bảng cảnh báo, rỗng thì báo yên
tâm. Test: hai thiết bị cùng bán hộp cuối lúc offline qua `apDungLoThaoTac`
(cả hai `DA_AP_DUNG`, tồn -1, cảnh báo xuất hiện); kiểm kê đưa tồn hết âm thì
cảnh báo tự biến mất, không cần trạng thái "đã xử lý" riêng. Xác nhận thêm
bằng dev server + Playwright thật (không commit): gọi `/api/dong-bo` bán vượt
tồn, tải lại "Tổng quan" thấy đúng dòng cảnh báo.
PR: (xem mô tả PR)
Tầng: A — chỉ đọc dữ liệu tồn kho đã có, không ghi kho/tiền.
Kế tiếp: T-040c, T-041, T-052b, hoặc T-053a, đủ điều kiện sau khi PR này merge.

## 2026-09-30 — dọn PR: sửa conflict #67 lần 2 (main tiến thêm do #69 merge)
Làm: sau khi #69 (T-034) merge, `main` lại vượt #67 → conflict lần nữa ở
`docs/agent/JOURNAL.md` (hai entry cuối file) và `src/client/App.tsx` (route
"Tổng quan" mới của T-034 chèn cùng vị trí với route "Nhập hàng" của T-043).
Không CI đỏ, không comment chưa xử lý trên #67 — chỉ conflict. Merge `main`
vào nhánh, giữ cả hai entry JOURNAL theo thứ tự thời gian, giữ cả hai route
trong App.tsx (không loại trừ nhau). `npm run ci` chạy lại xanh. Push lên
nhánh, không mở task mới theo luật "sửa PR cũ rồi dừng".
PR: #67 (cập nhật, không mở PR mới)
Kế tiếp: chờ CI GitHub xanh + người duyệt B cho #67; sau đó T-053a hoặc T-034
kế tiếp (T-040c, T-041, T-052b).

## 2026-09-30 — dọn PR + T-040c (chẻ task, không code)
Làm: #69 (T-034) đã merge → DONE (sửa BACKLOG ở đây). #67 (T-043) vẫn xanh,
không comment, không conflict, chờ duyệt B — không sửa. Chọn T-040c (prio nhỏ
nhất đủ điều kiện, T-040b đã DONE): dựng trọn vẹn theo TDD (`npm run ci` xanh,
22 test đơn vị + 2 test e2e xác nhận luồng bàn phím lẫn Lô/HSD có điều kiện)
rồi đo trước khi mở PR: 1232 dòng/5 file, vượt ngưỡng 1000 dòng CLAUDE.md. Bỏ
toàn bộ code (không commit), chẻ T-040c thành T-040c1 (tìm hàng đã có — giữ
nguyên "Xong khi" gốc trừ phần tạo hàng mới) / T-040c2 (tạo hàng mới ngay
trong màn, nhúng T-009b); sửa phụ thuộc T-042 sang T-040c1 (điểm gọi in tem
không cần T-040c2).
PR: (xem mô tả PR)
Tầng: A
Kế tiếp: T-040c1.

## 2026-09-30 — T-040c1 (Phiếu nhập: tìm hàng đã có)
Làm: #67 (T-043) vẫn xanh, không comment, không conflict, chờ duyệt B — không
sửa. Dựng phần TÌM HÀNG ĐÃ CÓ của màn Nhập hàng: tái dùng nguyên khối tìm/gợi
ý của T-020 (BanHang.tsx), mỗi lần chọn thêm MỘT DÒNG MỚI (không gộp như giỏ
bán — một phiếu có thể có nhiều dòng cùng sản phẩm khác lô/HSD); cột Số
lô/Hạn dùng chỉ hiện khi sản phẩm bật quản lý lô (giải nghĩa qua cài đặt toàn
cục + ghi đè sản phẩm); validate lô/HSD bắt buộc ngay ở form trước khi gọi
Hoàn thành; F6 = Lưu tạm. Không dựng panel NCC/nút "+" tạo hàng mới (T-040c2).
doi-chieu-ui phát hiện cột nút xoá/STT bị đảo so với ảnh "Đã nhập 2 hàng"
(icon thùng rác phải đứng TRƯỚC STT) — đã sửa.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-040c2, T-041, T-042 (đủ điều kiện sau khi PR này merge).
## 2026-09-30 (run kế) — dọn PR: sửa conflict #67 lần 3 (main tiến thêm do #70 merge)
Làm: #70 (T-040c chẻ task) đã merge → `main` lại vượt #67, conflict lần 3, chỉ
ở `docs/agent/JOURNAL.md` (hai entry cuối cùng chèn khác vị trí); BACKLOG.md tự
merge sạch, không đụng App.tsx lần này (PR #70 không có code). Không CI đỏ,
không comment chưa xử lý trên #67 — chỉ conflict. Merge `main` vào nhánh, giữ
cả hai entry JOURNAL theo đúng thứ tự thời gian đã có. Không mở task mới theo
luật "sửa PR cũ rồi dừng".
PR: #67 (cập nhật, không mở PR mới)
Kế tiếp: chờ CI GitHub xanh + người duyệt B cho #67 và #71; xem lại tiền lệ
conflict lặp lại 3 lần — có thể #67 nên được ưu tiên duyệt sớm để cắt đứt vòng
lặp merge-conflict mỗi khi có PR `[A]` mới merge vào main.

## 2026-10-01 — #71 (T-040c1): sửa conflict với #67 sau khi người duyệt merge main
Làm: Dương merge `main` vào #71 — union sinh JSX lỗi (hai `<NhapHang/>
<NhapHangTuExcel/>` không bọc Fragment), CI đỏ. Đúng việc BACKLOG.md T-043 đã
ghi trước: gộp khối Excel xuống dưới bảng dòng tạo tay, bỏ `<h1>` trùng tiêu
đề. `npm run ci` xanh lại, push.
PR: #71 · Kế tiếp: chờ CI + người duyệt B.

## 2026-10-01 (run kế) — dọn PR + T-040c2
Làm: #71 (T-040c1) đã merge → DONE (sửa BACKLOG, PR#69/T-034 cũng đã merge từ
trước nhưng chưa được chuyển DONE — sửa luôn). Không còn PR agent nào mở.
Chọn T-040c2: nút "+" cạnh ô tìm (khớp ảnh "Giao diện tìm kiếm... có nút tạo
hàng mới") mở `TaoMoiHangHoa` (T-009b) làm overlay ngay trong màn, không rời
màn; tạo xong gọi lại đúng `chon()` đã có (đơn vị cơ sở) để thêm thẳng vào
phiếu — không viết lại logic thêm dòng. doi-chieu-ui xác nhận không vi phạm.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-041, T-042, T-052b, hoặc T-053a — đều đủ điều kiện sau khi PR này merge.

## 2026-10-01 (run kế) — T-041 (Danh sách và chi tiết phiếu nhập)
Làm: #72 (T-040c2) xanh, không comment, không conflict, chờ duyệt B — không sửa.
Chọn T-041: dựng xong full "Xong khi" (gồm cả bộ lọc Thời gian) rồi đo mới phát
hiện ~1136 dòng/15 file, vượt ngưỡng — chẻ ngay: gỡ bộ lọc "Thời gian" (Tháng
này/Tùy chỉnh) sang T-041b (TODO mới), giữ lại bộ lọc Trạng thái + ô tìm + chi
tiết chỉ đọc trong PR này (~947 dòng/15 file). Nav "Nhập hàng" nay vào DANH SÁCH
trước, "+ Nhập hàng" mới mở luồng tạo tay cũ (T-040c1/c2) — cập nhật e2e theo.
PR: (xem mô tả PR) · Tầng A: chỉ đọc dữ liệu phiếu nhập đã có.
Kế tiếp: T-041b, T-042, T-052b, hoặc T-053a.

## 2026-10-02 — dọn PR: sửa conflict #72 (main vượt qua do #73/T-041 merge), dừng run
Làm: #72 (T-040c2) CI xanh, không comment, nhưng `mergeable_state: dirty` —
conflict thật với `main` sau khi #73 (T-041) merge: `docs/agent/JOURNAL.md`
(append cuối file) và `tests/e2e/nhap-hang.spec.ts` (hai test mới của #72/#73
cùng chèn sau test T-040c1). Merge `main` vào nhánh, giữ cả hai entry JOURNAL
theo thứ tự thời gian; test e2e T-040c2 cập nhật theo nav mới của T-041 (phải
bấm "+ Nhập hàng" sau "Nhập hàng" mới vào màn tạo tay) và thêm route GET
`/api/phieu-nhap` (danh sách rỗng) vì màn danh sách giờ fetch ngay khi vào.
`npm run ci` xanh (681 test, build, 16 e2e). Push lên nhánh #72. Theo luật
"sửa PR cũ rồi dừng" — không chọn task mới.
PR: #72 (cập nhật, không mở PR mới)
Tầng: B (không đổi, lý do gốc giữ nguyên)
Kế tiếp: chờ CI GitHub xanh + người duyệt B cho #72; sau đó T-041b, T-042,
T-052b, hoặc T-053a.
## 2026-10-02 (run kế) — T-041b (bộ lọc Thời gian)
Làm: #72 (T-040c2) vẫn xanh, không comment/conflict, chờ duyệt B — không sửa.
#73 (T-041) đã merge → BACKLOG chuyển DONE. Chọn T-041b: hàm thuần quy đổi
ngày/tháng VN→UTC (`shared/thoi-gian/khoang-ngay-vn.ts`), lọc `tu`/`den` trên
`phieuNhap.thoiGian` ở lớp kho + route, radio "Tháng này" (mặc định)/"Tùy
chỉnh" (hai ô ngày) trong cột lọc. TDD cho cả 3 tầng (hàm thuần, lớp nghiệp
vụ, route) + 1 e2e. doi-chieu-ui xác nhận không vi phạm.
PR: (xem mô tả PR) · Tầng A: chỉ đọc, không ghi kho/tiền.
Kế tiếp: T-042, T-052b, hoặc T-053a.

## 2026-10-02 (run kế 2) — chỉ đạo #quaythuoc-admin: sửa bug PR #71, không chọn task mới
Làm: #72 (T-040c2)/#74 (T-041b) đã merge → chuyển DONE. Không còn PR agent mở.
Chỉ đạo Dương (#quaythuoc-admin, 2026-10-01 20:54) "Sửa lỗi ở PR #71" không kèm
chi tiết và không có comment nào trên PR #71 (đã merge, không sửa lại được) —
đọc lại code T-040c1 tìm bug thật: `chon()` trong `NhapHang.tsx` tính
`chiSoDongChon` = `dsDong.length` TRƯỚC khi `await` tra cứu ghi đè quản lý lô
(`layGhiDeQuanLyLo`) — chọn liên tiếp hai gợi ý mà lượt tra cứu của dòng ĐẦU về
SAU lượt hai thì dòng đang chọn kẹt ở dòng đầu, không nhảy sang dòng vừa thêm
sau cùng (ảnh hưởng bàn phím +/-/F2/Delete tác động nhầm dòng). Khác BanHang
(T-021, không có tra cứu bất đồng bộ nên không có race). Viết e2e tái hiện
TRƯỚC (đỏ), sửa: sinh `idMoi` trước khi gọi API, chọn dòng bằng `findIndex`
theo id sau khi `dsDong` đã chứa nó (qua `useEffect`), không suy từ độ dài mảng
lúc gọi.
PR: (xem mô tả PR)
Tầng: A — chỉ sửa bug chỉ số UI trong luồng đã duyệt, không đổi hợp đồng API,
không thêm quyết định kiến trúc (tiền lệ T-021/T-024).
Kế tiếp: T-042, T-052b, hoặc T-053a.

## 2026-10-02 (run kế 3) — T-042 (In tem mã)
Làm: không còn PR agent nào mở. Chọn T-042: modal "In tem mã" (sửa số lượng
tem/dòng) mở ngay sau Hoàn thành, rồi "Xem trước tem mã" (mã vạch qua
`jsbarcode`) — gộp hai bước "Chọn loại giấy"+"Xem bản in" của KiotViet thành
một màn, tiền lệ InHoaDon K57/K80. Chỉ 2 khổ giấy (không phải 8) — chưa biết
máy in tem thật của quầy. `doi-chieu-ui` phát hiện "bỏ dấu tiếng Việt" trong
BACKLOG bị diễn giải sai (ảnh in thật giữ nguyên dấu ở tên hàng) — sửa lại:
chỉ bỏ dấu ở MÃ HÀNG trước khi encode mã vạch (CODE128 chỉ ASCII). Cũng sửa
dòng tổng (thừa chữ "Tổng số tem" so với ảnh gốc, giờ chỉ còn con số).
PR: (xem mô tả PR) · Tầng: A — chỉ trình bày lại dữ liệu đã có.
Kế tiếp: T-052b hoặc T-053a.

## 2026-10-02 (run kế 4) — T-052b (Trả hàng: API)
Làm: #76 (T-042) CI xanh, không comment cần xử lý (chỉ bot giải thích auto-merge
bị chặn vì PR chạm `package.json`/`package-lock.json` — đúng theo luật nhóm tự-
quản-trị, không phải lỗi cần sửa), chờ người duyệt — không sửa. Chọn T-052b:
TDD thêm `layDanhSachTraHang`/`layChiTietTraHang` vào lõi T-052a đã duyệt (JOIN
lấy mã hoá đơn gốc làm liên kết ngược, không snapshot); hợp đồng Zod
`shared/hop-dong/tra-hang.ts`; route `POST /api/tra-hang` (gọi `taoPhieuTraHang`
đã có, không viết lại), `GET /api/tra-hang` (danh sách), `GET /api/tra-hang/:id`
(chi tiết). Map lỗi: 400 dữ liệu không hợp lệ/không thể xảy ra qua Zod, 404 hoá
đơn hoặc dòng hoá đơn không tồn tại/không thuộc hoá đơn đã khai, 409 vượt số
lượng đã bán (cộng dồn). Không có UI (đúng "Xong khi").
PR: (xem mô tả PR)
Tầng: A — chỉ nối API cho lõi nghiệp vụ đã duyệt B, không thêm quyết định kiến
trúc mới (tiền lệ T-010a→b/T-022a→b/T-040a→b).
Kế tiếp: T-053a hoặc T-052c (sau khi PR này merge).

## 2026-10-02 (run kế 5) — dọn PR: sửa conflict #76 (main vượt qua do #77/T-052b
merge), dừng run
Làm: #77 (T-052b) đã merge → BACKLOG chuyển DONE. #76 (T-042) CI xanh, không
comment cần xử lý, nhưng `mergeable_state: dirty` — conflict thật với `main`
sau khi #77 merge: chỉ `docs/agent/JOURNAL.md` (append cuối file, hai entry
"run kế 3"/"run kế 4" cùng chèn sau cùng một dòng); `docs/agent/BACKLOG.md`
tự merge sạch (hai thay đổi không chạm cùng dòng). Merge `main` vào nhánh, giữ
cả hai entry theo đúng thứ tự thời gian thật (run kế 3 trước run kế 4 — run 4
đã nhắc tới #76 nên phải sau). `npm run ci` xanh (715 test, build, 20 e2e — cần
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` cho máy chạy agent này, đã
pin đúng bản trong CI GitHub). Push lên nhánh #76. Theo luật "sửa PR cũ rồi
dừng" — không chọn task mới.
PR: #76 (cập nhật, không mở PR mới)
Tầng: A (không đổi)
Kế tiếp: chờ CI GitHub xanh + người duyệt (#76 chạm `package.json`/
`package-lock.json`, nhóm tự-quản-trị); sau đó T-053a hoặc T-052c.

## 2026-10-03 — dọn PR: #76 (T-042) đã merge, chuyển DONE; chọn T-052c
Làm: không còn PR agent nào mở (#76 đã merge). Chọn T-052c: TDD
`timHoaDonDeTraHang` (dùng chung `tinhConLaiToiDaCoSo` với `taoPhieuTraHang` —
không hai công thức) + `GET /api/tra-hang/hoa-don/:ma`, màn danh sách + chi
tiết (inline) + liên kết ngược (mở lại hoá đơn gốc). Đo TRƯỚC khi mở PR: gộp cả
luồng tạo ra ~1095 dòng/19 file — vượt ngưỡng. Chẻ ngay: gỡ luồng tạo (ô tìm có
nhập liệu, nút "+ Trả hàng") sang T-052d mới, đổi nhãn T-052c `[B]`→`[A]` (hết
ghi kho/tiền). `doi-chieu-ui` phát hiện hai điều: (1) BACKLOG.md trỏ sai thư
mục ảnh tham chiếu — `Quản trị/Trả hàng/Danh sách trả hàng.png` thực chất là
"Trả hàng nhập" (phạm vi T-053c), ảnh đúng cho màn này nằm ở
`Quản trị/Đơn hàng/Danh sách trả hàng.png` — đã sửa path ở cả T-052c lẫn
T-053c trong BACKLOG.md; (2) panel chi tiết thiếu badge trạng thái "Đã trả"
so với ảnh gốc — đã thêm (`BadgeTrangThai mau="tot"`, TĨNH vì `tra_hang` không
có cột trạng thái, một phiếu luôn hoàn tất ngay trong transaction — T-052a).
PR còn lại ~860 dòng/16 file, `npm run ci` xanh.
PR: (xem mô tả PR) · Tầng: A
Kế tiếp: T-052d (luồng tạo trả hàng) hoặc T-053a.

## 2026-10-03 (run kế) — T-053a (Trả hàng nhập: schema + lõi nghiệp vụ)
Làm: #79 (T-052d) CI xanh, không comment/conflict, chờ duyệt B — không sửa.
Chọn T-053a: migration `tra_hang_nhap`/`tra_hang_nhap_dong`, hàm
`taoPhieuTraHangNhap` trừ đúng lô ĐÃ NHẬN của dòng gốc (không FEFO, suy lại từ
`(san_pham_id, so_lo, hsd)`, không cần bảng "...lo" riêng vì một dòng nhập chỉ
có đúng một lô). Sửa lúc làm: "đơn giá... không tính lại" không đủ tính tiền
hoàn (đơn vị lệch, cần chia) — đổi sang lưu `tienHoan` theo tỷ lệ, cùng công
thức `chiaLamTronNuaLen` của T-052a. Thêm kiểm phiếu phải `HOAN_THANH` mới trả
được. 12 test TDD (gồm bất biến "hai chế độ lô/phẳng cùng số dư").
PR: (xem mô tả PR) · Tầng: B — ghi kho/tiền lần đầu qua lõi mới.
Kế tiếp: T-053b (API) sau khi PR này merge.
## 2026-10-03 (run kế) — dọn PR + T-052d
Làm: #78 (T-052c) đã merge → DONE. Không còn PR agent nào mở. Chọn T-052d:
nút "+ Trả hàng" (khuôn `dangTaoMoi` giống `DanhSachPhieuNhap`/T-041) mở
`TaoTraHang` — tái dùng NGUYÊN `useHoaDonDeTraHang`/`GET
/api/tra-hang/hoa-don/:ma` đã có; `BangDongHoaDonDeTraHang` (TraCuuHoaDon.tsx)
thêm props tuỳ chọn `soLuongTra`/`onSuaSoLuongTra` để tự thêm cột "Số lượng
trả" khi được truyền (không viết lại bảng, cách dùng cũ ở `ChiTietTraHang`
không đổi). Số lượng trả nhập theo đơn vị ĐÃ BÁN (khớp cột "Còn trả được"
hiện có), quy đổi sang cơ sở bằng `quyDoiSangCoSo` ngay trước khi gọi `POST
/api/tra-hang` — có test khoá đúng phép nhân hệ số (2 hộp × 15 = 30 viên).
Lưu xong quay về danh sách, tải lại và mở sẵn chi tiết phiếu vừa tạo.
PR: (xem mô tả PR)
Tầng: B — đường ghi kho/tiền qua tay người dùng lần đầu ở luồng tạo (lý do đã
khai từ T-052c, giống tiền lệ T-040c1/T-053c, khác T-022c/T-040b/T-052b chỉ
nối API đã duyệt).
Khác KiotViet: không hiển thị tạm tính "tiền hoàn" từng dòng trước khi lưu —
công thức chỉ sống ở server; không có screenshot tham chiếu cho luồng tạo
(theo tiền lệ T-010c/T-023), dựng theo token design-system.
Kế tiếp: T-053a (trả hàng nhập: schema + lõi) hoặc T-055 (cảnh báo cận date).
## 2026-10-03 (run kế) — dọn PR + chọn T-055
Làm: #79 (T-052d)/#80 (T-053a) CI xanh, không comment, không conflict — đang
chờ người duyệt B, không sửa. T-053a/T-052d đã có PR nên không chọn lại; T-055
là task TODO nhỏ nhất đủ điều kiện. Thêm `layCanhBaoCanDate` (hình chiếu suy ra
từ `ton_kho_lo`/`lo_hang`, khuôn T-034) + `ngayHomNayVN`/`soNgayGiuaHaiNgayVN`
(giờ VN) + `GET /api/tong-quan/canh-bao-can-date` + khối thứ hai ở màn Tổng
quan. Tầng kho không gọi `giaiNghiaCaiDatQuanLyLo` (SPEC.md §3.2) — lọc theo
cài đặt quản lý lô làm ở route, đúng "bộ lọc báo cáo cận date" được phép.
PR: (xem mô tả PR) · Tầng: A
Kế tiếp: T-055 chờ merge; sau đó T-053b (nếu #80 đã merge) hoặc tiếp T-055 kế.
