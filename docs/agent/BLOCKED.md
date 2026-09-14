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

## T-061 — Đích và xác thực để đẩy backup sang máy khác
Ngày: 2026-09-14
Loại: kỹ thuật
Tình huống: ARCHITECTURE.md §10 yêu cầu backup hằng đêm "đẩy sang một máy khác"
("Bản sao trên cùng một máy không phải bản sao"), nhưng không nơi nào (SPEC.md,
ARCHITECTURE.md, DOMAIN-NOTES.md, `.env.example`) nêu máy/dịch vụ đích, giao
thức, hay thông tin xác thực. Dự án đã chốt Kịch bản 2 (server đặt tại Proxmox,
quầy truy cập qua Internet — xem BACKLOG.md Milestone 3), nên "máy khác" ở đây
không thể ngầm hiểu là PVE như mô tả Kịch bản 1 trong DOMAIN-NOTES.md — server
đã ở đó rồi.
Phương án:
  1. Đợi chủ dự án cấp máy/dịch vụ đích + khoá SSH hoặc access key — an toàn
     nhưng chặn T-061/T-062 tới lúc có.
  2. Agent tự chọn tạm một dịch vụ lưu trữ ngoài (vd. rsync.net, Backblaze B2) —
     có chi phí thật và là quyết định hạ tầng, agent không nên tự quyết.
Cần trả lời: Máy hoặc dịch vụ đích để đẩy bản sao lưu hằng đêm là gì, và xác thực
bằng cách nào (SSH key, access key)?
Chặn: T-061, T-062

