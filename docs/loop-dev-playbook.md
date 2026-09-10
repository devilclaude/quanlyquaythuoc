# Playbook — Loop development bằng Claude Code cloud routine

Bản đúc kết từ lần dựng thật cho dự án quản lý quầy thuốc, **đã test và đã vỡ ít
nhất một lần ở mỗi chỗ ghi trong này**. Dùng lại cho dự án mới: đi tuần tự mục 1 →
6, chỉ sửa phần trong `{{ }}`.

Ý tưởng nền: một agent chạy định kỳ trên hạ tầng cloud, mỗi lần một session mới
không nhớ gì, làm đúng một task, mở đúng một PR rồi dừng. Toàn bộ trí nhớ nằm
trong repo. **CI là cái phanh duy nhất** — nên phần lớn playbook này là về việc làm
cho cái phanh thật sự ăn.

---

## 1. Hạ tầng GitHub — làm một lần, đúng thứ tự

### 1.1 Điều kiện tiên quyết

Branch protection **không dùng được với repo private trên gói Free** — cả branch
protection lẫn rulesets đều trả `403 Upgrade to GitHub Pro or make this repository
public`. Không có nó thì mọi lớp bảo vệ khác chỉ là trang trí.

Chọn một: repo public, hoặc GitHub Pro.

> Nếu chọn public: kiểm tra repo có dữ liệu cá nhân của bên thứ ba không (ảnh chụp
> màn hình chứa tên/số điện thoại khách hàng, log, file export). Gỡ khỏi **lịch sử
> git**, không chỉ khỏi HEAD, rồi mới chuyển public.

### 1.2 Bốn lệnh thiết lập

```bash
# a. Merge settings: chỉ squash, bật auto-merge, tự xoá nhánh
gh api -X PATCH repos/:owner/:repo \
  -F allow_auto_merge=true -F allow_squash_merge=true \
  -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true

# b. Branch protection
cat > /tmp/protection.json <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["ci"] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
gh api -X PUT repos/:owner/:repo/branches/main/protection --input /tmp/protection.json

# c. Label phải tồn tại TRƯỚC khi workflow tham chiếu tới
gh label create auto-merge --color 0E8A16 --description "Tầng A - tự merge khi CI xanh"
gh label create needs-human-review --color B60205 --description "Chạm đường dẫn nhạy cảm"

# d. Xác minh tên check khớp (xem 1.3)
```

### 1.3 Hai cái bẫy chết người ở bước này

**`enforce_admins: true` là BẮT BUỘC, không phải tuỳ chọn.**
Đây là lỗi đã làm vỡ phép thử lần đầu. Với `enforce_admins: false`, token có quyền
admin **merge được PR có CI đỏ qua REST API** `PUT /repos/.../pulls/N/merge` mà
không cần cờ gì đặc biệt. Cờ `--admin` của `gh` chỉ là quy ước phía client —
REST API không có khái niệm đó. Mà agent cloud dùng GitHub MCP server, tức là đi
thẳng REST API.

> **Bài học tổng quát: kiểm cái cổng bằng ĐÚNG công cụ mà agent sẽ dùng.**
> Tôi đã thử bằng `gh pr merge`, bị từ chối, và kết luận cổng an toàn. Sai. Cùng
> điều kiện, REST API merge lọt.

**Tên required check phải khớp tên job thật.**
`contexts: ["ci"]` phải bằng đúng tên job trong workflow. Lệch tên thì GitHub coi
như không có yêu cầu nào, hoặc PR treo mãi. Xác minh bằng **quan sát**, sau khi CI
đã chạy ít nhất một lần:

```bash
gh api repos/:owner/:repo/commits/main/check-runs --jq '.check_runs[].name'
gh api repos/:owner/:repo/branches/main/protection --jq '.required_status_checks.contexts'
```

Hai danh sách phải khớp. Đừng suy từ file YAML — đọc từ lần chạy thật.

---

## 2. Sáu file luật trong repo

| File | Vai trò | Agent được sửa? |
|---|---|---|
| `CLAUDE.md` | Luật làm việc, ở gốc repo | Không |
| `docs/agent/SPEC.md` | Yêu cầu sản phẩm, luật nghiệp vụ | Không |
| `docs/agent/ARCHITECTURE.md` | Stack, cấu trúc, **bộ lệnh chuẩn** | Không |
| `docs/agent/BACKLOG.md` | Hàng đợi task | Có — chỉ trạng thái |
| `docs/agent/JOURNAL.md` | Nhật ký, append-only | Có — thêm cuối file |
| `docs/agent/BLOCKED.md` | Việc cần người quyết | Có — thêm mục |

### Bốn luật phải có trong `CLAUDE.md`

**a. Máy trạng thái task: `TODO → DOING → CHỜ MERGE → DONE`.**
Không bao giờ ghi `DONE` cùng commit với code. Lúc đó PR chưa merge; nếu bị từ
chối, task biến mất khỏi hàng đợi — không `TODO`, không `DOING`, cũng chưa vào
`main`. Việc chuyển `CHỜ MERGE → DONE` do **run kế tiếp** làm.

**b. Mỗi run dọn PR cũ trước khi mở task mới.**
Session mới không biết run trước để lại gì. PR đỏ hoặc có comment chưa xử lý thì
sửa nó rồi **dừng run tại đó**. Sửa PR cũ gần như luôn giá trị hơn mở task mới.

**c. Ngưỡng PR cứng, cấm tự cấp ngoại lệ.**
Agent **sẽ** tự cấp ngoại lệ khi nó thấy có lý do tốt — đã quan sát được thật. Một
lần thì vô hại; qua hàng trăm run đó là cách hàng rào mòn dần. Viết rõ: vượt ngưỡng
thì ghi `BLOCKED.md` và dừng, **không** mở PR vượt ngưỡng kèm lời giải thích.
Ngưỡng thực tế: `{{1000 dòng / 24 file}}`, không tính lockfile.

**d. Khai báo tầng bằng dòng trong mô tả PR, KHÔNG bằng label.**
Xem mục 3.2 — đây là quyết định kiến trúc quan trọng nhất của playbook này.

---

## 3. Hai workflow

### 3.1 `ci.yml`

Một job duy nhất tên `ci`. Tách nhiều job nghe song song hơn nhưng mỗi job phải trả
lại chi phí cài phụ thuộc — với repo nhỏ, tổng thời gian tăng.

Ngân sách: **cold install + toàn bộ test dưới ~5 phút**, vì nó bị trả 28 lần mỗi
tuần. Thứ chi phối ngân sách là e2e browser, không phải stack — cache browser theo
lockfile.

**`npm run ci` phải bằng ĐÚNG những gì CI chạy**, không thiếu bước nào. Thiếu e2e ở
lệnh local nghĩa là agent mở PR rồi mới biết đỏ, tốn một vòng CI cho lỗi đáng lẽ
thấy ngay.

### 3.2 `auto-merge.yml` — quyết định ở phía máy chủ

**Agent không gắn label. Agent chỉ ghi `Tầng: A` trong mô tả PR; workflow đọc dòng
đó rồi tự quyết.**

Bốn lý do, tất cả đều rút từ va vấp thật:

1. **Độc lập môi trường.** Workflow chạy trên runner GitHub với `GITHUB_TOKEN` tự
   cấp mỗi lần chạy — không phải khai credential, không hết hạn, không phụ thuộc
   phiên bản công cụ trong image cloud.
2. **Bề mặt agent thu về hai thao tác**: `git push` và mở PR. Đó là hai thứ ít khả
   năng vỡ nhất.
3. **Agent mất quyền tự lên nòng auto-merge.** Nó chỉ *đề nghị*; máy chủ quyết.
4. `gh pr edit --add-label` **hỏng trên gh 2.45** (GraphQL `projectCards` đã bị
   GitHub khai tử) và **thất bại im lặng**. Nếu để agent gắn label, tầng A chết mà
   không ai biết.

Logic workflow:

```
đọc mô tả PR
  ├─ không có "Tầng: A"          → không làm gì (tầng B chờ người)
  └─ có "Tầng: A"
       ├─ chạm đường dẫn nhạy cảm → gắn needs-human-review + comment, KHÔNG merge
       └─ đường dẫn sạch          → gắn auto-merge + bật auto-merge
```

**Ba chi tiết kỹ thuật đã vấp:**

- **Regex marker phải chịu được dấu tiếng Việt ở dạng tổ hợp.** Dùng
  `^[[:space:]]*T.{0,3}ng:[[:space:]]*A[[:space:]]*$` — nhận cả `Tầng: A` dựng sẵn,
  dạng tổ hợp, lẫn `Tang: A` không dấu. So khớp chính xác sẽ trượt âm thầm.
- **Dữ liệu do người gửi kiểm soát (mô tả PR, tên file) phải đi qua BIẾN MÔI
  TRƯỜNG**, không nội suy thẳng vào shell. Heredoc không đóng ngoặc + tên file chứa
  dấu backtick = bash **thực thi tên file như lệnh**. Vừa hỏng comment, vừa là lỗ
  hổng chèn lệnh trong workflow có quyền ghi.
- **Danh sách đường dẫn nhạy cảm phải khớp cấu trúc thư mục THẬT.** Regex mẫu viết
  bằng tiếng Anh (`inventory`, `stock`, `money`) khớp **0 file** nếu dự án đặt tên
  thư mục bằng ngôn ngữ khác. Kiểm trước khi tin:
  ```bash
  git ls-files > /tmp/f.txt && grep -E -f /tmp/patterns.txt /tmp/f.txt
  ```

Nhóm đường dẫn nhạy cảm nên gồm cả **file luật** (`CLAUDE.md`, SPEC, ARCHITECTURE)
và **file cưỡng chế** (`tsconfig`, cấu hình lint, `.github/`, `.claude/`,
`package.json`). Một PR nới `tsconfig` nguy hiểm hơn một PR sửa nghiệp vụ.

**Dùng `pull_request_target`** để có quyền ghi, và **tuyệt đối không checkout code
của PR** trong workflow đó — repo public nghĩa là người lạ mở PR được.

---

## 4. Môi trường cloud routine — đã đo, không cần đo lại

| Hạng mục | Thực tế |
|---|---|
| `gh` CLI | **không có** |
| GitHub API | qua **GitHub MCP server** (`mcp__github__*`) |
| Xác thực | `GITHUB_TOKEN` có sẵn trong biến môi trường, git remote HTTPS |
| Mở PR, push, comment, label | **được** |
| Xoá nhánh remote | **bị chặn** — egress proxy trả `403 Write access to this GitHub API path is not permitted through this proxy` |
| Danh tính | tài khoản GitHub của chủ repo |

**Hệ quả cần thiết kế quanh:** agent không tự xoá được nhánh. Bật
`delete_branch_on_merge=true` để nhánh của PR đã merge tự biến mất; nhánh của PR
đóng-không-merge sẽ còn lại và cần dọn tay.

**Không cần cấp PAT riêng** nếu đã đẩy mọi thao tác cần quyền ghi nhạy cảm sang
workflow như mục 3.2.

> Cân nhắc dài hạn: token routine là **danh tính admin của chủ repo**. Cấp cho
> routine một danh tính riêng không phải admin thì sạch hơn, nhưng
> `enforce_admins: true` đã đóng được lỗ hổng chính mà không cần đụng hạ tầng.

---

## 5. Prompt routine — chỉ sửa phần trong `{{ }}`

```
Bạn đang xây {{MÔ TẢ SẢN PHẨM MỘT CÂU}}. Người dùng cuối là {{AI, ĐẶC ĐIỂM}}.

Đọc CLAUDE.md ở gốc repo TRƯỚC TIÊN — đó là luật bắt buộc, không phải gợi ý.

Repo có sẵn skill và subagent trong .claude/ — dùng chúng, đừng tự nghĩ lại:
{{LIỆT KÊ SKILL, MỖI DÒNG MỘT CÁI}}

BƯỚC 1 — DỌN PR CŨ, RỒI NẠP BỐI CẢNH

Trước tiên, liệt kê PR đang mở của agent:
  - PR nào CI đỏ, có comment chưa xử lý, hoặc conflict với main → SỬA NÓ và
    DỪNG RUN tại đó. Không mở task mới.
  - PR nào đã merge → chuyển task tương ứng trong BACKLOG.md sang DONE.
  - Chỉ khi mọi PR đang mở đều xanh và đang chờ người duyệt, mới đi tiếp.

Sau đó đọc theo thứ tự:
  - docs/agent/SPEC.md
  - docs/agent/ARCHITECTURE.md
  - docs/agent/BLOCKED.md
  - docs/agent/BACKLOG.md
  - docs/agent/JOURNAL.md (20 entry cuối)

{{NẾU CÓ TÀI LIỆU THAM CHIẾU ĐẶC THÙ: nêu đọc khi nào}}

Đọc 20 tin nhắn gần nhất trong Slack {{#KÊNH}}. Chỉ đạo trong Slack ưu tiên cao
hơn thứ tự trong BACKLOG.

BƯỚC 2 — DỪNG SỚM NẾU CẦN

Dừng ngay, ghi JOURNAL, báo Slack nếu:
  - BLOCKED.md có mục chặn toàn bộ task TODO còn lại
  - Không còn task TODO đủ điều kiện
  - CI trên main đang đỏ và bạn không xác định được nguyên nhân nhanh

BƯỚC 3 — CHỌN MỘT TASK

Đúng một task TODO, prio nhỏ nhất, phụ thuộc đã DONE. Đổi sang DOING.
Task ở trạng thái CHỜ MERGE chưa phải DONE — không coi là phụ thuộc đã xong.

Nếu ước lượng vượt {{NGƯỠNG}}: KHÔNG làm. Chẻ thành task con trong BACKLOG.md,
mở PR chỉ chứa việc chẻ, báo Slack, dừng. Không tự cấp ngoại lệ.

BƯỚC 4 — LÀM

Test trước, rồi code. Chạy `npm run ci` — tất cả phải xanh.

{{RÀNG BUỘC NGHIỆP VỤ ĐẶC THÙ: ca biên bắt buộc phải test trước khi viết code}}

{{RÀNG BUỘC GIAO DIỆN NẾU CÓ: đối chiếu gì, luồng bàn phím, dùng design token
đã chốt trong repo, KHÔNG gọi lại generator design system}}

Không tắt test, không skip test, không nới type để cho qua. Gặp tình huống đó
nghĩa là task định nghĩa sai — ghi BLOCKED.md và dừng.

BƯỚC 5 — GHI STATE

Cùng commit với code:
  - BACKLOG.md: chuyển task sang CHỜ MERGE. KHÔNG phải DONE — PR chưa merge.
  - JOURNAL.md: thêm một entry ở cuối file, dưới 8 dòng.

BƯỚC 6 — MỞ PR

Branch `agent/<task-id>-<mô-tả-ngắn>`.

Mô tả PR phải có ĐÚNG MỘT DÒNG khai báo tầng:
    Tầng: A
hoặc
    Tầng: B

KHÔNG tự gắn label. Workflow trên GitHub đọc dòng này và tự quyết.
Không bao giờ tự nâng [B] lên [A]. Nghi ngờ thì [B].

Mô tả PR còn gồm: task đã làm, cách kiểm chứng, những gì CỐ TÌNH không làm.
{{NẾU CÓ RÀNG BUỘC BÁM GIAO DIỆN: bắt khai báo mọi chỗ cố ý làm khác}}

BƯỚC 7 — BÁO SLACK {{#KÊNH}}
  - Task đã làm, một câu
  - Link PR, tầng A hay B
  - Task dự kiến run kế tiếp
  - Bất cứ điều gì cần quyết

BƯỚC 8 — DỪNG

Không chọn task thứ hai.
```

### Cấu hình routine

- Lịch: `{{CRON UTC}}` — nhớ đổi từ giờ địa phương. Tối thiểu 1 giờ/lần.
- Connectors: Slack (nếu dùng báo cáo)
- Model: `claude-sonnet-5`
- Tools: `Bash, Read, Write, Edit, Glob, Grep`

---

## 6. Kiểm chứng trước khi bật cron — đừng bỏ bước nào

Chạy tuần tự. Gặp lỗi thì dừng, sửa, chạy lại từ đầu mục đó.

**Bước 0 — Chẩn đoán môi trường.** Một routine chạy một lần, chỉ chẩn đoán:
`gh` có không, auth thế nào, `GITHUB_TOKEN` có không, node/npm bản mấy, push được
không, mở PR draft được không. Rẻ hơn nhiều so với để lần chạy đầu vừa dựng dự án
vừa vấp quyền.

**Bước 1 — Cổng hạ tầng.** Tên check khớp (mục 1.3), merge settings đúng,
`enforce_admins: true`.

**Bước 2 — Task khởi tạo, chạy một lần.** Cho routine làm đúng task dựng khung dự
án. Kiểm bằng quan sát, **không tin báo cáo của agent**:
- BACKLOG ghi `CHỜ MERGE` chứ không phải `DONE`?
- PR có đúng dòng khai báo tầng, và **không** tự gắn label?
- File luật có bị đụng không?
- `npm run ci` trong `package.json` có đúng bằng CI không?

**Bước 3 — Phép thử phá hoại (quan trọng nhất).** Mở PR khai `Tầng: A`, phá đúng
một assertion, chờ CI đỏ, rồi **thử merge bằng đúng công cụ agent dùng**
(REST API, không phải `gh`). Kỳ vọng:

```
405 Required status check "ci" is failing.
```

Kiểm SHA của `main` **trước và sau** bằng lệnh của chính bạn. Nếu `main` đổi, cổng
đã vỡ — quay lại mục 1.3.

**Bước 4 — Cổng tầng A.** Ba PR: `Tầng: A` + đường dẫn sạch (phải lên nòng
auto-merge), `Tầng: A` + đường dẫn nhạy cảm (phải bị chặn, gắn
`needs-human-review`, có comment liệt kê đúng file), `Tầng: B` (workflow không làm
gì). Đóng cả ba.

**Bước 5 — Nhóm nghiệp vụ.** Với mỗi luật miền không sửa được về sau, cố tình phá
nó và xem có test nào đỏ không. Ví dụ: đảo thứ tự sắp xếp trong thuật toán chọn
lô, đổi phép tính tiền sang số thực, bỏ bước quy đổi đơn vị. **Nếu test vẫn xanh
thì bộ test đang vô nghĩa ở đúng chỗ nguy hiểm nhất.**

> Nhóm này chỉ chạy được sau khi code nghiệp vụ tồn tại. Đừng để thành một buổi
> kiểm tra riêng dễ bị quên — **gắn nó vào tiêu chí "xong" của từng task**: task
> làm thuật toán chọn lô chưa DONE nếu đảo thứ tự mà test vẫn xanh.

---

## 7. Bẫy đã vấp — danh sách kiểm nhanh

| Bẫy | Dấu hiệu | Cách tránh |
|---|---|---|
| `enforce_admins: false` | REST merge lọt khi CI đỏ | Bật `true`, kiểm bằng REST API |
| Kiểm cổng bằng sai công cụ | `gh` từ chối nhưng REST lọt | Kiểm bằng đúng công cụ agent dùng |
| Tên check lệch | PR treo mãi, hoặc merge tự do | So `check-runs` thật với `contexts` |
| Label chưa tồn tại | Gắn label lỗi | Tạo label trước |
| `gh pr edit` gh 2.45 | Lỗi GraphQL, **im lặng** | Đẩy việc gắn label sang workflow |
| Dấu tiếng Việt dạng tổ hợp | Marker/tên file không khớp | Regex nới; `find` thay vì gõ tay đường dẫn |
| Heredoc + backtick | Bash chạy tên file như lệnh | Truyền qua biến môi trường |
| Regex đường dẫn sai ngôn ngữ | Cổng khớp 0 file | Test regex với `git ls-files` |
| Ghi `DONE` lúc mở PR | Task biến mất khi PR bị từ chối | Thêm trạng thái `CHỜ MERGE` |
| Agent tự cấp ngoại lệ | PR vượt ngưỡng kèm lời giải thích hợp lý | Luật cấm ngoại lệ, ghi BLOCKED |
| Tin báo cáo của agent | Truy nguyên nhân gốc sai | Luôn kiểm chứng độc lập bằng lệnh của bạn |
| Gọi lại generator design | Sau 30 PR có 30 phong cách | Chốt một lần, đóng băng thành token |

**Điều đáng nhớ nhất:** agent xử lý sự cố rất tốt — phát hiện nhanh, không
force-push, mở PR revert đúng quy trình — nhưng **truy nguyên nhân gốc thì sai**.
Nó kết luận thiếu required status check, trong khi rule đó đã có sẵn và thủ phạm là
`enforce_admins`. Đọc digest hàng tuần với tinh thần đó: báo cáo sự cố của agent là
dữ liệu, không phải kết luận.
