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
