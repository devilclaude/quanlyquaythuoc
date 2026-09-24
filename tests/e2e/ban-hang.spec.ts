import { test, expect } from '@playwright/test';

// T-020 — luồng bán hàng bằng bàn phím CHỈ được kiểm ở tầng e2e
// (ARCHITECTURE.md §7: "luồng bán hàng bằng bàn phím là ràng buộc không
// thương lượng ... chỉ được kiểm ở tầng e2e"). `vite preview` chỉ phục vụ
// client tĩnh, không có server API thật phía sau — chặn `/api/hang-hoa` để
// giả một kết quả tìm kiếm cố định, không cần dựng CSDL cho e2e.
//
// Chặn bằng `context.route` (KHÔNG phải `page.route`) — từ T-030, service
// worker cache runtime cho `/api/hang-hoa` (vite.config.ts) tự gọi `fetch`
// bên trong tiến trình SW; `page.route` chỉ chặn được request phát trực
// tiếp từ trang, `context.route` mới chặn được cả request SW đó.
const DU_LIEU_TIM: unknown = {
  duLieu: [
    {
      id: 'sp-1',
      maHang: 'SP000240',
      ten: 'Panadol Extra hộp 15 vỉ x 12 viên nén GSK',
      giaBan: 17000,
      giaVon: 0,
      tonKho: 41,
      ngayTao: '2026-09-01T00:00:00.000Z',
      donViTinh: [
        { id: 'dvt-vi', ten: 'vỉ', heSo: 1, laCoSo: true, giaBan: 17000 },
        { id: 'dvt-hop', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 },
      ],
    },
  ],
};

test('bán hàng: tìm và thêm hàng vào giỏ hoàn toàn bằng bàn phím (T-020)', async ({ page, context }) => {
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  await expect(oTim).toBeFocused();
  // Gợi ý tìm hàng — role "option" của trình đọc màn hình cũng khớp mọi
  // <option> trong dropdown đổi đơn vị của dòng giỏ hàng (T-021), nên phải
  // khoanh vùng vào đúng listbox gợi ý, không dùng getByRole('option') trần.
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');

  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);

  // Dòng đầu (vỉ) đang chọn sẵn; ArrowDown sang dòng hộp rồi Enter để thêm —
  // không chạm chuột từ đầu tới cuối.
  await page.keyboard.press('ArrowDown');
  await expect(goiYOption.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');

  await expect(goiYOption).toHaveCount(0);
  await expect(oTim).toHaveValue('');
  await expect(oTim).toBeFocused();

  const dongGio = page.locator('tbody tr');
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText('SP000240');
  await expect(dongGio).toContainText('hộp');
  await expect(dongGio).toContainText('260,000');

  await expect(page.getByText('Khách cần trả')).toBeVisible();
  await expect(page.locator('.ban-hang__hang--can-tra .so')).toHaveText('260,000');
  // Khớp ảnh KiotViet: dòng "Tổng tiền hàng" hiện cả số món lẫn tổng tiền.
  await expect(page.getByText('Tổng tiền hàng')).toContainText('1');

  // F3 lấy lại focus ô tìm dù đang ở đâu trên trang (UI-FIDELITY.md nhóm 1).
  await oTim.blur();
  await expect(oTim).not.toBeFocused();
  await page.keyboard.press('F3');
  await expect(oTim).toBeFocused();
});

test('bán hàng: đổi đơn vị và sửa số lượng dòng giỏ hàng hoàn toàn bằng bàn phím (T-021)', async ({
  page,
  context,
}) => {
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // dòng đầu (vỉ) đang chọn sẵn trong gợi ý

  const dongGio = page.locator('tbody tr');
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText('vỉ');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');

  // F2: dòng vừa thêm tự động là "dòng đang chọn" — đổi sang đơn vị kế tiếp
  // (hộp), giá lấy thẳng từ đơn vị mới, không nhân hệ số.
  await page.keyboard.press('F2');
  await expect(dongGio).toContainText('hộp');
  await expect(dongGio).toContainText('260,000');
  await expect(page.locator('.ban-hang__hang--can-tra .so')).toHaveText('260,000');

  // '+' tăng số lượng dòng đang chọn.
  await page.keyboard.press('+');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('2');
  await expect(page.locator('.ban-hang__hang--can-tra .so')).toHaveText('520,000');

  // '-' giảm lại, không xuống dưới 1.
  await page.keyboard.press('-');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');
  await page.keyboard.press('-');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');

  // Delete xoá dòng đang chọn — giỏ về rỗng, hướng dẫn F3 hiện lại.
  await page.keyboard.press('Delete');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect(page.getByText('Chưa có hàng trong đơn.')).toBeVisible();
});

test('bán hàng: gõ "+"/"-" vào ô tìm khi đang có dòng giỏ hàng không bị nuốt ký tự (T-021)', async ({
  page,
  context,
}) => {
  // Tái hiện bug doi-chieu-ui phát hiện: phím tắt của dòng giỏ hàng (F2/+/-/
  // Delete) trước đây kích hoạt bất cứ khi nào KHÔNG có gợi ý hiện ra
  // (`goiY.length === 0`) — nhưng gợi ý cũng rỗng khi ô tìm có chữ mà 0 kết
  // quả khớp, hoặc đang chờ debounce. Ca này: ô tìm có chữ ("zzz", 0 kết quả
  // khớp) — phải gõ được "+"/"-" bình thường, không được nuốt để tăng/giảm
  // số lượng dòng giỏ hàng (UI-FIDELITY.md: "Ô tìm phải chịu được luồng đó
  // không mất ký tự"; "Không phím tắt nào được phá luồng đang gõ dở").
  await context.route('**/api/hang-hoa*', (route) => {
    const url = new URL(route.request().url());
    const tuKhoa = url.searchParams.get('tim') ?? '';
    route.fulfill({ json: tuKhoa.startsWith('zzz') ? { duLieu: [] } : DU_LIEU_TIM });
  });
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // thêm 1 dòng — dòng này tự động là "dòng đang chọn"

  const dongGio = page.locator('tbody tr');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');

  // Gõ một từ khoá không khớp gì — ô tìm KHÔNG rỗng, nhưng gợi ý rỗng
  // (0 kết quả) giống hệt trạng thái "chưa có gợi ý".
  await oTim.pressSequentially('zzz');
  await expect(page.getByText('Không tìm thấy hàng hoá phù hợp')).toBeVisible();

  // Gõ tiếp "-" và "+" — phải vào ô tìm, KHÔNG được đổi số lượng dòng giỏ hàng.
  await page.keyboard.press('-');
  await page.keyboard.press('+');
  await expect(oTim).toHaveValue('zzz-+');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');
});

// T-024 — Quét mã vạch. Mã tra được (nhà sản xuất hay tem tự in) chính là
// `maHang` đã có sẵn từ T-009b, không cần dữ liệu/API mới — bài kiểm chỉ cần
// mã hàng dạng số giống mã vạch thật (khớp `docs/reference/kiotviet/.../In
// tem mã sau khi nhập hàng.png`: cột "Mã hàng" hiện thẳng mã vạch dạng số khi
// người dùng nhập mã đó làm mã hàng).
const MA_VACH_CEFDINA = '8935022710786';
const DU_LIEU_CEFDINA: unknown = {
  duLieu: [
    {
      id: 'sp-cefdina',
      maHang: MA_VACH_CEFDINA,
      ten: 'Cefdina 125 MG',
      giaBan: 45000,
      giaVon: 0,
      tonKho: 30,
      ngayTao: '2026-09-01T00:00:00.000Z',
      donViTinh: [{ id: 'dvt-cefdina', ten: 'hộp', heSo: 1, laCoSo: true, giaBan: 45000 }],
    },
  ],
};

test('quét mã vạch: gõ cực nhanh rồi Enter ngay thêm thẳng vào giỏ dù API trả chậm hơn debounce (T-024)', async ({
  page,
  context,
}) => {
  // API cố tình trả CHẬM HƠN 150ms (debounce) — nếu Enter vẫn dùng `goiY` cũ
  // (bug "mất nhịp" ở debug-co-he-thong) thì lúc Enter bấm goiY còn rỗng và
  // KHÔNG có gì được thêm vào giỏ. Sửa đúng thì luồng quét gọi API ngay lúc
  // Enter, không đợi debounce, nên vẫn thêm đúng khi có kết quả.
  await context.route('**/api/hang-hoa*', async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({ json: DU_LIEU_CEFDINA });
  });
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  await oTim.pressSequentially(MA_VACH_CEFDINA, { delay: 0 });
  // Không có bước ArrowDown/chọn tay nào — Enter bấm ngay sau ký tự cuối,
  // giống hệt máy quét thật (gõ xong tự "gõ" Enter).
  await page.keyboard.press('Enter');

  const dongGio = page.locator('tbody tr');
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText(MA_VACH_CEFDINA);
  await expect(dongGio).toContainText('Cefdina 125 MG');
  await expect(oTim).toHaveValue('');
  await expect(oTim).toBeFocused();
});

test('quét mã vạch: quét mã không khớp hàng nào thì báo không tìm thấy, không thêm nhầm gì vào giỏ (T-024)', async ({
  page,
  context,
}) => {
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: { duLieu: [] } }));
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  await oTim.pressSequentially('0000000000000', { delay: 0 });
  await page.keyboard.press('Enter');

  await expect(page.getByText('Không tìm thấy hàng hoá phù hợp')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});

test('quét mã vạch: quét liên tiếp hai mã không lẫn kết quả dù mã trước phản hồi chậm hơn mã sau (T-024)', async ({
  page,
  context,
}) => {
  // Mã đầu (không khớp gì) cố tình trả về SAU mã thứ hai (khớp, trả nhanh) —
  // tái hiện đúng ca race mà `truyVanHienTaiRef` phải chặn: kết quả trễ của
  // một lần quét cũ ghi đè lên kết quả mới hơn đã hiển thị đúng.
  await context.route('**/api/hang-hoa*', async (route) => {
    const url = new URL(route.request().url());
    const tuKhoa = url.searchParams.get('tim') ?? '';
    if (tuKhoa === '1111111111111') {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ json: { duLieu: [] } });
      return;
    }
    await route.fulfill({ json: DU_LIEU_CEFDINA });
  });
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  await oTim.pressSequentially('1111111111111', { delay: 0 });
  await page.keyboard.press('Enter'); // quét mã KHÔNG khớp — request chậm (500ms) đang bay

  // Quét tiếp mã thứ hai trước khi request đầu kịp trả lời — chọn lại toàn bộ
  // ô tìm giống nhịp thao tác thật (F3 tự chọn hết chữ cũ) rồi gõ đè.
  await page.keyboard.press('F3');
  await oTim.pressSequentially(MA_VACH_CEFDINA, { delay: 0 });
  await page.keyboard.press('Enter');

  const dongGio = page.locator('tbody tr');
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText('Cefdina 125 MG');

  // Đợi qua mốc request đầu (500ms) — kết quả trễ của nó KHÔNG được phép xoá
  // hay đổi dòng giỏ hàng vừa thêm đúng.
  await page.waitForTimeout(600);
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText('Cefdina 125 MG');
});

// T-022c — panel thanh toán. Luồng bán hàng đầy đủ (tìm → giỏ → thanh toán →
// tạo hoá đơn) chỉ được kiểm ở tầng e2e (ARCHITECTURE.md §8: bắt buộc có ít
// nhất một luồng bán hàng hoàn toàn bằng bàn phím). Không dựng CSDL thật —
// chặn `POST /api/hoa-don` (T-022b, đã có test tích hợp DB riêng ở
// `tao-hoa-don.test.ts`/`hoa-don.test.ts`), chỉ kiểm hành vi UI.
test('thanh toán: F9 sang khu vực thanh toán, Enter xác nhận, thành công thì xoá giỏ và báo mã hoá đơn (T-022c)', async ({
  page,
  context,
}) => {
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  await context.route('**/api/hoa-don', async (route) => {
    expect(route.request().method()).toBe('POST');
    const than = route.request().postDataJSON() as { phuongThucThanhToan: string; dong: unknown[] };
    expect(than.phuongThucThanhToan).toBe('TIEN_MAT');
    expect(than.dong).toHaveLength(1);
    await route.fulfill({
      status: 201,
      json: {
        id: 'hd-1',
        ma: 'HD000123',
        tongTienHang: 17_000,
        giamGia: 0,
        thuKhac: 0,
        lamTron: 0,
        khachCanTra: 17_000,
        thoiGian: '2026-09-24T03:00:00.000Z',
      },
    });
  });
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  // Khoanh vùng vào đúng bảng giỏ hàng — từ T-023, preview in hoá đơn cũng có
  // bảng riêng (dòng hàng) nên `tbody tr` trần khớp cả hai khi preview đang mở.
  const dongGioHang = page.locator('.ban-hang__gio tbody tr');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // dòng đầu (vỉ, 17.000đ) đang chọn sẵn — thêm vào giỏ

  await expect(dongGioHang).toHaveCount(1);

  // F9 chuyển focus sang khu vực thanh toán (UI-FIDELITY.md nhóm 2) — không
  // chạm chuột từ đầu tới cuối luồng bán hàng. Đích là radio đang chọn (mặc
  // định Tiền mặt) trong nhóm phương thức thanh toán.
  await page.keyboard.press('F9');
  await expect(page.getByRole('radio', { name: 'Tiền mặt' })).toBeFocused();

  // Enter ngay (mặc định Tiền mặt, ô "Khách thanh toán" để trống nghĩa là
  // khách đưa vừa đủ) xác nhận thanh toán và gọi POST /api/hoa-don — mở luôn
  // preview in hoá đơn (T-023), nút "In" tự focus (xem ban-hang.spec.ts test
  // "in hoá đơn" bên dưới cho luồng in đầy đủ).
  await page.keyboard.press('Enter');

  await expect(page.getByText('Đã tạo hoá đơn HD000123')).toBeVisible();
  await expect(dongGioHang).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'In hoá đơn' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'In (Enter)' })).toBeFocused();

  // Đóng preview (Esc) không in gì — ô tìm lấy lại focus cho đơn tiếp theo.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'In hoá đơn' })).not.toBeVisible();
  await expect(oTim).toBeFocused();
});

// T-023 — In hoá đơn. Preview mở ngay sau thanh toán (test trên), nội dung
// khớp giỏ hàng + kết quả server, khổ giấy chọn được và nhớ lại giữa các lần
// mở (localStorage — chỉ kiểm được ở e2e, không phải Vitest môi trường
// `node`). Enter (nút "In" đã tự focus) gọi `window.print()` — stub hàm này
// vì Playwright không thực sự in được, chỉ xác nhận nó được gọi.
test('in hoá đơn: preview khớp nội dung, đổi khổ giấy nhớ lại sau khi tải lại trang, Enter gọi in (T-023)', async ({
  page,
  context,
}) => {
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  await context.route('**/api/hoa-don', async (route) => {
    await route.fulfill({
      status: 201,
      json: {
        id: 'hd-1',
        ma: 'HD000456',
        tongTienHang: 520_000,
        giamGia: 20_000,
        thuKhac: 0,
        lamTron: 0,
        khachCanTra: 500_000,
        thoiGian: '2026-09-24T03:00:00.000Z',
      },
    });
  });
  await page.addInitScript(() => {
    (window as unknown as { __soLanIn: number }).__soLanIn = 0;
    window.print = () => {
      (window as unknown as { __soLanIn: number }).__soLanIn += 1;
    };
  });
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('ArrowDown'); // hộp, 260.000đ
  await page.keyboard.press('Enter');
  await page.keyboard.press('+'); // 2 hộp = 520.000đ — dòng vừa thêm tự động là dòng đang chọn

  await page.keyboard.press('F9');
  await page.getByLabel('Giảm giá').fill('20000');
  await page.keyboard.press('Enter');

  const preview = page.getByRole('dialog', { name: 'In hoá đơn' });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('HD000456');
  await expect(preview).toContainText('Panadol Extra');
  await expect(preview).toContainText('520,000'); // tổng tiền hàng trước giảm giá
  await expect(preview).toContainText('500,000'); // khách cần trả sau giảm giá

  // Mặc định K80 (chưa từng chọn trên máy này).
  await expect(page.getByRole('radio', { name: 'K80 (80mm)' })).toBeChecked();

  // Đổi sang K57, đóng preview, tải lại trang — lựa chọn phải còn nguyên.
  await page.getByRole('radio', { name: 'K57 (57mm)' }).check();
  await page.keyboard.press('Escape');
  await page.reload(); // context.route đã đăng ký ở trên vẫn áp dụng sau khi tải lại
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter');
  await page.keyboard.press('F9');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: 'K57 (57mm)' })).toBeChecked();

  // Enter khi nút "In" đang focus (autofocus lúc mở preview) gọi window.print().
  await expect(page.getByRole('button', { name: 'In (Enter)' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __soLanIn: number }).__soLanIn))
    .toBe(1);
});

test('thanh toán: tiền mặt đưa chưa đủ thì báo lỗi ngay, không gọi API và không xoá giỏ hàng (T-022c)', async ({
  page,
  context,
}) => {
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  let goiApi = false;
  await context.route('**/api/hoa-don', (route) => {
    goiApi = true;
    return route.fulfill({ status: 201, json: {} });
  });
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // dòng đầu (vỉ, 17.000đ) đang chọn sẵn — thêm vào giỏ
  await expect(page.locator('tbody tr')).toHaveCount(1);

  await page.keyboard.press('F9');
  const oKhachThanhToan = page.getByLabel('Khách thanh toán');
  await oKhachThanhToan.fill('1000');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Khách thanh toán chưa đủ')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(goiApi).toBe(false);
});
