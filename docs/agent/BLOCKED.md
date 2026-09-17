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

## T-054 — Thẻ kho cần cột "Chứng từ" nhưng `the_kho` không lưu tham chiếu nào
Ngày: 2026-09-17
Loại: kỹ thuật
Tình huống: BACKLOG.md yêu cầu màn thẻ kho có cột "Chứng từ" (khớp ảnh
`docs/reference/kiotviet/.../thông tin thẻ kho của 1 sản phẩm...jpeg`, cột
"GIAO DỊCH" hiện mã như `HD047093`/`PN002215`). Nhưng bảng `the_kho`
(SPEC.md §3.1, `schema.ts`) không có cột nào tham chiếu chứng từ sinh ra dòng
đó — chỉ có `id` nội bộ, `loai`, `so_luong`, hai mốc thời gian. Kiểm tra cả hai
module đã ghi sổ cái thật ngoài seed (`T-050` kiểm kê, `T-051` xuất huỷ, đang
mở PR #31/#32) xác nhận cùng lỗ hổng: cả hai gọi `ghiMotDongTheKho` không
truyền chứng từ nào, `the_kho.id` chỉ là `${dongId}-tk` — không tra ngược được
ra số phiếu. SPEC.md chỉ định nghĩa số hoá đơn `HD<máy>-<số>` (§5.3, cho bán
hàng, chưa build); không nơi nào định nghĩa cách `the_kho` liên kết tới BẤT KỲ
loại chứng từ nào.
Phương án:
  1. Thêm cột tham chiếu (vd. `chung_tu_loai` + `chung_tu_id`, hoặc một chuỗi
     hiển thị được lưu tường minh lúc ghi dòng) vào `the_kho` ngay bây giờ —
     migration cộng thêm, không phá dữ liệu cũ. Nhưng đây là quyết định kiến
     trúc ảnh hưởng MỌI module ghi sổ cái sau này (bán hàng T-022, nhập hàng
     T-040, trả hàng T-052/T-053), và hai PR đang mở (T-050/T-051) sẽ cần sửa
     lại để điền đúng field — nếu không, "Chứng từ" của các dòng đó mãi mãi
     trống dù cột đã có.
  2. Dựng cột "Chứng từ" nhưng để trống mọi dòng hiện có (không ai ghi được
     giá trị) — vi phạm "Định nghĩa xong" (CLAUDE.md): một cột luôn trống trên
     đường chính chẳng khác gì mock không bao giờ có dữ liệu thật.
  3. Bỏ cột "Chứng từ" khỏi T-054 lần này, chỉ làm 6 cột còn lại (Thời gian,
     Loại, Lô/HSD, Số lượng, Tồn cuối, Giá vốn) — sai vì đây đúng là cột người
     dùng cần nhất để truy khi số liệu lệch (CLAUDE.md: "Thẻ kho là thứ dùng để
     truy khi số liệu lệch").
Cần trả lời: `the_kho` nên tham chiếu chứng từ bằng cặp đa hình
`(chung_tu_loai, chung_tu_id)` tra ngược qua bảng chứng từ tương ứng, hay bằng
một chuỗi số chứng từ hiển thị được (kiểu `PN002215`) lưu tường minh ngay lúc
ghi dòng? Chọn một khuôn để mọi module ghi sổ cái sau này theo cùng.
Chặn: T-054

