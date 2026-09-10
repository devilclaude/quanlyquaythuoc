# Việc cần con người quyết

Agent ghi vào đây rồi dừng run. Bạn giải quyết bằng cách sửa SPEC.md,
ARCHITECTURE.md hoặc UI-FIDELITY.md, rồi xoá mục tương ứng và commit.

Chừng nào một mục còn đây và nó chặn toàn bộ task còn lại, agent sẽ báo Slack
rồi dừng thay vì đi tìm việc phụ.

Format:

```
## <task-id> — <tiêu đề ngắn>
Ngày: <ngày>
Loại: kỹ thuật | nghiệp vụ | giao diện
Tình huống: <2-3 câu>
Phương án:
  1. <A> — đánh đổi
  2. <B> — đánh đổi
Cần trả lời: <một câu hỏi cụ thể, trả lời được trong 1-2 câu>
Chặn: <task-id bị chặn, hoặc "chỉ task này">
```

Mục loại **giao diện** nghĩa là cần đi hỏi người dùng thật, không tự quyết được.

---

## T-020 — Xác nhận bảng phím tắt với người dùng
Ngày: 2026-09-08
Loại: giao diện
Tình huống: Screenshots chỉ cho biết ba phím KiotViet đang dùng (F3 tìm hàng hoá,
F4 tìm khách hàng, F8 tiền trả NCC). Các phím còn lại của luồng bán hàng — thêm vào
giỏ, đổi đơn vị, sang thanh toán, chuyển tab hoá đơn — do phiên plan tự chọn, ghi ở
nhóm 2 trong `UI-FIDELITY.md`.
Phương án:
  1. Dùng bảng đề xuất — rủi ro dạy hỏng phản xạ nếu người dùng đã quen phím khác
  2. Hỏi người dùng trước khi khoá — tốn một buổi, nhưng sửa sau tốn hơn nhiều
Cần trả lời: Vợ chủ dự án đang bấm phím nào để thêm hàng vào giỏ và để sang thanh
toán trong KiotViet?
Chặn: **không chặn task nào** — cứ dùng bảng nhóm 2 cho tới khi có xác nhận.

