# Đăng nhập và phân quyền — thiết kế

Ngày: 2026-10-10 · Người duyệt: chủ dự án (duyệt trong hội thoại)

## Bối cảnh

App chạy trên Internet (Cloudflare) nhưng chưa có đăng nhập: ai biết domain cũng
đọc được hàng/tồn và tạo được hoá đơn, phiếu nhập. `docs/agent/SPEC.md` hiện đẩy
"nhân viên" sang v1.1 (quầy một người bán). Chủ dự án yêu cầu làm ngay: bán hàng
phải biết ai bán; nhập hàng, danh sách hàng… chỉ admin dùng. Spec này **không sửa**
`SPEC.md` (chỉ-đọc theo `CLAUDE.md`); chủ dự án cập nhật SPEC sau nếu muốn.

## Quyết định đã chốt

| Mục | Chọn |
|---|---|
| Đăng nhập | Tài khoản + mật khẩu trong app (không dựa Cloudflare Access) |
| Vai trò | `ADMIN`, `NHAN_VIEN` |
| Nhân viên được | Bán hàng, trả hàng, đồng bộ offline, tìm hàng khi bán (`GET /api/hang-hoa`) |
| Admin được | Mọi thứ còn lại: nhập hàng, trả hàng nhập, sửa/xoá/tạo hàng hoá, chi tiết hàng, tổng quan, cài đặt, quản lý người dùng |
| Phiên | Lưu trong SQLite + cookie `httpOnly`, hạn trượt 30 ngày |
| Tạo tài khoản | Admin đầu tiên bằng `npm run tao-admin`; sau đó admin quản lý trong app |

## Ràng buộc đến từ phần offline

1. `POST /api/dong-bo` là đường ghi hoá đơn khi mất mạng. SPEC §4.4: máy chủ không
   từ chối đơn đã bán và đã in. Phiên hết hạn lúc offline → nhận `401` thì client
   **giữ nguyên hàng đợi**, hiện màn đăng nhập, gửi lại sau khi đăng nhập. Không
   bao giờ xoá thao tác khỏi hàng đợi vì `401`.
2. Service worker cache `GET /api/hang-hoa` (NetworkFirst). Đăng xuất phải xoá cache
   `danh-muc-tra-cuu`.
3. Mở app lúc offline: dùng người dùng lưu lần cuối (localStorage) để bán tiếp; vai
   trò lưu cùng, chỉ dùng để ẩn/hiện menu — quyền thật luôn ở server.

## Thiết kế

### 1. Dữ liệu
- `nguoi_dung`: `id` (ULID), `ten_dang_nhap` (UNIQUE, không phân biệt hoa/thường,
  lưu chữ thường), `ten_hien_thi`, `mat_khau_bam`, `vai_tro` (`ADMIN`|`NHAN_VIEN`,
  CHECK), `hoat_dong` (bool), `ngay_tao`.
- `phien`: `id_bam` (SHA-256 của mã phiên, khoá chính — không lưu mã gốc),
  `nguoi_dung_id` (FK), `het_han`, `ngay_tao`.
- `hoa_don.nguoi_ban_id` (FK, nullable cho hoá đơn cũ trước migration), sinh bằng
  `drizzle-kit generate`.
- Không xoá cứng người dùng (luật "không xoá cứng dữ liệu giao dịch"): chỉ khoá
  (`hoat_dong = false`), khoá thì xoá mọi phiên của họ.

### 2. Xác thực (server)
- Băm mật khẩu bằng `scrypt` của `node:crypto` (salt ngẫu nhiên, tham số lưu trong
  chuỗi băm), so sánh bằng `timingSafeEqual`. Không thêm thư viện.
- Mật khẩu tối thiểu 8 ký tự.
- `POST /api/auth/dang-nhap` `{tenDangNhap, matKhau}` → đặt cookie, trả người dùng.
  Sai tên hay sai mật khẩu đều trả cùng một lỗi và cùng thời gian (băm giả khi
  không có người dùng) để không dò được tên đăng nhập.
- `POST /api/auth/dang-xuat` xoá phiên + cookie. `GET /api/auth/toi` trả người dùng
  hiện tại hoặc `401`.
- Cookie: `httpOnly`, `SameSite=Lax`, `Path=/`, `Secure` khi request là https
  (đọc `X-Forwarded-Proto`/`CF-Visitor`), hạn 30 ngày, gia hạn khi dùng (trượt).
- CSRF: request ghi (không phải GET/HEAD/OPTIONS) có header `Origin` thì `Origin`
  phải cùng host với request (kể cả `X-Forwarded-Host`) hoặc nằm trong
  `CORS_ORIGINS`, ngược lại `403`. Request không có `Origin` (không phải trình
  duyệt) được qua. Không ép `Content-Type: application/json` vì
  `POST /api/phieu-nhap/tu-excel` tải file `multipart/form-data`; phòng thủ chính là
  `SameSite=Lax` + kiểm `Origin`.
- Chống dò mật khẩu: 5 lần sai trong 15 phút theo cặp (tên đăng nhập, IP) → `429`
  với `Retry-After`. IP lấy từ `CF-Connecting-IP`, không có thì từ socket. Lưu trong
  bộ nhớ (mất khi khởi động lại là chấp nhận được).

### 3. Phân quyền (server)
- Middleware gắn lên `/api/*` trừ `/api/suc-khoe` và `/api/auth/dang-nhap`.
- Bảng quyền khai báo một chỗ (`phuong thức + mẫu đường dẫn → vai trò tối thiểu`).
  **Mặc định chặn**: route không có trong bảng thì chỉ `ADMIN`.
- Nhân viên: `POST /api/hoa-don`, `/api/tra-hang*` (cả GET tra cứu hoá đơn),
  `POST /api/dong-bo`, `GET /api/hang-hoa` (danh sách để tìm). Còn lại `403`.
- Chưa đăng nhập → `401`; sai vai trò → `403`.

### 4. Giao diện
- Chưa đăng nhập (hoặc `401`): hiện màn đăng nhập thay cho app.
- Menu theo vai trò: nhân viên chỉ thấy "Bán hàng", "Trả hàng"; admin thấy đủ. Hiện
  tên người dùng + nút "Đăng xuất" ở thanh trên.
- Mọi `fetch` đi qua một hàm bao chung để bắt `401` (một chỗ, không sửa từng màn).
- Offline + `401` khi đồng bộ: giữ hàng đợi, hiện màn đăng nhập (chỉ báo trạng thái
  vẫn hiện số thao tác chờ).
- Đăng xuất: gọi API, xoá cache `danh-muc-tra-cuu`, xoá người dùng lưu, **không** xoá
  hàng đợi thao tác offline.
- Màn "Người dùng" trong Cài đặt (admin): danh sách, tạo, đặt lại mật khẩu, khoá/mở.
  Không tự khoá hay tự hạ quyền chính mình; luôn còn ít nhất một admin hoạt động
  (server cưỡng chế, UI chỉ phản ánh).

### 5. Người bán trên hoá đơn
- Online: `nguoi_ban_id` lấy từ phiên, bỏ qua giá trị client gửi.
- Offline: thao tác trong hàng đợi mang `nguoiBanId` lúc tạo; server chỉ kiểm tra là
  người dùng có thật (đây là ghi nhận, không phải cấp quyền).
- Hiển thị tên người bán ở chi tiết/in hoá đơn **ngoài phạm vi** lần này.

### 6. Lệnh vận hành
- `npm run tao-admin -- <tenDangNhap>`: hỏi mật khẩu từ stdin không echo; từ chối nếu
  tên đã tồn tại. Không có tài khoản mặc định.

## Kiểm thử
- Server (SQLite in-memory, không mock lớp dữ liệu): băm/so mật khẩu, đăng nhập đúng/
  sai/tài khoản khoá, phiên hết hạn và trượt, giới hạn đăng nhập sai, CSRF, ma trận
  quyền (mỗi route × mỗi vai trò, gồm route không khai báo → chỉ admin), không thể tự
  khoá/hạ quyền, luôn còn admin, người bán trên hoá đơn online và offline.
- Client: menu theo vai trò, màn đăng nhập, bắt `401`, đăng xuất xoá cache nhưng giữ
  hàng đợi.
- E2E: đăng nhập admin → bán hàng; đăng nhập nhân viên → không thấy mục admin.
  Các e2e hiện có phải được cập nhật để đăng nhập trước (mock `/api/auth/toi`).

## Chia việc (mỗi phần một PR, CI xanh mới sang phần kế)
1. **Lõi server:** schema + migration, băm mật khẩu, phiên, đăng nhập/đăng xuất/toi,
   middleware phân quyền, giới hạn đăng nhập sai, `tao-admin`.
2. **Giao diện:** màn đăng nhập, menu theo vai trò, hàm fetch chung bắt `401`,
   offline/hàng đợi, xoá cache khi đăng xuất, cập nhật e2e.
3. **Người dùng + người bán:** màn quản lý người dùng, `hoa_don.nguoi_ban_id`.

Phần 1 và 2 phải triển khai liền nhau: sau phần 1 API không còn mở công khai.

## Ngoài phạm vi
Đổi mật khẩu bởi chính người dùng, quên mật khẩu qua email, 2FA, nhật ký đăng nhập,
vai trò thủ kho, hiển thị người bán trên hoá đơn in, ghi người thực hiện cho phiếu
nhập/trả/kiểm kê.
