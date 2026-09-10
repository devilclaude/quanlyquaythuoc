# Backlog

Trạng thái: `TODO` | `DOING` | `DONE` | `BLOCKED`
Tầng: `[A]` tự merge khi CI xanh · `[B]` chờ người duyệt

Agent chỉ chọn task `TODO` có toàn bộ phụ thuộc `DONE`, prio nhỏ nhất trước.

Mỗi task là **một lát cắt dọc** — schema + logic + endpoint + test + nối giao diện —
không phải một tầng kiến trúc. Nếu một task vượt quá một PR hợp lý (>300 dòng đổi
hoặc >8 file), chẻ nó trong file này và mở PR chỉ chứa việc chẻ.

## Tiêu chí gắn tầng

`CLAUDE.md` quy định nhóm **luôn là `[B]`**: tồn kho, lô, hạn dùng, quy đổi đơn vị,
tiền, hoá đơn, đồng bộ offline, migration, phân quyền, backup.

**Nhóm đó chỉ áp cho task GHI dữ liệu.** Task chỉ ĐỌC — báo cáo, cảnh báo, in ấn,
màn hình hiển thị — được `[A]`, kể cả khi nó đọc tồn kho hay tiền.

Nghi ngờ thì `[B]`. Không bao giờ tự nâng `[B]` lên `[A]`.

---

## Milestone 1 — Nền tảng, tiền, và kho theo lô

### T-001 [B] prio:1 — Khởi tạo dự án và CI
Trạng thái: TODO · Phụ thuộc: —
Xong khi: bộ lệnh trong `ARCHITECTURE.md` §7 chạy được và xanh; `tsconfig` bật
`strict` + `noUncheckedIndexedAccess`; ESLint + Prettier + dependency-cruiser cấu
hình xong; CI chặn được một PR cố tình phá test.
Tầng B: quyết định nền, sửa về sau tốn cả repo.

### T-002 [B] prio:2 — Branded types và số học tiền
Trạng thái: TODO · Phụ thuộc: T-001
Xong khi: `Dong`, `SoLuongCoSo`, `Ulid` tồn tại và cộng nhầm nhau là **lỗi biên
dịch**; hàm làm tròn nửa lên và **phân bổ số dư lớn nhất** có test; ví dụ trong
`SPEC.md` §3.4 (10.000/20.000/30.000 giảm 7.000 → 1.167/2.333/3.500) là một test;
ESLint chặn được số thực trong `src/shared/tien/**`.

### T-003 [B] prio:3 — Quy đổi đơn vị
Trạng thái: TODO · Phụ thuộc: T-002
Xong khi: hệ số là số nguyên ≥ 1; quy đổi hai chiều có test; ví dụ chuẩn trong
`SPEC.md` §3.3 (nhập 5 hộp, bán 3 vỉ, còn 864 viên) là một test; hiển thị phụ
"≈ 4,8 hộp" không bao giờ quay lại tính toán.

### T-004 [B] prio:4 — Schema: hàng hoá, đơn vị, lô, thẻ kho, tồn kho, chi nhánh
Trạng thái: TODO · Phụ thuộc: T-001
Xong khi: migration tạo mô hình tồn theo `(sản phẩm, lô, HSD)`; mỗi sản phẩm được
cấp **lô ngầm định** lúc tạo; `chi_nhanh_id` có mặt trên tồn kho/thẻ kho/chứng từ
nhưng **không** trên `lo_hang`; trigger CSDL **chặn UPDATE và DELETE** trên
`the_kho`; đủ ràng buộc unique theo `ARCHITECTURE.md` §6; seed có thuốc nhiều đơn
vị, nhiều lô, và hàng không theo lô.
Tầng B: đây là quyết định không sửa được về sau.

### T-005 [B] prio:5 — Lớp kho: ghi sổ cái và bản đệm tồn
Trạng thái: TODO · Phụ thuộc: T-004
Xong khi: mọi thay đổi tồn đi qua **một đường code duy nhất** ghi thẻ kho; bản đệm
`ton_kho_lo` cập nhật trong cùng transaction; test bất biến "tổng sổ cái == bản
đệm" chạy trên dữ liệu ngẫu nhiên; dựng lại bản đệm từ sổ cái ra cùng kết quả.

### T-006 [B] prio:6 — FEFO và cấp phát nhiều lô
Trạng thái: TODO · Phụ thuộc: T-005
Xong khi: thứ tự chọn lô đúng `hsd ASC NULLS FIRST, ngay_tao ASC, lo_id ASC`; tồn
không đủ ở một lô thì chia đúng sang lô kế tiếp; chọn lô thủ công ghi đè được FEFO;
**không có nhánh `if` nào theo cài đặt quản lý lô**; toàn bộ ca test chạy lại được
với sản phẩm chỉ có lô ngầm định và cho cùng số dư cuối; ca biên: số lượng 0, tồn
không đủ, bán vượt tồn bị từ chối khi online.

### T-007 [B] prio:7 — Giá vốn bình quân gia quyền
Trạng thái: TODO · Phụ thuộc: T-006
Xong khi: hình chiếu giữ cặp `(ton, gia_tri_ton)` đều là số nguyên; nhập không sinh
phép chia; COGS = `làm_tròn(gia_tri_ton × sl / ton)`; **bán hết thì `gia_tri_ton`
về đúng 0** — có test; hình chiếu gấp theo **thứ tự đến máy chủ**, dựng lại được từ
sổ cái; client không cần biết giá vốn.

### T-008 [A] prio:8 — Design token và component cơ bản
Trạng thái: TODO · Phụ thuộc: T-001
Xong khi: token màu/chữ/khoảng cách lấy từ `.claude/skills/design-system/`, không
gọi lại generator; component dùng lại được cho bảng, ô nhập, nút, badge trạng thái;
đối chiếu `UI-FIDELITY.md`.

### T-009 [B] prio:9 — Màn hàng hoá: danh sách, tạo, sửa
Trạng thái: TODO · Phụ thuộc: T-004, T-008
Xong khi: thứ tự cột khớp screenshot "Danh sách hàng hóa"; form tạo có đủ trường
quan sát được trong "Tạo mới hàng hóa"; khai được nhiều đơn vị kèm hệ số và giá
riêng; **thêm đơn vị mới thì form điền sẵn gợi ý giá = giá cơ sở × hệ số, sửa được**;
cấm đổi đơn vị cơ sở khi sản phẩm đã có thẻ kho; xoá cứng chỉ khi chưa phát sinh,
đã phát sinh thì chỉ "Ngừng hoạt động".

### T-010 [B] prio:10 — Cài đặt quản lý theo lô
Trạng thái: TODO · Phụ thuộc: T-006, T-009
Xong khi: cài đặt toàn cục + ghi đè theo sản phẩm (ba trạng thái), **mặc định TẮT**;
giao diện nhập/bán/thẻ kho phản ứng đúng bảng trong `DOMAIN-NOTES.md`; tắt→bật luôn
cho phép; bật→tắt bị chặn khi sản phẩm còn hơn một lô có tồn > 0; cả hai chiều ghi
thẻ kho loại `DOI_CHE_DO` với số lượng 0; **test kiểm tra hàm giải nghĩa cài đặt
không xuất hiện trong `src/server/kho/**`**.

---

## Milestone 2 — Bán hàng (ưu tiên cao nhất)

### T-020 [B] prio:20 — Màn bán hàng: tìm và thêm hàng
Trạng thái: TODO · Phụ thuộc: T-006, T-009
Xong khi: bố cục khớp screenshot "Giao diện bán hàng chưa có sản phẩm" và "Tìm sản
phẩm để bán"; tìm **theo tên và mã hàng** (tìm theo hoạt chất là v1.1, không làm);
gợi ý hiện tồn và giá như trong ảnh; **chọn và thêm hoàn toàn bằng bàn phím**.

### T-021 [B] prio:21 — Chọn đơn vị và số lượng
Trạng thái: TODO · Phụ thuộc: T-020, T-003
Xong khi: khớp screenshot "Chọn 1 món hàng để bán"; đổi đơn vị trừ đúng số đơn vị
cơ sở; sửa số lượng bằng bàn phím; giá lấy theo đơn vị đã chọn, không nhân hệ số.

### T-022 [B] prio:22 — Thanh toán và tạo hoá đơn
Trạng thái: TODO · Phụ thuộc: T-021, T-007
Xong khi: trừ kho theo FEFO trong **một transaction nguyên tử**; ghi thẻ kho; đẳng
thức `khách_cần_trả = tổng − giảm_giá + thu_khác + làm_tròn` có test; làm tròn hoá
đơn **mặc định tắt**; phương thức thanh toán tiền mặt/chuyển khoản/thẻ/ví; nút tiền
mặt nhanh như trong ảnh; test hai đơn cùng bán hộp cuối khi online → đơn thứ hai bị
từ chối.

### T-023 [A] prio:23 — In hoá đơn
Trạng thái: TODO · Phụ thuộc: T-022
Xong khi: in được khổ cuộn K57 và K80; có preview; nội dung khớp thông tin trong
ảnh hoá đơn KiotViet.
Tầng A: chỉ đọc dữ liệu đã ghi, không thay đổi kho hay tiền.

### T-024 [B] prio:24 — Quét mã vạch tại màn bán hàng
Trạng thái: TODO · Phụ thuộc: T-020
Xong khi: mã nhà sản xuất và mã tem tự in đều tra được; quét liên tiếp nhiều mã
không mất nhịp và không mất ký tự; phân biệt được luồng quét với gõ tay bằng nhịp
phím; máy quét hoạt động như bàn phím nên không cần driver.

### T-025 [B] prio:25 — Nhiều hoá đơn song song
Trạng thái: TODO · Phụ thuộc: T-022
Xong khi: mở nhiều tab hoá đơn như KiotViet; chuyển tab bằng bàn phím; giỏ đang gõ
dở không mất khi chuyển; **có test chứng minh dòng hàng không lẫn giữa các tab**.
Tầng B dù trông như việc giao diện: trộn nhầm dòng giữa hai tab sinh ra hoá đơn sai
và trừ kho sai — đây là đường ghi, không phải đường đọc.

---

## Milestone 3 — Offline

Kịch bản đã chốt: máy chủ ở xa, quầy qua Internet. **Chỉ bán hàng và trả hàng chạy
được khi offline**; nhập hàng, kiểm kê, xuất huỷ yêu cầu online.

### T-030 [B] prio:30 — Vỏ PWA và chỉ báo trạng thái
Trạng thái: TODO · Phụ thuộc: T-020
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
Trạng thái: TODO · Phụ thuộc: T-007, T-010
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
Trạng thái: TODO · Phụ thuộc: T-006
Xong khi: đếm thực tế theo lô, so sổ sách, tạo phiếu điều chỉnh **có lý do**, ghi
thẻ kho; dùng được để xử lý cảnh báo lệch kho từ T-034; dùng được để gán lô thật
cho tồn cũ đang nằm ở lô ngầm định.

### T-051 [B] prio:51 — Xuất huỷ
Trạng thái: TODO · Phụ thuộc: T-006
Xong khi: xuất khỏi kho có lý do và người thực hiện, ghi thẻ kho, chọn đúng lô.

### T-052 [B] prio:52 — Trả hàng (khách trả)
Trạng thái: TODO · Phụ thuộc: T-022
Xong khi: hoàn về đúng lô theo **LIFO trên chính các dòng đã trừ**; ở chế độ phẳng
tự suy biến thành hoàn về lô ngầm định, không có nhánh riêng; tổng hoàn ≤ tổng đã
trừ — có test; tiền hoàn dùng `giam_gia_phan_bo` đã lưu lúc bán; khớp screenshot
danh sách trả hàng; liên kết ngược tới hoá đơn gốc.

### T-053 [B] prio:53 — Trả hàng nhập (trả nhà cung cấp)
Trạng thái: TODO · Phụ thuộc: T-040
Xong khi: khớp screenshot "Trả hàng nhập"; liên kết ngược tới phiếu nhập gốc; trừ
đúng lô đã nhập; ghi thẻ kho.

### T-054 [A] prio:54 — Màn thẻ kho
Trạng thái: TODO · Phụ thuộc: T-005
Xong khi: cột Thời gian · Chứng từ · Loại · Lô/HSD · Số lượng (±) · Tồn cuối · Giá
vốn; **cột Lô/HSD ẩn khi sản phẩm ở chế độ phẳng**; "Tồn cuối" tính lại theo **thứ
tự đến máy chủ**, không lưu; xem được trên điện thoại như bản KiotViet mobile.

### T-055 [A] prio:55 — Cảnh báo cận date
Trạng thái: TODO · Phụ thuộc: T-010
Xong khi: báo cáo hết hạn trong 30/60/90 ngày; một ô trên màn tổng quan.
Ghi chú: **chỉ có tác dụng khi quầy đã bắt đầu dùng lô thật.** Ngày đầu toàn bộ tồn
nằm ở lô ngầm định nên báo cáo sẽ rỗng — đó là đúng, không phải bug.

---

## Milestone 6 — Chuyển dữ liệu và không mất dữ liệu

### T-060 [B] prio:60 — Nhập tồn đầu kỳ từ KiotViet
Trạng thái: TODO · Phụ thuộc: T-009, T-005
Xong khi: đọc bản xuất KiotViet; **gộp các mã hàng cùng thuốc khác đơn vị thành một
sản phẩm nhiều đơn vị**; nếu bản xuất không mang hệ số thì suy từ tên hàng và **bắt
người dùng xác nhận từng nhóm**, mặc định không gộp khi không chắc; tồn vào bằng
đúng một phiếu `KIEM_KE` ngày chuyển đổi; toàn bộ vào lô ngầm định; chạy lại lần hai
không nhân đôi tồn.

### T-061 [B] prio:61 — Sao lưu tự động
Trạng thái: TODO · Phụ thuộc: T-004
Xong khi: `VACUUM INTO` hằng đêm, nén, xoay vòng, **đẩy sang máy khác**; kiểm tra
`PRAGMA integrity_check` định kỳ; báo động khi một đêm không có bản sao mới.

### T-062 [B] prio:62 — Khôi phục và diễn tập khôi phục
Trạng thái: TODO · Phụ thuộc: T-061
Xong khi: khôi phục từ bản sao lưu về môi trường trống **thành công thật**, có tài
liệu các bước trong repo.
**Quầy không được dùng thật trước khi task này DONE.**

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
