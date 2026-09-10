---
name: tdd-quay-thuoc
description: Dùng trước khi viết bất kỳ dòng code sản phẩm nào — tính năng mới, sửa lỗi, đổi hành vi. Chứa cả luật TDD lẫn các ca test bắt buộc của miền quầy thuốc.
---

# TDD — quầy thuốc

## Luật sắt

```
KHÔNG CÓ CODE SẢN PHẨM NÀO TRƯỚC MỘT TEST ĐANG ĐỎ
```

Lỡ viết code trước? **Xoá.** Không giữ làm "tham khảo", không "phỏng theo" nó khi
viết test. Viết lại từ test.

Lý do không phải nghi thức: nếu bạn chưa từng thấy test đỏ, bạn không biết nó có
đang kiểm thứ cần kiểm hay không. Test viết sau xanh ngay lập tức — điều đó không
chứng minh gì cả.

## Vòng lặp

1. **ĐỎ** — viết một test nhỏ nhất mô tả hành vi mong muốn.
2. **Xem nó đỏ** — bắt buộc. Đỏ vì thiếu tính năng, không phải vì gõ sai tên hàm.
   Test xanh ngay? Bạn đang test hành vi đã có. Sửa test.
3. **XANH** — viết code ít nhất có thể để qua. Không thêm tuỳ chọn chưa ai cần.
4. **Xem nó xanh** — và các test khác vẫn xanh, output sạch.
5. **DỌN** — bỏ trùng lặp, đặt lại tên. Không thêm hành vi.

## Ca test bắt buộc của miền này

Những con số dưới đây lấy từ `SPEC.md`. Chúng phải tồn tại dưới dạng test có tên
nói rõ chúng là gì, **không phải** rải rác trong test khác.

**Quy đổi đơn vị** — 1 vỉ = 12 viên, 1 hộp = 15 vỉ = 180 viên:
nhập 5 hộp → thẻ kho `+900`; bán 3 vỉ → thẻ kho `−36`; tồn còn **864 viên**.

**Phân bổ giảm giá** — hoá đơn 10.000/20.000/30.000, giảm 7.000 → **1.167 / 2.333 /
3.500**, tổng đúng 7.000. Không lệch 1đ.

**Giá vốn về 0** — bán hết sạch một sản phẩm thì `gia_tri_ton` phải bằng đúng `0`.
Đây là test bắt được lỗi làm tròn tích luỹ.

**Một đường code hai chế độ** — chạy cùng một kịch bản trên sản phẩm bật lô và sản
phẩm chỉ có lô ngầm định, **số dư cuối phải bằng nhau**.

**FEFO `NULLS FIRST`** — tồn cũ ở lô ngầm định bán trước lô thật có HSD.

**Chia nhiều lô** — tồn không đủ ở lô đầu thì tràn đúng sang lô kế tiếp.

**Idempotent** — gửi lại cùng một thao tác hai lần, tồn kho không đổi.

**Trả hàng LIFO** — hoàn về lô bị trừ sau cùng trước, tổng hoàn ≤ tổng đã trừ.

## Test tốt trong dự án này

- **Chạm CSDL thật (SQLite in-memory), không mock lớp kho.** Mock lớp kho là tự
  chứng minh cho chính mình; bug tồn kho sống đúng ở chỗ ranh giới đó.
- **Một test một hành vi.** Tên có chữ "và" thì tách ra.
- **Số cụ thể, không số ngẫu nhiên** cho các ca ở trên — trừ test bất biến, nơi dữ
  liệu ngẫu nhiên là điểm mạnh.
- Test đặt cạnh file được test: `tien.ts` → `tien.test.ts`.

## Cờ đỏ — dừng và làm lại

- Viết code trước test
- Test xanh ngay lần chạy đầu
- Không giải thích được vì sao test đỏ
- "Đơn giản quá không cần test"
- "Test sau cũng vậy thôi"
- "Đã thử tay rồi, chạy đúng"
- Nới kiểu, tắt test, hay `skip` để CI xanh

Điều cuối cùng là lỗi nghiêm trọng nhất: **CI là thứ duy nhất chặn agent.** Làm
yếu nó đi là gỡ cái phanh duy nhất của dự án. Gặp tình huống đó nghĩa là task bị
định nghĩa sai — ghi `BLOCKED.md` và dừng.

## Sửa lỗi

Không bao giờ sửa bug mà không có test tái hiện nó trước. Test đó vừa chứng minh
đã sửa, vừa chặn nó quay lại.
