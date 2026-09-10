# SPEC — Phần mềm quản lý quầy thuốc

File này là **yêu cầu sản phẩm**. Nó viết cho một agent không có bối cảnh gì
ngoài repo này. Đọc hết trước khi làm task đầu tiên.

Quyết định kỹ thuật (stack, cấu trúc thư mục, lệnh) nằm ở `ARCHITECTURE.md`.
Luật bám giao diện nằm ở `UI-FIDELITY.md`. Nghiệp vụ nền nằm ở `DOMAIN-NOTES.md`.

---

## 1. Bối cảnh

Người dùng duy nhất là một **dược sĩ bán hàng tại quầy**, không phải người kỹ
thuật, đang dùng KiotViet và sẽ chuyển sang phần mềm này. Phần mềm tự host trên
Proxmox tại nhà chủ dự án; quầy truy cập qua Internet.

Quy mô thật: **1.000–5.000 mặt hàng**, **20–60 đơn/ngày**, **10–30 nhà cung cấp**,
một quầy, thường một máy bán.

Phần cứng tại quầy: máy quét mã vạch rời (USB/wireless, hoạt động như bàn phím),
máy in hoá đơn nhiệt khổ cuộn K57/K80, máy in tem mã chuyên dụng, PC Windows đời
khá mới.

Thành công của v1 đo bằng đúng một câu hỏi: **quầy bán được hàng cả ngày mà không
cần gọi ai.**

---

## 2. Phạm vi v1

Theo thứ tự ưu tiên. Không đảo thứ tự này.

1. **Bán được hàng** và in được hoá đơn
2. **Nhập được hàng** kèm lô và hạn dùng
3. **Tồn kho đúng**, có kiểm kê để sửa khi lệch
4. **Không mất dữ liệu**, có backup đã thử khôi phục

### Trong v1

| Nhóm | Chức năng |
|---|---|
| Bán hàng | Tìm hàng, thêm giỏ, chọn đơn vị và số lượng, thanh toán đa phương thức, in hoá đơn, quét mã vạch, nhiều hoá đơn song song |
| Hàng hoá | Danh sách, chi tiết, tạo/sửa, đơn vị quy đổi, thẻ kho, in tem mã |
| Nhập hàng | Phiếu nhập kèm lô/HSD, tạo hàng mới ngay trong màn nhập, nhập từ file, danh sách và chi tiết phiếu, in tem sau nhập |
| Kho | Kiểm kê, xuất huỷ, trả hàng (khách trả), trả hàng nhập (trả NCC) |
| Offline | Bán và trả hàng chạy khi mất mạng, hàng đợi đồng bộ, chỉ báo trạng thái |
| Dữ liệu | Nhập tồn đầu kỳ từ bản xuất KiotViet, sao lưu tự động, khôi phục đã diễn tập |
| Cài đặt | Bật/tắt quản lý theo lô (toàn cục + ghi đè theo sản phẩm) |

### NGOÀI v1 — không làm, kể cả khi thấy dễ

| Bị loại | Lý do |
|---|---|
| Thông tin dược (hoạt chất, hàm lượng, dạng bào chế, SĐK, cờ kê đơn) | Chủ dự án đã chốt đẩy sang v1.1 |
| Tìm theo hoạt chất | Phụ thuộc mục trên |
| Khách hàng, công nợ khách | v1.1 |
| Công nợ nhà cung cấp | v1.1 |
| Kết ca / chốt tiền cuối ngày | v1.1 |
| Nhân viên, chấm công, lương, hoa hồng | v1.1 — quầy chỉ có một người bán |
| Bác sĩ, đơn thuốc mẫu | Chủ dự án đã xác định chưa cần |
| Bán online, nhiều chi nhánh, chuyển kho | v1 chỉ một quầy |
| Báo cáo nâng cao | v1 chỉ cần tổng quan và thẻ kho |

Nếu một task có vẻ cần thứ nằm trong bảng này, đó là dấu hiệu task bị định nghĩa
sai — ghi `BLOCKED.md` và dừng.

---

## 3. Mô hình dữ liệu (mức khái niệm)

Lược đồ chi tiết và kiểu dữ liệu nằm ở `ARCHITECTURE.md`. Ở đây là **ý nghĩa** và
**bất biến**, những thứ không được phép vi phạm.

### 3.1 Thẻ kho là nguồn sự thật

`the_kho` là một **sổ cái chỉ-ghi-thêm**. Mọi thay đổi tồn kho — bán, nhập, trả,
trả NCC, kiểm kê, xuất huỷ — sinh ra một hoặc nhiều dòng ở đây, với `so_luong` có
dấu (`+` vào kho, `−` ra kho), tính bằng **đơn vị cơ sở**.

- **Cấm UPDATE và DELETE trên `the_kho`.** Sai thì ghi dòng đảo, không sửa dòng cũ.
- Tồn kho (`ton_kho_lo`) là **bản đệm suy ra** từ sổ cái. Có test bất biến:
  tổng `so_luong` theo `(lo_id, chi_nhanh_id)` phải bằng đúng bản đệm.
- Dựng lại bản đệm từ sổ cái phải luôn ra cùng kết quả.

### 3.2 Tồn kho luôn lưu theo lô

Đơn vị tồn là `(sản phẩm, lô, hạn dùng)`. **Không có ngoại lệ.**

Mỗi sản phẩm khi được tạo sẽ có ngay một **lô ngầm định** (`so_lo = NULL`,
`hsd = NULL`, `la_lo_mac_dinh = true`). Chế độ "tồn phẳng" chỉ là trạng thái sản
phẩm đó chỉ có duy nhất lô ngầm định.

Cài đặt "quản lý theo lô" điều khiển **giao diện và validation**, không bao giờ
điều khiển cách lưu trữ hay cách tính.

> **v1 khởi chạy với quản lý theo lô TẮT mặc định.** Quầy hiện không dùng lô.
> Giao diện lô phải tồn tại nhưng không cản đường. Vì tầng lưu trữ đã theo lô sẵn,
> ngày quầy bật lên sẽ **không phải migrate gì cả**.

**Cấm tuyệt đối viết hai nhánh xử lý kho theo cài đặt này.** Không có
`if (quanLyLo) {...} else {...}` trong lớp kho. Nếu thấy mình sắp viết nhánh thứ
hai, đó là dấu hiệu thiết kế sai — ghi `BLOCKED.md` và dừng.

Hàm giải nghĩa cài đặt chỉ được gọi ở đúng ba nơi: validation form nhập hàng,
ẩn/hiện cột trên giao diện, và bộ lọc báo cáo cận date. **Không được xuất hiện
trong module kho** — có test kiểm tra điều này.

### 3.3 Đơn vị quy đổi

Một sản phẩm có nhiều **đơn vị tính** (viên / vỉ / hộp), mỗi đơn vị có `he_so` =
số đơn vị cơ sở chứa trong nó. Đơn vị cơ sở có `he_so = 1`.

- Tồn kho lưu ở **đơn vị cơ sở**. Quy đổi chỉ xảy ra ở lớp hiển thị và nhập liệu.
- **Mọi số lượng và hệ số là số nguyên.** Quầy không bao giờ bán nhỏ hơn một đơn
  vị cơ sở (không cắt nửa viên).
- **Giá bán khai riêng cho từng đơn vị**, không suy ra bằng phép nhân. Dữ liệu
  thật: vỉ 17.000đ nhưng hộp 260.000đ, trong khi 17.000 × 15 = 255.000đ.
- Khi người dùng **thêm một đơn vị mới**, form **điền sẵn gợi ý** giá = giá đơn vị
  cơ sở × hệ số, và người dùng sửa được. Đây là hành vi của form, **không phải quy
  tắc suy ra tự động** — giá đã lưu là độc lập.
- **Cấm đổi đơn vị cơ sở** sau khi sản phẩm đã phát sinh thẻ kho. Đổi cơ sở nghĩa
  là viết lại toàn bộ lịch sử.

Ví dụ chuẩn để test: 1 vỉ = 12 viên, 1 hộp = 15 vỉ = 180 viên, cơ sở = viên.
Nhập 5 hộp → thẻ kho `+900`. Bán 3 vỉ → thẻ kho `−36`. Tồn còn **864 viên**, hiển
thị chính "864 viên", phụ "≈ 4,8 hộp".

### 3.4 Tiền

- **Số nguyên, đơn vị đồng.** Cấm số thực ở mọi tầng, kể cả biến trung gian và
  JSON truyền đi.
- Giá trị tồn kho (`gia_tri_ton`) cũng là số nguyên đồng.
- Đơn giá vốn hiển thị được tính ra khi cần, **chỉ để đọc**, không lưu làm trạng thái.

**Giá vốn dùng bình quân gia quyền** (giống KiotViet). Cách lưu để không trôi số:
giữ cặp `(ton, gia_tri_ton)`, cả hai là số nguyên.

| Thao tác | Phép tính |
|---|---|
| Nhập `sl` với tổng tiền `T` | `ton += sl` · `gia_tri_ton += T` — không có phép chia |
| Bán `sl` | `cogs = làm_tròn(gia_tri_ton × sl / ton)` · `gia_tri_ton −= cogs` · `ton −= sl` |
| Hiển thị đơn giá vốn | `gia_tri_ton / ton` — chỉ để đọc |

Khi bán hết (`sl = ton`) thì `cogs = gia_tri_ton` và giá trị tồn về đúng 0. Nhân
trước, chia sau — phần dư luôn nằm lại trong `gia_tri_ton`, không tích luỹ sai số.

`gia_von_hien_hanh` là **hình chiếu suy ra** từ sổ cái, gấp theo **thứ tự đến máy
chủ**, không hồi tố. Số đã hiển thị hoặc đã in không bao giờ đổi. Hệ quả: **client
không cần biết giá vốn** — máy chủ tính khi nhận.

**Mọi phép chia và cách làm tròn** — không được tự nghĩ ra quy tắc khác:

| Chỗ chia | Làm tròn |
|---|---|
| COGS dòng bán (`gia_tri_ton × sl / ton`) | Nửa lên → số nguyên đồng |
| Đơn giá vốn hiển thị (`gia_tri_ton / ton`) | Chỉ hiển thị, không quay lại tính toán |
| Giảm giá % trên dòng | Nửa lên |
| Phân bổ giảm giá **toàn hoá đơn** về từng dòng | **Số dư lớn nhất** — Σ phần phải bằng đúng tổng |
| Làm tròn hoá đơn | Trường riêng `lam_tron`, **mặc định tắt** |
| Tiền hoàn khi trả hàng một phần | Dùng `giam_gia_phan_bo` đã lưu lúc bán, **không tính lại từ %** |
| Quy đổi tồn ra đơn vị lớn ("4,8 hộp") | Chỉ hiển thị |

**Đẳng thức bất biến của hoá đơn**, phải có test:
`khách_cần_trả = tổng_tiền_hàng − giảm_giá_hoá_đơn + thu_khác + làm_tròn`

### 3.5 Xoá dữ liệu

- **Chứng từ giao dịch không bao giờ xoá.** Huỷ có ghi nhận, bằng bút toán đảo.
- Sản phẩm và lô: **xoá cứng được chỉ khi chưa phát sinh dòng thẻ kho nào**. Đã
  phát sinh thì chỉ được "Ngừng hoạt động".

### 3.6 Thời gian và chi nhánh

- Lưu **UTC**, hiển thị giờ Việt Nam.
- Mỗi dòng thẻ kho giữ **hai mốc**: `thoi_gian` (giờ thiết bị, lúc bán) và
  `thoi_gian_may_chu` (lúc máy chủ nhận). Báo cáo dùng giờ máy chủ khi có.
- `chi_nhanh_id` có mặt trên tồn kho, thẻ kho và chứng từ **ngay từ đầu**, dù v1
  chỉ có một giá trị. Lô thì **không** thuộc chi nhánh — một lô là một lô.

---

## 4. Quy tắc nghiệp vụ kho

### 4.1 Bán — trừ theo FEFO

Thứ tự chọn lô khi xuất: `hsd ASC NULLS FIRST`, rồi `ngay_tao ASC`, rồi `lo_id ASC`.

> **NULLS FIRST là cố ý.** Tồn cũ chưa rõ hạn dùng (lô ngầm định) được bán **trước**
> lô thật có HSD. Lý do: sau khi chuyển từ KiotViet, toàn bộ tồn đầu kỳ nằm ở lô
> ngầm định; bán chúng trước làm đống tồn không rõ HSD tự vơi đi thay vì đọng lại.

Rủi ro đi kèm: khi quầy bắt đầu dùng lô thật, một lô cận date có thể hết hạn trong
lúc hệ thống vẫn đang bán tồn cũ. Cảnh báo cận date là lưới an toàn cho việc này —
nó chỉ có tác dụng khi đã có dữ liệu HSD thật.

Người dùng phải **chọn lô khác được bằng tay** khi cần; FEFO chỉ là mặc định.

### 4.2 Trả hàng — hoàn đúng lô

Trả hàng đọc chính các dòng thẻ kho đã trừ của dòng hoá đơn đó, và hoàn theo
**LIFO** (lô bị trừ sau cùng được hoàn trước), tối đa bằng số đã trừ của từng lô.

Ở chế độ phẳng, quy tắc này tự suy biến thành "hoàn về lô ngầm định" — cùng một
đường code, không có nhánh riêng.

### 4.3 Chuyển chế độ quản lý lô

- Tắt → bật: **luôn cho phép**.
- Bật → tắt: **chỉ cho phép khi sản phẩm có ≤ 1 lô còn tồn > 0**. Nếu nhiều hơn,
  chặn lại và yêu cầu kiểm kê gộp trước. **Không bao giờ tự động gộp** — gộp là
  hành vi phá dữ liệu hạn dùng.
- Cả hai chiều ghi một dòng thẻ kho loại `DOI_CHE_DO` với `so_luong = 0`, và có
  test riêng.

### 4.4 Tồn âm

Tồn âm **không phải trạng thái hợp lệ**. Khi online, bán vượt tồn bị chặn.

Đường duy nhất dẫn tới tồn âm là hai thiết bị cùng bán khi mất mạng. Khi đó máy
chủ **vẫn nhận đơn** (không bao giờ từ chối một đơn đã bán và đã in), tính ra số dư
âm, và sinh **cảnh báo lệch kho** yêu cầu kiểm kê. Không tự sửa, không im lặng.

---

## 5. Hành vi offline

Quầy truy cập máy chủ qua Internet. Mất mạng là hiếm nhưng phải sống sót.

### 5.1 Việc gì chạy được khi offline

| Chạy offline | Yêu cầu online |
|---|---|
| **Bán hàng**, **trả hàng** | Nhập hàng, trả hàng nhập, kiểm kê, xuất huỷ, sửa danh mục |

Câu giải thích cho người dùng: *"Mất mạng thì bán và trả hàng vẫn chạy; nhập hàng,
kiểm kê, xuất huỷ thì chờ có mạng."*

Vì mọi chứng từ làm đổi giá vốn đều chỉ tạo được khi online, thứ tự áp dụng do máy
chủ định đoạt hoàn toàn.

### 5.2 Hàng đợi thao tác

Client giữ hàng đợi **thao tác** (không phải hàng đợi dòng bảng). Mỗi thao tác:
bất biến, có **ULID do client sinh**, **idempotent** — gửi lại là no-op.

### 5.3 Số hoá đơn

Cấp **ngay tại client**, dạng `HD<mã máy>-<số tăng dần>`, ví dụ `HD1-000042`. Bất
biến từ lúc in. Không bao giờ đánh số lại sau khi đồng bộ — tờ hoá đơn khách đang
cầm phải luôn tra được.

Đây là **số nội bộ của phần mềm**, không phải một dãy số do bên ngoài cấp.

### 5.4 Các xung đột và cách xử lý

| Xung đột | Xử lý |
|---|---|
| Giá đổi trên server trong khi máy offline bán giá cũ | Không xung đột — chứng từ **sao chép** giá lúc bán, không tham chiếu |
| Hai máy cùng nhập một lô `(SP, số lô, HSD)` | **Tự động gộp** — cùng khoá tự nhiên là cùng lô thật |
| Hai máy tạo sản phẩm trùng mã vạch | UNIQUE chặn, sinh việc "cần gộp" cho người dùng quyết |
| Gửi lại do mạng chập chờn | ULID + UNIQUE → no-op |
| Hai máy cùng bán hộp cuối | Nhận cả hai, sinh cảnh báo lệch kho (mục 4.4) |

### 5.5 Chỉ báo trạng thái

Màn bán hàng **luôn hiển thị**: đang online hay offline, số thao tác chờ đồng bộ,
thời điểm đồng bộ thành công gần nhất. Không giấu trong menu. Chuyển chế độ phải
êm — không popup chặn màn hình, không mất giỏ hàng đang gõ dở.

---

## 6. Luồng người dùng chính

Đối chiếu screenshots trong `docs/reference/kiotviet/`. Số bước không được nhiều
hơn KiotViet.

### 6.1 Bán một đơn (luồng quan trọng nhất)

1. Quét mã vạch **hoặc** gõ tên/mã vào ô tìm → danh sách gợi ý hiện tồn và giá
2. Chọn bằng phím mũi tên, **Enter** để thêm vào giỏ
3. Sửa số lượng, đổi đơn vị — bằng bàn phím
4. Phím tắt để sang thanh toán; chọn phương thức (tiền mặt / chuyển khoản / thẻ / ví)
5. **Enter** xác nhận → trừ kho theo FEFO trong một giao dịch nguyên tử → in hoá đơn

**Toàn bộ luồng này phải làm được mà không chạm chuột.** Hỗ trợ nhiều hoá đơn song
song (tab hoá đơn), như KiotViet.

### 6.2 Nhập hàng

1. Tìm hàng đã có, hoặc **tạo hàng mới ngay trong màn nhập** (không rời màn)
2. Nhập số lượng, đơn giá, và lô + HSD nếu sản phẩm bật quản lý lô
3. Lưu tạm (phiếu tạm) hoặc Hoàn thành
4. Sau khi hoàn thành: hỏi in tem mã, cho sửa số lượng tem từng dòng, chọn khổ
   giấy, preview, in

Có đường nhập hàng loạt **từ file Excel**, có file mẫu tải về, báo lỗi theo từng
dòng và **không được làm hỏng kho khi file lỗi**.

### 6.3 Kiểm kê

Đếm thực tế theo lô → so với sổ sách → tạo phiếu điều chỉnh **có lý do** → ghi thẻ
kho. Đây là đường sửa duy nhất khi tồn lệch, và cũng là công cụ để sau này gán lô
thật cho tồn cũ.

### 6.4 Trả hàng

Từ một hoá đơn đã bán, chọn dòng và số lượng trả → hoàn về đúng lô theo mục 4.2 →
sinh phiếu trả có liên kết ngược tới hoá đơn gốc.

---

## 7. Từ vựng — dùng đúng từ KiotViet

Từ vựng là trí nhớ cơ bắp. Không đổi sang từ "hiện đại hơn".

| Dùng | Không dùng |
|---|---|
| Hàng hoá | Sản phẩm (trong giao diện) |
| Thẻ kho | Lịch sử tồn, sổ kho |
| Tồn kho | Số lượng còn |
| Khách lẻ | Khách vãng lai |
| Khách cần trả · Khách thanh toán · Tiền thừa trả khách | — |
| Quản lý theo lô, hạn sử dụng | Batch tracking |
| Định mức tồn (thấp nhất / cao nhất) | Min/max stock |
| Phiếu nhập · Nhập hàng | Đơn mua |
| Trả hàng (khách trả) · Trả hàng nhập (trả NCC) | — |
| Giá vốn · Giá bán | — |
| Bán trực tiếp | — |
| Chi nhánh | Kho, cửa hàng |

---

## 8. Chuyển dữ liệu từ KiotViet

Chỉ nhập **tồn đầu kỳ**. Không nhập lịch sử bán.

Thực hiện bằng đúng một phiếu `KIEM_KE` ngày chuyển đổi → mỗi lô sinh dòng thẻ kho
đầu tiên.

Hai điều phải xử lý đúng:

1. **Quan hệ đơn vị.** Trong KiotViet, cùng một thuốc có nhiều mã hàng theo đơn vị
   (vỉ và hộp) nhưng **dùng chung một kho** — tồn hiển thị quy đổi ra số lẻ. Bản
   nhập phải gộp chúng thành một sản phẩm nhiều đơn vị. Nếu bản xuất không mang
   theo hệ số, phải suy từ tên hàng ("hộp 15 vỉ x 12 viên nén") và **bắt người dùng
   xác nhận từng nhóm**; mặc định **không gộp khi không chắc**.
2. **Không có lô/HSD.** Toàn bộ tồn đầu kỳ rơi vào lô ngầm định, kể cả thuốc. Đây
   là hành vi đúng theo thiết kế, không phải mất dữ liệu.

---

## 9. Bất biến phải có test

1. Tổng thẻ kho theo `(lo_id, chi_nhanh_id)` == bản đệm tồn kho.
2. Không có UPDATE/DELETE nào trên `the_kho`.
3. Tổng số lượng hoàn của một dòng bán ≤ số đã trừ của chính dòng đó.
4. Đẳng thức tiền của hoá đơn khớp tuyệt đối.
5. Σ giảm giá phân bổ == giảm giá hoá đơn, không lệch 1đ.
6. Cùng một kịch bản chạy ở chế độ phẳng và chế độ lô cho **cùng số dư cuối**.
7. Chuyển chế độ hai chiều: đúng luật chặn, có ghi `DOI_CHE_DO`.
8. Hàm giải nghĩa cài đặt lô không xuất hiện trong module kho.
9. Gửi lại cùng một thao tác hai lần → tồn kho không đổi.
10. Xuất kho khi tồn không đủ ở một lô → chia đúng sang lô kế tiếp theo FEFO.
