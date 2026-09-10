# Ghi chú miền — Quầy thuốc

File này là **đầu vào cho giai đoạn plan**, không phải spec. Nó ghi lại những
gì đã biết về nghiệp vụ quầy thuốc để phiên plan không bỏ sót. SPEC.md thật sẽ
được sinh ra từ file này + screenshots KiotViet + câu trả lời của chủ dự án.

---

## Người dùng

Người dùng chính là **vợ chủ dự án**, dược sĩ bán hàng tại quầy. Không phải
người kỹ thuật. Đã quen KiotViet.

Hệ quả thiết kế, áp dụng cho mọi task:

- **Không cần đào tạo.** Nếu một tính năng cần giải thích mới dùng được thì
  thiết kế sai.
- **Muscle memory là tài sản.** Chị đã có phản xạ với KiotViet. Giữ nguyên
  vị trí và thứ tự thao tác quan trọng hơn làm đẹp.
- **Bàn phím và máy quét, không phải chuột.** Bán một đơn hoàn chỉnh phải làm
  được mà không rời tay khỏi bàn phím.
- **Sai sót phải sửa được.** Bán nhầm, gõ nhầm số lượng, chọn nhầm lô — mọi
  thao tác phải có đường lùi rõ ràng, không cần gọi kỹ thuật.

---

## Tính năng có trong KiotViet mà quầy đang dùng

Xác định từ screenshots. Đây là baseline bắt buộc của v1.

**Bán hàng**
- Màn bán hàng, tìm sản phẩm, thêm vào giỏ
- Chọn đơn vị tính và số lượng khi thêm món

**Hàng hoá**
- Danh sách, chi tiết sản phẩm, tạo mới
- Thẻ kho một sản phẩm (nhập và xuất)
- Xem được trên điện thoại

**Nhập hàng**
- Danh sách phiếu nhập, chi tiết phiếu
- Tìm hàng đã có để nhập, tạo hàng mới ngay trong màn nhập
- Nhập từ file
- In tem mã: chọn loại giấy, preview, in

**Đơn hàng**
- Danh sách hoá đơn đã bán
- Trả hàng và danh sách trả hàng

**Khác**
- Khách hàng, nhân viên, tổng quan, danh sách báo cáo

**Chưa cần**: bác sĩ, đơn thuốc mẫu.

---

## Thiếu so với nhu cầu quầy thuốc

### Nhóm A — ảnh hưởng mô hình dữ liệu, phải quyết ở plan

**A1. Lô và hạn sử dụng — bật/tắt được ở giao diện, nhưng mô hình dữ liệu
thì không.**

Người dùng bật/tắt quản lý theo lô trong trang cài đặt. Nhưng cách hiện thực
phải là:

> **Tồn kho LUÔN LUÔN lưu theo `(sản phẩm, lô, hạn dùng, số lượng)`.**
> Chế độ "tồn phẳng" chỉ là chế độ theo lô với đúng một lô ngầm định
> (`lô = null`, `HSD = null`) cho mỗi sản phẩm. Cài đặt chỉ điều khiển
> **giao diện và quy tắc nhập liệu**, không điều khiển cách lưu trữ.

Vì sao phải làm thế:

- **Một đường code, một bộ test.** Nếu làm hai đường thật — một cho tồn phẳng,
  một cho tồn theo lô — thì mọi hàm kho phải viết hai lần, mọi bug phải hỏi
  "đang ở chế độ nào" trước khi truy. Với agent tự động đây là cách chắc chắn
  nhất để tồn kho lệch.
- **Bật lô lên sau không phải migrate gì cả.** Tồn hiện có đã nằm sẵn ở lô
  ngầm định; bật cài đặt lên là các lô mới bắt đầu được ghi nhận bình thường.
  Đây chính là điều bạn muốn đạt được khi hỏi làm nó optional.

### Phạm vi cài đặt

Đề xuất theo cách KiotViet làm: **mặc định toàn cửa hàng + ghi đè theo từng
sản phẩm**. Quầy thuốc có cả thuốc (cần lô) lẫn mỹ phẩm, thực phẩm chức năng,
vật tư (không cần). Bắt tất cả theo lô sẽ làm chậm việc nhập hàng vô ích.

Cần chốt ở phiên plan: chỉ toàn cục, hay có cả ghi đè theo sản phẩm.

### Hành vi theo từng chế độ

| | Tồn phẳng (tắt) | Theo lô (bật) |
|---|---|---|
| Nhập hàng | Không hỏi lô/HSD, ghi vào lô ngầm định | Bắt buộc nhập lô + HSD |
| Bán hàng | Trừ lô ngầm định | Trừ theo FEFO, cho chọn lô khác |
| Trả hàng | Hoàn về lô ngầm định | Hoàn về đúng lô đã bán |
| Thẻ kho | Ẩn cột lô | Hiện lô ở mọi dòng |
| Cảnh báo cận date | Không áp dụng | Có |

### Chuyển đổi chế độ

- **Tắt → bật**: luôn cho phép. Tồn cũ giữ nguyên ở lô ngầm định, hàng nhập từ
  đó về sau vào lô thật. Hai loại tồn tại song song là bình thường.
- **Bật → tắt**: chỉ cho phép khi sản phẩm đó **không có quá một lô có tồn > 0**.
  Nếu đang có nhiều lô, chặn lại và yêu cầu người dùng kiểm kê gộp trước.
  Không bao giờ tự động gộp — gộp là hành vi phá dữ liệu hạn dùng.

Cả hai chiều đều phải ghi thẻ kho và có test riêng.

**A2. Đơn vị quy đổi đa cấp.**
Hộp / vỉ / viên với hệ số quy đổi. Tồn kho lưu ở **đơn vị cơ sở** (viên); mọi
hiển thị và nhập liệu quy đổi qua lại. Bán 1 vỉ trừ đúng 10 viên. Sai ở chỗ
này gây lệch kho âm thầm và rất khó truy.

**A3. Thông tin dược trên sản phẩm.**
Hoạt chất, hàm lượng, dạng bào chế, nhà sản xuất, nước sản xuất, số đăng ký
(SĐK), cờ **kê đơn / không kê đơn**.

### Nhóm B — tính năng thiếu, không đổi mô hình dữ liệu

**B1. Kiểm kê.** Đếm thực tế, so với sổ sách, tạo phiếu điều chỉnh có lý do.
Thiếu cái này thì tồn kho lệch dần và người dùng ngừng tin số liệu — đó là
cách một app quản lý bán hàng chết.

**B2. Xuất huỷ.** Thuốc hết hạn hoặc hỏng cần đường ra khỏi kho có ghi nhận,
kèm lý do và người thực hiện.

**B3. Kết ca / chốt tiền cuối ngày.** Đối chiếu tiền mặt đếm được với doanh
thu ghi nhận, ghi lại chênh lệch.

**B4. Tìm theo hoạt chất.** Khi hết một thuốc, tìm thuốc cùng hoạt chất để
thay. Chi phí thấp, giá trị sử dụng hàng ngày cao.

**B5. Cảnh báo cận date.** Báo cáo hàng hết hạn trong 30/60/90 ngày, và một ô
trên màn tổng quan. Gần như miễn phí khi đã có A1.

**B6. Công nợ nhà cung cấp.** Nhập hàng thường trả sau.

**B7. Quét mã vạch.** Ở màn bán hàng và màn nhập hàng. Screenshots có in tem
mã nên đã ngụ ý quét, nhưng cần làm rõ: mã vạch nhà sản xuất và mã tem tự in
phải cùng tra được.

**B8. Sao lưu và khôi phục.** Tự host thì backup là trách nhiệm của bạn.
Không có ai làm hộ. Phải có, và phải **thử khôi phục ít nhất một lần** trước
khi quầy dùng thật.

## Offline: hai kịch bản, hai kiến trúc khác hẳn nhau

Đây là quyết định kiến trúc nặng nhất. Chọn sai là làm thừa hoặc làm thiếu
rất nhiều.

### Kịch bản 1 — Server đặt TẠI quầy thuốc

App chạy trên LAN của quầy. Mất Internet không ảnh hưởng gì; chỉ mất đồng bộ
về PVE để sao lưu.

- Không cần offline-first. Không cần IndexedDB, không cần hàng đợi đồng bộ,
  không có xung đột trừ kho.
- Đồng bộ về PVE là một chiều, bất đồng bộ, chỉ để backup và xem báo cáo từ xa.
- **Đơn giản hơn kịch bản 2 khoảng một nửa khối lượng công việc.**

Đây là lựa chọn nên ưu tiên trừ khi có lý do rõ ràng để không.

### Kịch bản 2 — Server ở PVE, quầy truy cập qua Internet

Cần offline-first thật:
- PWA, dữ liệu cục bộ trong IndexedDB, hàng đợi thao tác chờ đồng bộ.
- Số hoá đơn phải sinh được khi offline: dùng tiền tố theo thiết bị hoặc ID
  do client sinh (ULID), không dùng số tăng dần tập trung.
- Xung đột trừ kho là phần khó nhất: hai thiết bị cùng bán hộp cuối cùng.

**Giảm nhẹ quan trọng**: nếu quầy chỉ có **một máy bán chính**, dùng mô hình
**một người ghi** — đúng một thiết bị được quyền bán khi offline, thiết bị
khác chuyển sang chỉ xem. Bài toán xung đột gần như biến mất. Cần biết quầy có
mấy máy bán đồng thời.

Dù chọn kịch bản nào, cần một cái **công tắc trạng thái luôn hiển thị** trên
màn bán hàng: đang online hay offline, còn bao nhiêu thao tác chờ đồng bộ. Vợ
bạn phải biết ngay lập tức mình đang ở chế độ nào, không cần đoán.

---

## Quy tắc thứ tự ưu tiên v1

Một quầy thuốc dùng được cần đúng bốn thứ, theo thứ tự:

1. **Bán được hàng** và in được hoá đơn
2. **Nhập được hàng** kèm lô và HSD
3. **Tồn kho đúng**, có kiểm kê để sửa khi lệch
4. **Không mất dữ liệu**, có backup đã thử khôi phục

Mọi thứ khác — báo cáo đẹp, quản lý khách hàng, công nợ, phân quyền nhân viên
— đều là v1.1 trở đi. Đừng để backlog phình ra trước khi bốn thứ trên chạy
được ở quầy thật.
