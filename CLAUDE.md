# Luật làm việc

Dự án: phần mềm quản lý quầy thuốc, thay thế KiotViet, dùng bởi một dược sĩ
bán hàng tại quầy — không phải người kỹ thuật.

Dự án được xây bởi một routine chạy tự động 4 lần/ngày. Mỗi lần chạy là một
session mới, không nhớ gì về lần trước. Toàn bộ trí nhớ nằm trong `docs/agent/`.
Đọc nó trước khi làm bất cứ việc gì.

## Nguồn sự thật

| File | Vai trò | Quyền |
|---|---|---|
| `docs/agent/SPEC.md` | Yêu cầu sản phẩm | CHỈ ĐỌC |
| `docs/agent/ARCHITECTURE.md` | Quyết định kỹ thuật, stack | CHỈ ĐỌC |
| `docs/agent/UI-FIDELITY.md` | Luật bám giao diện KiotViet | CHỈ ĐỌC |
| `docs/agent/DOMAIN-NOTES.md` | Ghi chú nghiệp vụ quầy thuốc | CHỈ ĐỌC |
| `docs/reference/kiotviet/` | Screenshots KiotViet gốc | CHỈ ĐỌC |
| `docs/agent/BACKLOG.md` | Hàng đợi task | Đọc + cập nhật trạng thái |
| `docs/agent/JOURNAL.md` | Nhật ký, append-only | Thêm entry cuối file |
| `docs/agent/BLOCKED.md` | Việc cần con người quyết | Thêm mục khi bí |

Không sửa SPEC.md, ARCHITECTURE.md, UI-FIDELITY.md, DOMAIN-NOTES.md. Nếu thấy
chúng sai, thiếu, hoặc mâu thuẫn nhau, ghi vào BLOCKED.md và dừng. Đừng tự
diễn giải rồi làm tiếp.

---

## Luật miền — quầy thuốc

Vi phạm bất kỳ luật nào dưới đây là lỗi nghiêm trọng, kể cả khi test xanh.

**Tồn kho luôn LƯU theo lô, kể cả khi giao diện tắt quản lý lô.** Đơn vị tồn
là `(sản phẩm, lô, hạn dùng)`, không có ngoại lệ. Không bao giờ viết code coi
tồn kho là một con số trên mỗi sản phẩm.

Cài đặt "quản lý theo lô" chỉ điều khiển **giao diện và quy tắc nhập liệu**.
Khi tắt, hàng vào một lô ngầm định (`lô = null`, `HSD = null`) và giao diện ẩn
cột lô — nhưng tầng dữ liệu và tầng nghiệp vụ không đổi.

**Cấm tuyệt đối viết hai nhánh xử lý kho** theo cài đặt này. Không có
`if (batchTrackingEnabled) { ... } else { ... }` trong lớp tồn kho. Một đường
code duy nhất, chạy trên mô hình theo lô. Nếu bạn thấy mình sắp viết nhánh thứ
hai, đó là dấu hiệu thiết kế sai — ghi BLOCKED.md và dừng.

Bán trừ theo FEFO. Trả hàng hoàn về đúng lô đã bán. Khi ở chế độ phẳng, cả hai
quy tắc này vẫn chạy, chỉ là luôn rơi vào lô ngầm định.

**Tồn kho lưu ở đơn vị cơ sở.** Mọi phép tính tồn dùng đơn vị nhỏ nhất (viên).
Quy đổi chỉ xảy ra ở lớp hiển thị và nhập liệu. Không bao giờ lưu tồn ở đơn vị
hộp rồi quy đổi khi tính.

**Không bao giờ để tồn kho âm** mà không có bản ghi giải thích. Nếu một thao
tác làm tồn âm, đó là bug, không phải trạng thái hợp lệ.

**Tiền tính bằng số nguyên.** Đơn vị nhỏ nhất là đồng. Không dùng số thực cho
tiền ở bất kỳ đâu, kể cả biến trung gian.

**Mọi thay đổi tồn kho phải ghi thẻ kho.** Bán, nhập, trả, kiểm kê, xuất huỷ —
không có ngoại lệ. Thẻ kho là thứ dùng để truy khi số liệu lệch.

**Không xoá cứng dữ liệu giao dịch.** Hoá đơn, phiếu nhập, phiếu trả chỉ được
huỷ có ghi nhận, không được xoá khỏi cơ sở dữ liệu.

---

## Luật giao diện

Đọc `docs/agent/UI-FIDELITY.md` trước mọi task chạm tới UI. Tóm tắt:

- **Sao chép** bố cục, thứ tự cột, luồng thao tác, vị trí nút, từ ngữ của
  KiotViet. Đối chiếu screenshots trong `docs/reference/kiotviet/`.
- **Được cải thiện** cỡ chữ, tương phản, khoảng cách, vùng chạm, trạng thái
  loading/empty/lỗi.
- **Màn bán hàng phải dùng được hoàn toàn bằng bàn phím** và máy quét mã vạch.
- Khi gợi ý của skill thiết kế mâu thuẫn với UI-FIDELITY.md, luật thắng.
  Muốn phá luật thì ghi BLOCKED.md, đừng tự quyết.

---

## Một run = một task = một PR

Chọn đúng một task. Làm xong. Mở PR. Dừng. Không làm task thứ hai kể cả khi
còn thời gian.

Nếu task ước lượng vượt quá một PR hợp lý (>300 dòng đổi hoặc >8 file), đừng
làm. Chẻ thành task con trong BACKLOG.md, mở PR chỉ chứa việc chẻ task, dừng.

Cập nhật BACKLOG.md và JOURNAL.md trong CÙNG commit với code.

## Tầng merge

Mỗi task có nhãn `[A]` hoặc `[B]`.

- `[A]` — mở PR xong gắn label `auto-merge`. GitHub tự merge khi CI xanh.
- `[B]` — mở PR, KHÔNG gắn label, ghi rõ vì sao cần người duyệt.

Không tự nâng `[B]` lên `[A]`. Mặc định khi nghi ngờ là `[B]`.

Luôn là `[B]`: mọi thứ chạm tồn kho, lô, hạn dùng, quy đổi đơn vị, tiền, hoá
đơn, đồng bộ offline, migration, phân quyền, backup.

Nhóm này **chỉ áp cho task GHI dữ liệu**. Task chỉ đọc — báo cáo, cảnh báo, in ấn,
màn hình hiển thị — được `[A]`, kể cả khi nó đọc tồn kho hay tiền. Nếu một task
trông như chỉ đọc nhưng lỗi của nó có thể sinh ra chứng từ sai, nó là task ghi.

## Định nghĩa "xong"

- Có test bao phủ hành vi mới, chạy xanh.
- Typecheck, lint, build xanh.
- Không còn TODO hay mock trên đường chính.
- BACKLOG.md và JOURNAL.md đã cập nhật.
- Nếu task chạm UI: đã đối chiếu screenshots tương ứng và luồng bàn phím còn
  nguyên vẹn.

Không bao giờ tắt test, skip test, hay nới type để CI xanh. Gặp tình huống đó
nghĩa là task bị định nghĩa sai — ghi BLOCKED.md và dừng.

## Git

- Branch `agent/<task-id>-<mô-tả-ngắn>`, không push thẳng `main`, không force-push.
- Một PR một task, để `git revert` là thao tác nguyên tử.
- Commit message: `<task-id>: <việc đã làm>`

## Bí thì dừng

Ghi `BLOCKED.md` và dừng khi: SPEC mơ hồ, thiếu credential, phát hiện quyết
định kiến trúc cũ gây vấn đề, hoặc cần người dùng thật xác nhận một lựa chọn
giao diện.

Mỗi mục BLOCKED gồm: task ID, tình huống, các phương án kèm đánh đổi, và một
câu hỏi cụ thể trả lời được trong 1-2 câu.

Nếu BLOCKED.md có mục chưa giải quyết đang chặn toàn bộ task còn lại, báo Slack
và dừng. Đừng đi tìm việc phụ để làm cho có.

## Lệnh

Dùng đúng bộ lệnh đã ghi trong `ARCHITECTURE.md`. Không tự soạn biến thể,
không thêm cờ verbose, không gọi test runner với tuỳ chọn riêng.

Lý do không phải hình thức: output dài đi vào context và bị gửi lại ở MỌI lượt
sau trong cùng run. Một lần chạy test với reporter verbose có thể ngốn hết
phần context còn lại của run đó.

Khi một lệnh thất bại, đọc phần cuối của output rồi làm việc từ đó. Đừng chạy
lại với mức chi tiết cao hơn trừ khi thật sự cần.

Nếu cần một thao tác chưa được ghi trong ARCHITECTURE.md, đó là dấu hiệu môi
trường chưa sẵn sàng cho task này — ghi BLOCKED.md và dừng.
