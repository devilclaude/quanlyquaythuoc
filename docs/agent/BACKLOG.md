# Backlog

Trạng thái: `TODO` → `DOING` → `CHỜ MERGE` → `DONE`, hoặc `BLOCKED`
Tầng: `[A]` tự merge khi CI xanh · `[B]` chờ người duyệt

Agent chỉ chọn task `TODO` có toàn bộ phụ thuộc `DONE`, prio nhỏ nhất trước.

**`CHỜ MERGE` nghĩa là đã mở PR nhưng PR chưa vào `main`.** Task ở trạng thái này
chưa xong: phụ thuộc vào nó chưa được mở khoá. Chỉ run sau, khi thấy PR đã merge,
mới chuyển nó sang `DONE`. Không bao giờ ghi `DONE` cùng commit với code.

Khai báo tầng bằng dòng `Tầng: A` hoặc `Tầng: B` trong **mô tả PR**, không phải
bằng label — xem `CLAUDE.md`.

Mỗi task là **một lát cắt dọc** — schema + logic + endpoint + test + nối giao diện —
không phải một tầng kiến trúc. Ngưỡng cứng một PR là **1000 dòng đổi hoặc 24 file**
(không tính lockfile); vượt thì chẻ task trong file này và mở PR chỉ chứa việc chẻ,
hoặc ghi `BLOCKED.md` nếu không chẻ được. Không tự cấp ngoại lệ — xem `CLAUDE.md`.

## Tiêu chí gắn tầng

Cập nhật theo chỉ đạo chủ dự án 2026-09-14 (#quaythuoc-admin, xem `CLAUDE.md`
mục "Tầng merge"): **không còn nhóm "luôn `[B]`" theo miền nghiệp vụ.** Mặc
định khi nghi ngờ giờ là `[A]`. Agent tự đánh giá theo từng task và vẫn được
tự chọn `[B]` khi thấy có lý do cụ thể cần người duyệt trước khi merge (ví dụ:
quyết định nền khó đảo ngược, không chắc chắn về nghiệp vụ) — nhưng đây là lựa
chọn theo từng task, không phải quy tắc cứng theo miền (kho/tiền/migration/...
không còn tự động bắt buộc `[B]`).

`[A]` khai đúng vẫn **không** tự merge nếu PR chạm nhóm tự-quản-trị của agent
(`.github/`, `.claude/`, `scripts/`, `CLAUDE.md`, config gốc, bốn file chỉ-đọc
trong `docs/agent/`) — xem `.github/workflows/auto-merge.yml`. Nhóm này luôn
"nghi ngờ thì `[B]`" bất kể agent khai gì trong mô tả PR.

**Tầng khai trong một PR là bất biến sau khi mở.** Không bao giờ tự nâng
`[B]` đã khai trên một PR lên `[A]` sau đó, kể cả khi tiêu chí mặc định đổi
sau khi PR đó đã mở — thay đổi tiêu chí chỉ áp dụng cho các PR mở SAU thời
điểm đổi, không hồi tố PR cũ. Muốn một PR `[B]` cũ tự merge thì cách đúng là
người duyệt merge tay, không phải agent sửa lại dòng khai báo.

---

## Milestone 1 — Nền tảng, tiền, và kho theo lô

### T-001 [B] prio:1 — Khởi tạo dự án và CI
Trạng thái: DONE · Phụ thuộc: —
Xong khi: bộ lệnh trong `ARCHITECTURE.md` §7 chạy được và xanh; `tsconfig` bật
`strict` + `noUncheckedIndexedAccess`; ESLint + Prettier + dependency-cruiser cấu
hình xong; CI chặn được một PR cố tình phá test.
Tầng B: quyết định nền, sửa về sau tốn cả repo.

### T-002 [B] prio:2 — Branded types và số học tiền
Trạng thái: DONE · Phụ thuộc: T-001
Xong khi: `Dong`, `SoLuongCoSo`, `Ulid` tồn tại và cộng nhầm nhau là **lỗi biên
dịch**; hàm làm tròn nửa lên và **phân bổ số dư lớn nhất** có test; ví dụ trong
`SPEC.md` §3.4 (10.000/20.000/30.000 giảm 7.000 → 1.167/2.333/3.500) là một test;
ESLint chặn được số thực trong `src/shared/tien/**`.

### T-003 [B] prio:3 — Quy đổi đơn vị
Trạng thái: DONE · Phụ thuộc: T-002
Xong khi: hệ số là số nguyên ≥ 1; quy đổi hai chiều có test; ví dụ chuẩn trong
`SPEC.md` §3.3 (nhập 5 hộp, bán 3 vỉ, còn 864 viên) là một test; hiển thị phụ
"≈ 4,8 hộp" không bao giờ quay lại tính toán.

### T-004a [B] prio:4.1 — Schema: chi nhánh, hàng hoá, đơn vị tính
Trạng thái: DONE · Phụ thuộc: T-001
Xong khi: migration tạo `chi_nhanh`, `san_pham` (`ma_hang` unique — nền cho việc
"hai máy tạo trùng mã vạch" ở SPEC.md §5.4), `don_vi_tinh` (`he_so >= 1`, giá bán
không âm, unique tên đơn vị/sản phẩm, **duy nhất một đơn vị cơ sở mỗi sản phẩm**);
test tích hợp (SQLite in-memory) cho từng ràng buộc.
Ghi chú: đây là T-004 cũ, chẻ vì migration + snapshot Drizzle tự sinh vượt ngưỡng
1000 dòng/PR khi làm trọn gói. `lo_hang`/`the_kho`/`ton_kho_lo` chuyển sang
T-004b/T-004c.

### T-004b [B] prio:4.2 — Schema: lô hàng + trigger cấp lô ngầm định
Trạng thái: DONE · Phụ thuộc: T-004a
Xong khi: migration tạo `lo_hang` (đơn vị tồn là (sản phẩm, lô, HSD); **không có**
`chi_nhanh_id` — một lô là một lô, SPEC.md §3.6); trigger CSDL **tự cấp lô ngầm
định** (`so_lo = NULL`, `hsd = NULL`, `la_lo_mac_dinh = true`) ngay khi một dòng
`san_pham` được insert, để bất biến này không phụ thuộc đường code tạo sản phẩm
nào ra đời sau; đủ ràng buộc unique theo `ARCHITECTURE.md` §6 (duy nhất lô ngầm
định/sản phẩm, unique `(san_pham_id, so_lo, hsd)` cho lô thật); test tích hợp.

### T-004c [B] prio:4.3 — Schema: thẻ kho, tồn kho đệm, seed minh hoạ
Trạng thái: DONE · Phụ thuộc: T-004b
Xong khi: migration tạo `the_kho` (sổ cái chỉ-ghi-thêm, `chi_nhanh_id` có mặt từ
đầu, cột `loai` giới hạn đúng tập giá trị ở SPEC.md, **trigger CSDL chặn UPDATE và
DELETE**) và `ton_kho_lo` (bản đệm, unique `(lo_id, chi_nhanh_id)`, cũng có
`chi_nhanh_id`); seed minh hoạ một thuốc nhiều đơn vị + nhiều lô thật và một mặt
hàng chỉ có lô ngầm định (tồn phẳng); test tích hợp cho từng ràng buộc và cho seed.
Tầng B: đây là quyết định không sửa được về sau (áp dụng cho cả T-004a/b/c).

### T-005 [B] prio:5 — Lớp kho: ghi sổ cái và bản đệm tồn
Trạng thái: DONE · Phụ thuộc: T-004c
Xong khi: mọi thay đổi tồn đi qua **một đường code duy nhất** ghi thẻ kho; bản đệm
`ton_kho_lo` cập nhật trong cùng transaction; test bất biến "tổng sổ cái == bản
đệm" chạy trên dữ liệu ngẫu nhiên; dựng lại bản đệm từ sổ cái ra cùng kết quả.

### T-006 [B] prio:6 — FEFO và cấp phát nhiều lô
Trạng thái: DONE · Phụ thuộc: T-005
Xong khi: thứ tự chọn lô đúng `hsd ASC NULLS FIRST, ngay_tao ASC, lo_id ASC`; tồn
không đủ ở một lô thì chia đúng sang lô kế tiếp; chọn lô thủ công ghi đè được FEFO;
**không có nhánh `if` nào theo cài đặt quản lý lô**; toàn bộ ca test chạy lại được
với sản phẩm chỉ có lô ngầm định và cho cùng số dư cuối; ca biên: số lượng 0, tồn
không đủ, bán vượt tồn bị từ chối khi online.

### T-007 [B] prio:7 — Giá vốn bình quân gia quyền
Trạng thái: DONE · Phụ thuộc: T-006
Xong khi: hình chiếu giữ cặp `(ton, gia_tri_ton)` đều là số nguyên; nhập không sinh
phép chia; COGS = `làm_tròn(gia_tri_ton × sl / ton)`; **bán hết thì `gia_tri_ton`
về đúng 0** — có test; hình chiếu gấp theo **thứ tự đến máy chủ**, dựng lại được từ
sổ cái; client không cần biết giá vốn.

### T-008 [A] prio:8 — Design token và component cơ bản
Trạng thái: DONE · Phụ thuộc: T-001
Xong khi: token màu/chữ/khoảng cách lấy từ `.claude/skills/design-system/`, không
gọi lại generator; component dùng lại được cho bảng, ô nhập, nút, badge trạng thái;
đối chiếu `UI-FIDELITY.md`.

### T-009a [A] prio:9.1 — Màn hàng hoá: danh sách + chi tiết (chỉ đọc)
Trạng thái: DONE · Phụ thuộc: T-004c, T-008
Xong khi: dựng lần đầu tầng `src/server/api/` (route Hono) và `src/shared/hop-dong/`
(Zod contract dùng chung client/server, `ARCHITECTURE.md` §1); `GET /api/hang-hoa`
(danh sách, tìm theo mã/tên) và `GET /api/hang-hoa/:id` (chi tiết + đơn vị tính);
màn danh sách khớp thứ tự cột screenshot "Danh sách hàng hóa" cho các cột nằm
trong phạm vi v1 (Mã hàng, Tên hàng, Giá bán, Giá vốn, Tồn kho, Thời gian tạo);
bấm một dòng mở panel chi tiết ngay dưới dòng đó, khớp screenshot "xem chi tiết 1
sản phẩm", tối thiểu tab "Thông tin". Giá vốn hiển thị tạm 0 (T-007 tính giá vốn
thật chưa xong) — ghi rõ trong PR.
Ghi chú: đây là T-009 cũ, chẻ vì ước lượng vượt ngưỡng 1000 dòng/24 file — task
đầu tiên phải dựng đồng thời tầng `api/`, `hop-dong/`, và toàn bộ màn hàng hoá,
quy mô lớn hơn hẳn các task schema từng chẻ (T-004). Cột "Khách đặt" trong
screenshot gắn với Bán online (NGOÀI v1, `SPEC.md` §2) — bỏ, ghi `JOURNAL.md`
phần "Khác KiotViet". Tầng A vì chỉ đọc.

### T-009b [B] prio:9.2 — Tạo mới hàng hoá (nhiều đơn vị)
Trạng thái: DONE · Phụ thuộc: T-009a, T-003
Xong khi: form "Tạo mới hàng hóa" có Mã hàng (tự động/nhập), Tên hàng (bắt buộc),
Giá bán đơn vị cơ sở, và khai được nhiều đơn vị tính kèm hệ số nguyên ≥1 + giá
riêng từng đơn vị; **thêm đơn vị mới thì form điền sẵn gợi ý giá = giá đơn vị cơ
sở × hệ số, sửa được** (SPEC.md §3.3); `POST /api/hang-hoa` tạo sản phẩm + đơn vị
tính trong một transaction (trigger DB đã tự cấp lô ngầm định từ T-004b, không
cần code thêm); test: tạo 1 đơn vị, tạo nhiều đơn vị với hệ số/giá riêng, hệ số
< 1 bị từ chối, tên hàng bắt buộc.
Ghi chú: trường trong screenshot ngoài phạm vi v1 (nhóm hàng, ảnh, thuộc tính, vị
trí, trọng lượng, hãng/nước sản xuất, định mức tồn) — KHÔNG làm, ghi trong "Cố
tình không làm" của PR (`SPEC.md` §2 đã chốt các nhóm này ngoài v1).

### T-009c [B] prio:9.3 — Sửa, xoá/ngừng hoạt động hàng hoá
Trạng thái: DONE · Phụ thuộc: T-009b
Xong khi: `PUT /api/hang-hoa/:id` sửa tên/giá/đơn vị; **cấm đổi đơn vị cơ sở khi
sản phẩm đã phát sinh dòng `the_kho`** — có test; `DELETE /api/hang-hoa/:id` xoá
cứng **chỉ khi chưa phát sinh thẻ kho**, đã phát sinh thì trả lỗi rõ và client gọi
API "Ngừng hoạt động" thay thế (thêm cột trạng thái vào `san_pham` qua migration);
form sửa tái dùng form tạo (T-009b); nút Xoá/Ngừng hoạt động khớp vị trí trong
ảnh chi tiết sản phẩm; test: xoá cứng khi chưa có thẻ kho, xoá bị chặn + chuyển
ngừng hoạt động khi đã có thẻ kho.

### T-010a [B] prio:10.1 — Cài đặt quản lý theo lô: schema + hàm giải nghĩa
Trạng thái: DONE · Phụ thuộc: T-006, T-009c
Xong khi: bảng `cai_dat` (cài đặt toàn cục, đúng một dòng, **mặc định TẮT**) và cột
ghi đè theo sản phẩm (ba trạng thái: kế thừa/bật/tắt) trên `san_pham`; hàm giải
nghĩa cài đặt (thuần, không chạm CSDL) áp đúng thứ tự ưu tiên "ghi đè sản phẩm >
cài đặt toàn cục"; hàm đổi cài đặt (cả toàn cục lẫn theo sản phẩm): tắt→bật luôn
cho phép, bật→tắt bị chặn khi sản phẩm còn hơn một lô có tồn > 0, cả hai chiều ghi
thẻ kho loại `DOI_CHE_DO` với số lượng 0; **`dependency-cruiser` chặn
`src/server/kho/**` import hàm giải nghĩa cài đặt** (ARCHITECTURE.md §5 — quy tắc
này thêm ngay ở task tạo ra module, không chờ task sau). Không có API, không có UI.
Ghi chú: đây là T-010 cũ, chẻ vì bản đầy đủ (schema+logic+API+UI) ước lượng vượt
1000 dòng/24 file khi làm trọn gói — số liệu đo được lúc chẻ: ~1120 dòng/25 file
tính theo ngưỡng CLAUDE.md (không tính migration tự sinh). Slice này riêng còn
trong ngưỡng.

### T-010b [B] prio:10.2 — Cài đặt quản lý theo lô: API
Trạng thái: DONE · Phụ thuộc: T-010a
Xong khi: `GET`/`PUT /api/cai-dat/quan-ly-lo` (cài đặt toàn cục) và
`PUT /api/hang-hoa/:id/quan-ly-lo` (ghi đè theo sản phẩm, trả 409 kèm lý do khi bị
chặn); chi tiết hàng hoá (`GET /api/hang-hoa/:id`) trả thêm ghi đè hiện tại của sản
phẩm đó. Không có UI — dùng test tích hợp gọi thẳng route.
Ghi chú: T-040 (phiếu nhập) chỉ cần tới đây (tầng dữ liệu/API), không cần T-010c —
form nhập hàng tự đọc cài đặt qua API, không phụ thuộc màn cài đặt có tồn tại hay
không.

### T-010c [A] prio:10.3 — Cài đặt quản lý theo lô: giao diện
Trạng thái: DONE · Phụ thuộc: T-010b
Xong khi: màn cài đặt có công tắc bật/tắt toàn cục (chưa có screenshot KiotViet
tham chiếu cho màn này trong `docs/reference/kiotviet/` — dựng theo token trong
`.claude/skills/design-system/`, ghi rõ trong PR); chi tiết hàng hoá (T-009c) có
điều khiển đổi ghi đè riêng cho sản phẩm, hiện lỗi rõ khi bị chặn (bật→tắt còn
nhiều lô tồn). Tầng A: chỉ đọc/ghi cài đặt hiển thị, không tự viết dòng sổ cái nào
ngoài đường đã có sẵn ở T-010a/b.

---

## Milestone 2 — Bán hàng (ưu tiên cao nhất)

### T-020 [B] prio:20 — Màn bán hàng: tìm và thêm hàng
Trạng thái: DONE · Phụ thuộc: T-006, T-009c
Xong khi: bố cục khớp screenshot "Giao diện bán hàng chưa có sản phẩm" và "Tìm sản
phẩm để bán"; tìm **theo tên và mã hàng** (tìm theo hoạt chất là v1.1, không làm);
gợi ý hiện tồn và giá như trong ảnh; **chọn và thêm hoàn toàn bằng bàn phím**.

### T-021 [B] prio:21 — Chọn đơn vị và số lượng
Trạng thái: DONE · Phụ thuộc: T-020, T-003
Xong khi: khớp screenshot "Chọn 1 món hàng để bán"; đổi đơn vị trừ đúng số đơn vị
cơ sở; sửa số lượng bằng bàn phím; giá lấy theo đơn vị đã chọn, không nhân hệ số.

### T-022a [B] prio:22.1 — Thanh toán và tạo hoá đơn: schema + lõi nghiệp vụ
Trạng thái: DONE · Phụ thuộc: T-021, T-007
Xong khi: bảng `hoa_don`/`hoa_don_dong` (chứng từ giao dịch, không xoá cứng —
SPEC.md §3.5); hàm `taoHoaDonTuGioHang` trừ kho theo FEFO cho từng dòng trong
**một transaction nguyên tử** (bán vượt tồn ở bất kỳ dòng nào rollback toàn bộ,
không tạo hoá đơn "một nửa"), ghi thẻ kho loại `BAN` qua đúng một hàm viết đã có
(`ghiMotDongTheKho`, không tự tính giá vốn — tầng đó tự lo); đẳng thức
`khách_cần_trả = tổng − giảm_giá + thu_khác + làm_tròn` có test (làm tròn hoá đơn
**mặc định tắt**, luôn 0 ở slice này — chưa có giao diện bật); phân bổ giảm giá
hoá đơn về từng dòng theo "số dư lớn nhất" (Σ phần khớp đúng tổng, không lệch 1đ);
mã hoá đơn tự sinh tuần tự (`HD000001`...); test hai hoá đơn liên tiếp cùng bán
hộp cuối khi online → hoá đơn thứ hai bị từ chối; test tồn không đủ ở một lô chia
đúng sang lô kế tiếp theo FEFO. Nhận `phuongThucThanhToan` qua tham số hàm (không
qua UI). **Không có API, không có UI.**
Ghi chú: đây là T-022 cũ, chẻ vì bản đầy đủ (schema+logic+API+UI) ước lượng vượt
1000 dòng/PR khi làm trọn gói — số liệu đo được lúc chẻ: chỉ riêng phần schema
+ lõi nghiệp vụ (không tính API/UI/hop-đồng Zod) đã ~1005 dòng đổi tính theo
ngưỡng CLAUDE.md (loại migration tự sinh), tức phần backend đầy đủ (schema+lõi+
API+hợp đồng) sẽ vượt hẳn 1000 dòng nếu gộp — huống hồ kèm UI. Slice này riêng
(chỉ schema+lõi, không API không UI) còn trong ngưỡng.

### T-022b [B] prio:22.2 — Thanh toán và tạo hoá đơn: API
Trạng thái: DONE · Phụ thuộc: T-022a
Xong khi: `POST /api/hoa-don` nhận giỏ hàng qua hợp đồng Zod
(`src/shared/hop-dong/hoa-don.ts`), gọi `taoHoaDonTuGioHang`; 400 khi dữ liệu
không hợp lệ, 409 khi tồn không đủ hoặc giảm giá vượt tổng tiền hàng; lấy
`chiNhanhId` qua `layChiNhanhMacDinh` (`src/server/db/chi-nhanh.ts`, đã có từ
T-010b — get-or-create idempotent, ID cố định) trước khi ghi chứng từ, **không
tự viết lại logic này**. Không có UI.
Ghi chú: bản gốc của mục "Xong khi" này viết là "đây là API đầu tiên thật sự
cần chiNhanhId" — sai, đã lỗi thời từ khi T-010b merge (API cài đặt quản lý lô
cũng ghi thẻ kho `DOI_CHE_DO` nên cần chiNhanhId trước). Sửa lại ở đây để run
sau không đi lại đường đã có.

### T-022c [A] prio:22.3 — Thanh toán và tạo hoá đơn: giao diện
Trạng thái: CHỜ MERGE · Phụ thuộc: T-022b
Xong khi: panel thanh toán trong màn bán hàng — giảm giá/thu khác nhập được,
chọn phương thức thanh toán tiền mặt/chuyển khoản/thẻ/ví, nút tiền mặt nhanh,
khách cần trả và tiền thừa hiển thị; gọi `POST /api/hoa-don`, thành công thì xoá
giỏ hàng và báo mã hoá đơn vừa tạo; **F9** chuyển sang khu vực thanh toán,
**Enter** xác nhận (UI-FIDELITY.md nhóm 2, cần chủ dự án xác nhận với người
dùng thật — xem BLOCKED.md mục T-020); toàn bộ luồng làm được bằng bàn phím.
Ghi chú: **Sửa lúc làm** — dòng gốc ở đây ("không có screenshot cho màn thanh
toán") SAI, chỉ nhìn tên file chưa mở ảnh; `Bán hàng/Chọn 1 món hàng để
bán...png`/`Giao diện bán hàng chưa có sản phẩm.png` đều hiện đầy đủ panel
này — xem JOURNAL.md entry T-022c. In hoá đơn thuộc T-023. Đổi nhãn [B] gốc
sang [A]: chỉ nối `POST /api/hoa-don` (T-022b) đã duyệt, không thêm kiến trúc
mới — tiền lệ T-022a[B]→T-022b[A].

### T-023 [A] prio:23 — In hoá đơn
Trạng thái: TODO · Phụ thuộc: T-022c
Xong khi: in được khổ cuộn K57 và K80; có preview; nội dung khớp thông tin trong
ảnh hoá đơn KiotViet.
Tầng A: chỉ đọc dữ liệu đã ghi, không thay đổi kho hay tiền.

### T-024 [B] prio:24 — Quét mã vạch tại màn bán hàng
Trạng thái: DONE · Phụ thuộc: T-020
Xong khi: mã nhà sản xuất và mã tem tự in đều tra được; quét liên tiếp nhiều mã
không mất nhịp và không mất ký tự; phân biệt được luồng quét với gõ tay bằng nhịp
phím; máy quét hoạt động như bàn phím nên không cần driver.

### T-025 [B] prio:25 — Nhiều hoá đơn song song
Trạng thái: TODO · Phụ thuộc: T-022c
Xong khi: mở nhiều tab hoá đơn như KiotViet; chuyển tab bằng bàn phím; giỏ đang gõ
dở không mất khi chuyển; **có test chứng minh dòng hàng không lẫn giữa các tab**.
Tầng B dù trông như việc giao diện: trộn nhầm dòng giữa hai tab sinh ra hoá đơn sai
và trừ kho sai — đây là đường ghi, không phải đường đọc.

---

## Milestone 3 — Offline

Kịch bản đã chốt: máy chủ ở xa, quầy qua Internet. **Chỉ bán hàng và trả hàng chạy
được khi offline**; nhập hàng, kiểm kê, xuất huỷ yêu cầu online.

### T-030 [B] prio:30 — Vỏ PWA và chỉ báo trạng thái
Trạng thái: DONE · Phụ thuộc: T-020
Xong khi: service worker cache vỏ app và danh mục tra cứu; màn bán hàng **luôn
hiện** đang online/offline, số thao tác chờ đồng bộ, thời điểm đồng bộ gần nhất;
mất mạng giữa lúc bán không popup chặn màn hình và không mất giỏ.

### T-031 [B] prio:31 — Hàng đợi thao tác trong Dexie
Trạng thái: TODO · Phụ thuộc: T-030
Xong khi: mỗi thao tác bất biến, có ULID do client sinh, **idempotent**; trạng thái
rõ ràng chờ gửi/đã gửi/đã xác nhận/lỗi; không bao giờ tự xoá thao tác chưa được máy
chủ xác nhận; gửi lại hai lần không nhân đôi tồn kho — có test.

### T-032 [B] prio:32 — Số hoá đơn cấp tại client
Trạng thái: TODO · Phụ thuộc: T-031
Xong khi: dạng `HD<mã máy>-<số tăng dần>`; cấp được khi offline; **bất biến sau khi
đồng bộ**; hai thiết bị không bao giờ va số; số đã in luôn tra cứu được.

### T-033 [B] prio:33 — Đồng bộ phía máy chủ
Trạng thái: TODO · Phụ thuộc: T-032
Xong khi: máy chủ nhận hàng đợi, áp dụng theo thứ tự đến, idempotent theo ULID;
**không bao giờ từ chối một đơn đã bán và đã in**; giá vốn gấp theo thứ tự đến,
không hồi tố; test đơn offline về muộn không làm đổi số đã hiển thị.

### T-034 [B] prio:34 — Cảnh báo lệch kho
Trạng thái: TODO · Phụ thuộc: T-033
Xong khi: hợp nhất ra tồn âm thì sinh cảnh báo yêu cầu kiểm kê, không tự sửa và
không im lặng; cảnh báo hiện ở màn tổng quan; test hai thiết bị cùng bán hộp cuối
khi offline.

---

## Milestone 4 — Nhập hàng

### T-040 [B] prio:40 — Phiếu nhập kèm lô và hạn dùng
Trạng thái: TODO · Phụ thuộc: T-007, T-010b
Xong khi: khớp luồng trong screenshots nhập hàng; **tạo hàng mới ngay trong màn
nhập**, không rời màn; bắt buộc lô + HSD khi sản phẩm bật quản lý lô, không hỏi khi
tắt; lưu tạm (phiếu tạm) và hoàn thành là hai trạng thái; hoàn thành mới ghi kho.

### T-041 [A] prio:41 — Danh sách và chi tiết phiếu nhập
Trạng thái: TODO · Phụ thuộc: T-040
Xong khi: thứ tự cột và bộ lọc khớp screenshot "Danh sách nhập hàng"; chi tiết mở
ra ngay dưới dòng như KiotViet.

### T-042 [A] prio:42 — In tem mã
Trạng thái: TODO · Phụ thuộc: T-040
Xong khi: chọn khổ giấy, sửa số lượng tem từng dòng, preview, in — đối chiếu
screenshots và file PDF mẫu trong `docs/reference/kiotviet/`; **bỏ dấu tiếng Việt
trên tem** vì máy in tem không in được chữ có dấu (ghi chú này lấy nguyên văn từ
màn hình KiotViet).

### T-043 [B] prio:43 — Nhập hàng từ file Excel
Trạng thái: TODO · Phụ thuộc: T-040
Xong khi: có file mẫu tải về; báo lỗi theo từng dòng; **file lỗi không làm hỏng
kho** — hoặc vào hết hoặc không vào gì.

---

## Milestone 5 — Tồn kho đúng

### T-050 [B] prio:50 — Kiểm kê
Trạng thái: DONE · Phụ thuộc: T-006
Xong khi: đếm thực tế theo lô, so sổ sách, tạo phiếu điều chỉnh **có lý do**, ghi
thẻ kho; dùng được để xử lý cảnh báo lệch kho từ T-034; dùng được để gán lô thật
cho tồn cũ đang nằm ở lô ngầm định.

### T-051 [B] prio:51 — Xuất huỷ
Trạng thái: DONE · Phụ thuộc: T-006
Xong khi: xuất khỏi kho có lý do và người thực hiện, ghi thẻ kho, chọn đúng lô.

### T-052 [B] prio:52 — Trả hàng (khách trả)
Trạng thái: TODO · Phụ thuộc: T-022c
Xong khi: hoàn về đúng lô theo **LIFO trên chính các dòng đã trừ**; ở chế độ phẳng
tự suy biến thành hoàn về lô ngầm định, không có nhánh riêng; tổng hoàn ≤ tổng đã
trừ — có test; tiền hoàn dùng `giam_gia_phan_bo` đã lưu lúc bán; khớp screenshot
danh sách trả hàng; liên kết ngược tới hoá đơn gốc.

### T-053 [B] prio:53 — Trả hàng nhập (trả nhà cung cấp)
Trạng thái: TODO · Phụ thuộc: T-040
Xong khi: khớp screenshot "Trả hàng nhập"; liên kết ngược tới phiếu nhập gốc; trừ
đúng lô đã nhập; ghi thẻ kho.

### T-054 [A] prio:54 — Màn thẻ kho
Trạng thái: BLOCKED · Phụ thuộc: T-005, T-007
Xong khi: cột Thời gian · Chứng từ · Loại · Lô/HSD · Số lượng (±) · Tồn cuối · Giá
vốn; **cột Lô/HSD ẩn khi sản phẩm ở chế độ phẳng**; "Tồn cuối" tính lại theo **thứ
tự đến máy chủ**, không lưu; xem được trên điện thoại như bản KiotViet mobile.
Ghi chú: thêm phụ thuộc T-007 — cột Giá vốn cần hình chiếu `gia_von_hien_hanh`
mà T-007 tạo ra (SPEC.md §3.4); bản gốc chỉ ghi phụ thuộc T-005 là thiếu, task
không dựng được đúng "Xong khi" nếu thiếu T-007.

### T-055 [A] prio:55 — Cảnh báo cận date
Trạng thái: TODO · Phụ thuộc: T-010b
Xong khi: báo cáo hết hạn trong 30/60/90 ngày; một ô trên màn tổng quan.
Ghi chú: **chỉ có tác dụng khi quầy đã bắt đầu dùng lô thật.** Ngày đầu toàn bộ tồn
nằm ở lô ngầm định nên báo cáo sẽ rỗng — đó là đúng, không phải bug.

---

## Milestone 6 — Chuyển dữ liệu và không mất dữ liệu

### T-060 [B] prio:60 — Nhập tồn đầu kỳ từ KiotViet
Trạng thái: BLOCKED · Phụ thuộc: T-009c, T-005
Ghi chú: BLOCKED 2026-09-22 — thiếu file mẫu thật (hoặc cột/định dạng đã chốt)
của "bản xuất KiotViet" để dựng parser; xem `BLOCKED.md`.
Xong khi: đọc bản xuất KiotViet; **gộp các mã hàng cùng thuốc khác đơn vị thành một
sản phẩm nhiều đơn vị**; nếu bản xuất không mang hệ số thì suy từ tên hàng và **bắt
người dùng xác nhận từng nhóm**, mặc định không gộp khi không chắc; tồn vào bằng
đúng một phiếu `KIEM_KE` ngày chuyển đổi; toàn bộ vào lô ngầm định; chạy lại lần hai
không nhân đôi tồn.

### T-061 [B] prio:90 — Sao lưu tự động
Trạng thái: TODO · Phụ thuộc: T-004c
Xong khi: `VACUUM INTO` hằng đêm, nén, xoay vòng, **đẩy sang máy khác**; kiểm tra
`PRAGMA integrity_check` định kỳ; báo động khi một đêm không có bản sao mới.
Ghi chú: prio đẩy từ 61 lên 90 theo chỉ đạo chủ dự án ngày 2026-09-14
(#quaythuoc-admin) — "tạm thời bỏ qua T-061, chuyển thành việc cuối cùng". Vẫn
đang `BLOCKED` (xem `BLOCKED.md` — thiếu đích/xác thực đẩy backup sang máy
khác); đẩy prio không tự gỡ block, chỉ đảm bảo khi được gỡ block nó vẫn xếp
sau mọi task khác trong backlog hiện có.

### T-062 [B] prio:91 — Khôi phục và diễn tập khôi phục
Trạng thái: TODO · Phụ thuộc: T-061
Xong khi: khôi phục từ bản sao lưu về môi trường trống **thành công thật**, có tài
liệu các bước trong repo.
**Quầy không được dùng thật trước khi task này DONE.**
Ghi chú: prio đẩy từ 62 lên 91 cùng lý do với T-061 — nó vốn đã phụ thuộc
T-061 nên tự nhiên xếp sau, đổi số chỉ để nhất quán khi đọc file.

---

## v1.1 trở đi — chưa đưa vào backlog

| Hạng mục | Ghi chú |
|---|---|
| Thông tin dược: hoạt chất, hàm lượng, dạng bào chế, SĐK, cờ kê đơn | Chủ dự án đã chốt hoãn. Kéo theo: **tìm theo hoạt chất** — đã gỡ khỏi T-020 |
| Khách hàng và công nợ khách | |
| Công nợ nhà cung cấp | |
| Kết ca / chốt tiền cuối ngày | |
| Nhân viên, chấm công, lương, hoa hồng | Quầy chỉ có một người bán |
| Bác sĩ, đơn thuốc mẫu | |
| Nhiều chi nhánh, chuyển kho | Cột `chi_nhanh_id` đã có sẵn nên bật lên không phải migrate |
| Báo cáo nâng cao, bán online | |

Đừng để backlog phình ra trước khi Milestone 1–6 chạy được ở quầy thật.
