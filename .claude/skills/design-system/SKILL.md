---
name: design-system
description: Dùng khi viết hoặc sửa bất kỳ giao diện nào trong dự án quầy thuốc — chọn màu, cỡ chữ, khoảng cách, component. Token đã CHỐT, chỉ đọc lại, không sinh mới.
---

# Design system — đã chốt, không sinh lại

Token nằm ở `tokens.css` cạnh file này. **Đọc nó, dùng biến CSS, đừng viết mã màu
thẳng vào component.**

Bảng màu và font này đã được chốt một lần cho cả dự án. **Không gọi lại generator
thiết kế ở mỗi run** — làm vậy thì mỗi PR ra một tông màu khác và giao diện mất
nhất quán. Muốn đổi thì ghi `BLOCKED.md`.

## Bốn luật không được phá

1. **Font self-host.** Không `@import` từ Google Fonts, không link CDN. App chạy
   offline, CDN không tải được và giao diện sẽ nhảy font giữa lúc bán hàng. File
   font nằm trong repo, nạp bằng `@font-face` với `font-display: swap`.
2. **Số dùng chữ số đều bề ngang** — `font-variant-numeric: tabular-nums` cho mọi
   cột tiền, số lượng, tồn kho. Không có nó thì các con số trong bảng không thẳng
   hàng và mắt phải dò từng dòng.
3. **Xanh dương = hành động chính** (nút thanh toán, lưu, xác nhận). **Xanh lá =
   trạng thái tích cực** (còn hàng, đã đồng bộ, thành công). Không đảo hai vai này —
   nút chính trong KiotViet là xanh dương và người dùng bấm nó vài chục lần mỗi ngày.
4. **Tương phản chữ tối thiểu 4.5:1** trên nền của nó. Quầy thuốc sáng, đôi khi
   chói. Chữ xám nhạt trên nền xám là lỗi, không phải phong cách.

## Mật độ

Đây là màn hình làm việc, không phải trang giới thiệu. Thang khoảng cách dày
(8–32px), bảng chặt, ít khoảng trống trang trí. Ưu tiên nhìn được nhiều dòng cùng
lúc hơn là thoáng mắt.

## Vùng chạm

Tối thiểu 44×44px cho mọi thứ bấm được, kể cả trên desktop — quầy có lúc dùng bằng
ngón tay trên màn cảm ứng.

## Chuyển động

Tối thiểu. Chuyển trạng thái 150–250ms, không hiệu ứng cuộn, không hoạt hoạ trang
trí. Tôn trọng `prefers-reduced-motion`. Màn bán hàng không được có bất kỳ chuyển
động nào làm chậm phản hồi bàn phím.

## Khi luật này và `UI-FIDELITY.md` mâu thuẫn

`UI-FIDELITY.md` thắng. Nó quyết định bố cục, thứ tự cột, luồng thao tác và từ ngữ;
file này chỉ quyết định phần nhìn.
