---
name: debug-co-he-thong
description: Dùng khi gặp bất kỳ lỗi, test đỏ, hay hành vi lạ nào — trước khi đề xuất cách sửa. Gồm bốn giai đoạn điều tra và bốn ca bệnh đặc thù của quầy thuốc.
---

# Debug có hệ thống — quầy thuốc

## Luật sắt

```
KHÔNG SỬA GÌ TRƯỚC KHI TÌM RA NGUYÊN NHÂN GỐC
```

Sửa triệu chứng là thất bại, kể cả khi test xanh trở lại.

## Bốn giai đoạn

**1. Nguyên nhân gốc.** Đọc hết thông báo lỗi, đừng lướt. Tái hiện được ổn định
chưa? Gần đây đổi gì? Với hệ nhiều tầng (client → hàng đợi → API → kho → CSDL),
ghi log ở **từng ranh giới** để biết nó vỡ ở tầng nào, rồi mới đào tầng đó.

**2. So mẫu.** Tìm chỗ tương tự đang chạy đúng trong repo. Liệt kê **mọi** khác
biệt, kể cả cái trông như không liên quan.

**3. Giả thuyết.** Phát biểu rõ: "tôi nghĩ X là nguyên nhân vì Y". Thử bằng thay
đổi **nhỏ nhất có thể**, một biến một lúc. Sai thì lập giả thuyết mới, **không**
chồng thêm bản sửa.

**4. Sửa.** Viết test tái hiện trước (xem `tdd-quay-thuoc`), sửa đúng gốc, một thay
đổi. Không kèm "tiện tay dọn luôn".

**Đã sửa 3 lần không xong?** Dừng. Đó không còn là giả thuyết sai mà là kiến trúc
sai. Ghi `BLOCKED.md` và hỏi người.

## Bốn ca bệnh của dự án này

Khi triệu chứng khớp, bắt đầu từ đúng chỗ dưới đây thay vì dò từ đầu.

### Tồn kho lệch

Nghi phạm số một: **có đường ghi kho nào không đi qua sổ cái**. Kiểm tra theo thứ
tự: (1) test bất biến `tổng thẻ kho == bản đệm` còn xanh không — nếu đỏ thì lệch
nằm ở bản đệm, không phải ở sổ cái; (2) có `UPDATE`/`DELETE` nào lọt vào `the_kho`
không (trigger CSDL phải chặn — nếu nó chặn được thì loại giả thuyết này ngay);
(3) có nhánh `if` nào theo cài đặt quản lý lô lọt vào lớp kho không.

Đừng bao giờ "sửa" bằng cách chỉnh thẳng bản đệm. Bản đệm là kết quả, không phải
nguyên nhân.

### Sai tiền một vài đồng

Gần như luôn là **một phép chia không đi qua `src/shared/tien/`**. Tìm toán tử `/`
trần, `parseFloat`, `toFixed` dùng để tính. Nếu tổng các phần không bằng tổng, đó là
chỗ thiếu thuật toán **số dư lớn nhất**. Nếu giá vốn trôi dần, kiểm tra xem có ai
lưu *đơn giá vốn* thay vì cặp `(ton, gia_tri_ton)` không.

### Đơn offline không về, hoặc về hai lần

Kiểm tra theo thứ tự: (1) ULID có được sinh ở **client** không, hay bị sinh lại ở
server mỗi lần gửi — sinh lại thì idempotent hỏng và đơn nhân đôi; (2) thao tác có
bị xoá khỏi hàng đợi trước khi máy chủ xác nhận không; (3) máy chủ có lỡ **từ chối**
một đơn đã in không — nó không bao giờ được phép làm thế, sai lệch phải đi ra bằng
cảnh báo lệch kho.

### Máy quét mất ký tự hoặc mất nhịp

Máy quét là bàn phím gõ rất nhanh rồi `Enter`. Nghi phạm: ô tìm đang là input được
kiểm soát re-render mỗi phím, hoặc có debounce nuốt ký tự, hoặc có xử lý bất đồng bộ
chen vào giữa luồng gõ. Đo trước bằng cách log timestamp từng phím rồi mới sửa —
đừng đoán.

## Cờ đỏ — quay lại giai đoạn 1

- "Sửa tạm rồi điều tra sau"
- "Chắc là do X, sửa thử xem"
- Đổi nhiều thứ cùng lúc rồi chạy test
- Đề xuất cách sửa trước khi lần được đường đi của dữ liệu
- "Thử thêm một lần nữa" khi đã sửa hụt 2 lần

## Khi thật sự không có nguyên nhân gốc

Có, nhưng hiếm — phần lớn các ca "không tìm ra" là điều tra chưa xong. Nếu đã đi
hết bốn giai đoạn mà kết luận là môi trường hoặc phụ thuộc bên ngoài: ghi lại đã
điều tra những gì, xử lý phòng vệ (retry, timeout, thông báo rõ), thêm log cho lần
sau, và ghi `BLOCKED.md`.
