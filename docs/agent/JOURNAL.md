# Nhật ký

Append-only. Mỗi run thêm đúng một entry vào CUỐI file. Không sửa entry cũ.
Giữ mỗi entry dưới 8 dòng — file này được đọc lại ở mọi run, dài ra là tốn
context của chính bạn.

Format:

```
## <ngày giờ> — <task-id>
Làm: <một câu>
PR: <link>
Tầng: A | B
Quyết định: <chỉ ghi nếu có lựa chọn kỹ thuật đáng nhớ>
Khác KiotViet: <chỉ ghi nếu cố ý làm khác, kèm lý do một câu>
Kế tiếp: <task-id dự kiến, hoặc "cần người quyết">
```

Nếu run kết thúc mà không làm được task nào, vẫn ghi entry nói rõ vì sao. Run
sau cần biết điều đó.

---

## 2026-01-01 00:00 — T-000
Làm: khởi tạo docs/agent, CLAUDE.md, UI-FIDELITY.md, DOMAIN-NOTES.md.
PR: —
Tầng: B
Kế tiếp: T-001

## 2026-09-08 — T-000b (phiên plan 4, chạy local)
Làm: sinh SPEC.md, ARCHITECTURE.md, viết lại BACKLOG.md, bổ sung bảng phím tắt vào
UI-FIDELITY.md, vendor 3 skill + 1 subagent, thêm CI và auto-merge workflow.
PR: —
Tầng: B
Quyết định: stack Vite+React+Hono+Drizzle+SQLite; giá vốn bình quân gia quyền lưu
theo cặp (tồn, giá trị tồn); FEFO `NULLS FIRST`; offline chỉ cho bán và trả hàng.
Khác KiotViet: chưa có — phiên này không dựng giao diện nào.
Kế tiếp: T-001

## 2026-09-10 — T-001
Làm: dựng khung dự án (Vite+React+TS, Hono, Drizzle+SQLite, Vitest, Playwright,
ESLint flat+Prettier+dependency-cruiser); `npm run ci` xanh.
PR: (xem mô tả PR)
Tầng: B
Quyết định: nâng drizzle-orm/vite/vitest lên bản mới nhất — bản ghim ban đầu
dính CVE (SQL injection ở drizzle-orm, path traversal ở vitest).
Kế tiếp: T-002 hoặc T-004 (không phụ thuộc nhau, chọn theo prio).

## 2026-09-11 — T-004 (chẻ task, không code)
Làm: T-002 đã có PR#14 mở (xanh, chờ duyệt) nên chọn T-004. Dựng xong toàn bộ
schema+migration+trigger+seed+test, `npm run ci` xanh — nhưng diff thật (kể cả
`meta/*.json` do drizzle-kit tự sinh) là 1054 dòng, vượt ngưỡng 1000. CLAUDE.md chỉ
trừ lockfile, không trừ snapshot tự sinh, và cấm tự cấp ngoại lệ. Bỏ toàn bộ code
(không commit), chẻ T-004 thành T-004a/b/c trong BACKLOG.md, chỉ mở PR chứa việc
chẻ này.
PR: (xem mô tả PR)
Tầng: B
Kế tiếp: T-004a.
