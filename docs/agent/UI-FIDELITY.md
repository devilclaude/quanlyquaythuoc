# Luật bám UI KiotViet

Vấn đề: người dùng đã quen KiotViet, nhưng skill thiết kế (ui-ux-pro-max) sẽ
kéo về hướng hiện đại. Hai hướng này xung đột nếu không phân định. File này
là trọng tài.

---

## Nguyên tắc

**Trí nhớ cơ bắp nằm ở cấu trúc và thao tác, không nằm ở phần nhìn.**

Người dùng nhớ ô tìm kiếm ở đâu, bấm gì để thêm hàng, cột nào đứng trước cột
nào, phím nào xác nhận. Người dùng **không** nhớ mã màu xanh, cỡ chữ, hay bo
góc bao nhiêu pixel.

Nên: sao chép nhóm thứ nhất gần như nguyên vẹn, cải thiện tự do nhóm thứ hai.

---

## SAO CHÉP — không được đổi nếu không có lý do ghi vào JOURNAL

Đối chiếu với screenshots trong `docs/reference/kiotviet/`.

- **Bố cục màn hình**: khu vực nào ở đâu, tỉ lệ chia cột, vị trí thanh tổng tiền.
- **Thứ tự cột** trong mọi bảng: giỏ hàng, danh sách hàng hoá, danh sách hoá đơn,
  thẻ kho.
- **Luồng thao tác**: số bước và thứ tự bước để hoàn thành một việc. Nếu KiotViet
  làm xong việc trong 3 lần bấm thì bản mới không được cần 4.
- **Vị trí và nhãn** của các nút hành động chính.
- **Cách hiện đơn vị và số lượng** ở màn chọn món — đây là thao tác lặp lại
  nhiều nhất trong ngày.
- **Từ ngữ**: dùng đúng từ KiotViet dùng. "Hàng hoá" không đổi thành "Sản phẩm".
  "Thẻ kho" không đổi thành "Lịch sử tồn". Từ vựng cũng là trí nhớ cơ bắp.

## ĐƯỢC CẢI THIỆN — dùng design token và ui-ux-pro-max thoải mái ở đây

- Cỡ chữ, độ tương phản, khoảng cách, mật độ thông tin
- Vùng chạm trên máy tính bảng và điện thoại
- Trạng thái loading, empty, lỗi
- Phản hồi khi thao tác thành công hay thất bại
- Bảng màu, miễn giữ được ý nghĩa quy ước (xanh = thành công, đỏ = cảnh báo)
- Khả năng đọc dưới ánh sáng quầy thuốc — thường sáng, đôi khi chói

---

## Ràng buộc bàn phím: bắt buộc, không thương lượng

Màn bán hàng dùng bằng **bàn phím và máy quét mã vạch**, không phải chuột.

Toàn bộ luồng bán một đơn phải hoàn thành được mà không chạm chuột:

1. Quét mã hoặc gõ tên → danh sách gợi ý
2. Chọn bằng mũi tên, Enter để thêm
3. Sửa số lượng, đổi đơn vị bằng bàn phím
4. Phím tắt để thanh toán
5. Enter để xác nhận, in hoá đơn

Mọi phím tắt phải hiện trên giao diện, không bắt nhớ. Đối chiếu screenshots để
lấy đúng phím KiotViet đang dùng; nếu ảnh không cho biết, chọn phím thông dụng
và **ghi vào JOURNAL.md** để chủ dự án xác nhận với người dùng.

ui-ux-pro-max tối ưu cho web hiện đại và sẽ không tự nghĩ ra ràng buộc này.
Luật ở đây thắng gợi ý của skill.

---

## Bảng phím tắt

Hai nhóm dưới đây có độ tin cậy **khác nhau**. Đừng trộn chúng.

### Nhóm 1 — THẤY TRONG SCREENSHOT (giữ nguyên, không bàn)

| Phím | Việc | Nguồn |
|---|---|---|
| `F3` | Tìm hàng hoá | Ô tìm màn bán hàng ghi "Tìm hàng hóa (F3)" |
| `F4` | Tìm khách hàng | Panel phải màn bán hàng ghi "Tìm khách hàng (F4)" |
| `F8` | Tiền trả nhà cung cấp | Màn nhập hàng ghi "Tiền trả nhà cung cấp (F8)" |

`F4` **để dành, không gán việc khác** — khách hàng là v1.1, nhưng phản xạ bấm F4
của người dùng đã có sẵn. Gán F4 cho việc khác sẽ dạy hỏng phản xạ đó.

### Nhóm 2 — TÔI CHỌN, CẦN XÁC NHẬN VỚI NGƯỜI DÙNG

Screenshots không cho biết các phím này. Chúng được chọn theo hai tiêu chí: không
đụng phím trình duyệt (`F5` `F11` `F12` `Ctrl+N/T/W`), và tay không rời khu phím
chính khi bán.

| Phím | Việc | Màn |
|---|---|---|
| `↑` `↓` | Di chuyển trong danh sách gợi ý | Bán, Nhập |
| `Enter` | Thêm mục đang chọn vào giỏ | Bán |
| `Esc` | Đóng danh sách gợi ý; bấm lần nữa xoá ô tìm | Bán, Nhập |
| `F2` | Đổi đơn vị tính của dòng đang chọn | Bán, Nhập |
| `+` `-` | Tăng/giảm số lượng dòng đang chọn | Bán, Nhập |
| `Delete` | Xoá dòng đang chọn | Bán, Nhập |
| `F9` | Sang thanh toán | Bán |
| `Enter` | Xác nhận thanh toán và in | Màn thanh toán |
| `F7` | Mở hoá đơn mới (tab mới) | Bán |
| `Alt`+`1..9` | Chuyển sang tab hoá đơn thứ n | Bán |
| `F6` | Lưu tạm phiếu | Nhập |

**Chủ dự án phải hỏi người dùng thật về nhóm 2 trước khi khoá chúng lại.** Ghi kết
quả vào `JOURNAL.md`. Nếu người dùng đã có phản xạ với một phím khác, phản xạ của
chị ấy thắng bảng này.

### Luật chung

- **Mọi phím tắt phải hiện trên giao diện**, ngay cạnh việc nó làm. Không bắt nhớ,
  không giấu trong trang trợ giúp.
- Máy quét mã vạch hoạt động như bàn phím: nó "gõ" rất nhanh rồi `Enter`. Ô tìm
  phải chịu được luồng đó **không mất ký tự** và phân biệt được với người gõ tay
  bằng nhịp phím.
- Không phím tắt nào được phá luồng đang gõ dở. Mất giỏ hàng là lỗi nghiêm trọng.

---

## Chỉ báo trạng thái online / offline

Luôn hiển thị trên màn bán hàng, không giấu trong menu:

- Đang online hay offline
- Số thao tác đang chờ đồng bộ, nếu có
- Thời điểm đồng bộ thành công gần nhất

Người dùng phải biết ngay mình đang ở chế độ nào mà không phải đoán. Khi mất
mạng giữa lúc bán, chuyển chế độ phải êm — không popup chặn màn hình, không
mất giỏ hàng đang gõ dở.

---

## Khi skill và luật này mâu thuẫn

Luật này thắng. Nếu bạn cho rằng một gợi ý của skill đủ tốt để phá luật, đừng
tự quyết: ghi đề xuất vào `docs/agent/BLOCKED.md` kèm ảnh so sánh nếu có, và
để chủ dự án hỏi người dùng thật.

Lý do: người dùng cuối không có mặt trong vòng lặp này. Một thay đổi "rõ ràng
tốt hơn" với bạn có thể phá phản xạ đã hình thành nhiều năm của chị ấy.
