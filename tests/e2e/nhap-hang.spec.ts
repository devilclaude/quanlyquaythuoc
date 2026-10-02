import { test, expect } from '@playwright/test';

// T-040c1 — Phiếu nhập: giao diện (tìm hàng đã có). `context.route` (không
// phải `page.route` — SW T-030 tự fetch) với glob `**` để khớp cả
// `/api/hang-hoa/:id` (chi tiết, lấy ghi đè quản lý lô) lẫn `?tim=` (tìm kiếm).
const DON_VI_TINH_PANADOL = [
  { id: 'dvt-vi', ten: 'vỉ', heSo: 1, laCoSo: true, giaBan: 17000 },
  { id: 'dvt-hop', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 },
];
const HANG_HOA_CHUNG = {
  id: 'sp-1',
  maHang: 'SP000240',
  ten: 'Panadol Extra hộp 15 vỉ x 12 viên nén GSK',
  giaBan: 17000,
  giaVon: 0,
  tonKho: 41,
  ngayTao: '2026-09-01T00:00:00.000Z',
  donViTinh: DON_VI_TINH_PANADOL,
};

test('nhập hàng: tìm/thêm hàng bằng bàn phím, Lưu tạm ở chế độ phẳng, rồi Hoàn thành bị chặn/cho qua khi bật quản lý lô (T-040c1)', async ({
  page,
  context,
}) => {
  let quanLyLoGhiDe: 'KE_THUA' | 'BAT' = 'KE_THUA';
  let soLanGoi = 0;
  let thanGui: { hoanThanhNgay?: boolean; dong: unknown[] } | undefined;
  await context.route('**/api/hang-hoa**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/api/hang-hoa/')
        ? { ...HANG_HOA_CHUNG, trangThai: 'HOAT_DONG', coTheXoaCung: true, quanLyLoGhiDe }
        : { duLieu: [HANG_HOA_CHUNG] },
    }),
  );
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));
  // `**` cuối cùng để khớp cả GET danh sách (T-041, kèm `?tim=`/`?trangThai=`…
  // từ bộ lọc) lẫn POST tạo phiếu (T-040c1) trên cùng đường dẫn.
  await context.route('**/api/phieu-nhap**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { duLieu: [] } });
      return;
    }
    soLanGoi += 1;
    thanGui = route.request().postDataJSON();
    const trangThai = thanGui?.hoanThanhNgay ? 'HOAN_THANH' : 'PHIEU_TAM';
    await route.fulfill({ status: 201, json: { id: 'pn-1', ma: 'PN000001', trangThai } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  // T-041: nav "Nhập hàng" vào DANH SÁCH trước — "+ Nhập hàng" mới mở luồng tạo tay.
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();

  const oTim = page.getByPlaceholder('Tìm hàng hóa');
  await expect(oTim).toBeFocused();
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  const dongPhieu = page.locator('tbody tr');

  // Chế độ phẳng (ghi đè "kế thừa" + toàn cục tắt): tìm, chọn bằng mũi tên, Enter
  // thêm vào phiếu — không chạm chuột. KHÔNG có cột Số lô/Hạn dùng.
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('ArrowDown'); // sang dòng "hộp"
  await page.keyboard.press('Enter');
  await expect(goiYOption).toHaveCount(0);
  await expect(oTim).toHaveValue('');
  await expect(oTim).toBeFocused();
  await expect(dongPhieu).toHaveCount(1);
  await expect(dongPhieu).toContainText('SP000240');
  await expect(dongPhieu).toContainText('hộp');
  await expect(page.getByText('Số lô')).toHaveCount(0);

  await dongPhieu.getByLabel(/Số lượng/).fill('5');
  await dongPhieu.getByLabel(/Đơn giá/).fill('16000');
  await expect(dongPhieu).toContainText('80,000'); // 5 × 16.000

  await page.keyboard.press('F6'); // UI-FIDELITY.md nhóm 2, cột Nhập: F6 = Lưu tạm
  await expect(page.getByText('Đã lưu tạm phiếu nhập PN000001')).toBeVisible();
  await expect(dongPhieu).toHaveCount(0);
  expect(thanGui?.hoanThanhNgay).toBe(false);
  expect(thanGui?.dong).toEqual([{ sanPhamId: 'sp-1', donViTen: 'hộp', heSo: 15, donGia: 16000, soLuong: 5 }]);

  // Sản phẩm bật quản lý lô (ghi đè "BAT") — cột Số lô/Hạn dùng xuất hiện dù
  // cài đặt toàn cục đang tắt; thiếu lô/HSD thì Hoàn thành bị chặn ở client.
  quanLyLoGhiDe = 'BAT';
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // dòng đầu (vỉ)
  await expect(dongPhieu).toHaveCount(1);
  await expect(page.getByText('Số lô')).toBeVisible();
  await expect(page.getByText('Hạn dùng')).toBeVisible();
  await dongPhieu.getByLabel(/Đơn giá/).fill('16000');

  await page.getByRole('button', { name: 'Hoàn thành' }).click();
  await expect(page.getByText(/thiếu số lô/)).toBeVisible();
  expect(soLanGoi).toBe(1); // bị chặn ở client — không gọi API lần hai

  await dongPhieu.getByLabel(/Số lô/).fill('L01');
  await dongPhieu.getByLabel(/Hạn dùng/).fill('2027-06-30');
  await page.getByRole('button', { name: 'Hoàn thành' }).click();

  await expect(page.getByText('Đã hoàn thành phiếu nhập PN000001')).toBeVisible();
  expect(thanGui?.hoanThanhNgay).toBe(true);
  expect(thanGui?.dong).toEqual([
    { sanPhamId: 'sp-1', donViTen: 'vỉ', heSo: 1, donGia: 16000, soLuong: 1, soLo: 'L01', hsd: '2027-06-30' },
  ]);
});

test('nhập hàng: chọn liên tiếp hai gợi ý trước khi tra cứu quản lý lô của dòng ĐẦU trả về — dòng đang chọn phải là dòng thêm SAU CÙNG, không kẹt ở dòng đầu (sửa lỗi PR #71)', async ({
  page,
  context,
}) => {
  const HANG_HOA_2 = {
    id: 'sp-2',
    maHang: 'SP000333',
    ten: 'Vitamin C 500mg',
    giaBan: 2000,
    giaVon: 0,
    tonKho: 10,
    ngayTao: '2026-09-01T00:00:00.000Z',
    donViTinh: [{ id: 'dvt-vien', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 2000 }],
  };
  await context.route('**/api/hang-hoa**', async (route) => {
    const url = route.request().url();
    // Dòng ĐẦU chọn (Panadol) có tra cứu ghi đè quản lý lô CHẬM (400ms) — mô
    // phỏng việc chọn dòng THỨ HAI (Vitamin, tra cứu nhanh) trước khi dòng đầu
    // kịp vào phiếu.
    if (url.includes('/api/hang-hoa/sp-1')) {
      await new Promise((r) => setTimeout(r, 400));
      return route.fulfill({
        json: { ...HANG_HOA_CHUNG, trangThai: 'HOAT_DONG', coTheXoaCung: true, quanLyLoGhiDe: 'KE_THUA' },
      });
    }
    if (url.includes('/api/hang-hoa/sp-2')) {
      return route.fulfill({
        json: { ...HANG_HOA_2, trangThai: 'HOAT_DONG', coTheXoaCung: true, quanLyLoGhiDe: 'KE_THUA' },
      });
    }
    const tim = new URL(url).searchParams.get('tim') ?? '';
    const duLieu = tim.toLowerCase().includes('vita') ? [HANG_HOA_2] : [HANG_HOA_CHUNG];
    return route.fulfill({ json: { duLieu } });
  });
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));
  await context.route('**/api/phieu-nhap**', (route) =>
    route.fulfill({ json: route.request().method() === 'GET' ? { duLieu: [] } : {} }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();

  const oTim = page.getByPlaceholder('Tìm hàng hóa');
  const dongPhieu = page.locator('tbody tr');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');

  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // chọn Panadol (dòng "vỉ") — tra cứu lô CHẬM, chưa vào phiếu

  await oTim.pressSequentially('vita');
  await expect(goiYOption).toHaveCount(1);
  await page.keyboard.press('Enter'); // chọn Vitamin — tra cứu lô NHANH, vào phiếu trước Panadol

  await expect(dongPhieu).toHaveCount(2); // đợi Panadol vào phiếu sau cùng

  // Dòng đang chọn (nơi phím +/-/F2/Delete tác động) phải là dòng VỪA THÊM SAU
  // CÙNG (Panadol) — không phải kẹt ở dòng đầu (Vitamin) do chỉ số chọn được
  // tính trước khi tra cứu lô bất đồng bộ của dòng đầu hoàn tất.
  await expect(page.locator('tr.gio-hang__dong--chon')).toContainText('SP000240');
});

test('nhập hàng: nút "+" tạo hàng mới ngay trong màn, thêm thẳng vào phiếu đang soạn (T-040c2)', async ({
  page,
  context,
}) => {
  const HANG_MOI = {
    id: 'sp-moi',
    maHang: 'SP000999',
    ten: 'Vitamin C 500mg',
    giaBan: 2000,
    giaVon: 0,
    tonKho: 0,
    ngayTao: '2026-10-01T00:00:00.000Z',
    donViTinh: [{ id: 'dvt-vien', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 2000 }],
    trangThai: 'HOAT_DONG' as const,
    coTheXoaCung: true,
    quanLyLoGhiDe: 'KE_THUA' as const,
  };
  let thanGuiTaoHangHoa: unknown;
  await context.route('**/api/hang-hoa**', (route) => {
    const url = route.request().url();
    if (route.request().method() === 'POST') {
      thanGuiTaoHangHoa = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: HANG_MOI });
    }
    return route.fulfill({
      json: url.includes('/api/hang-hoa/') ? HANG_MOI : { duLieu: [] },
    });
  });
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));
  await context.route('**/api/phieu-nhap**', (route) =>
    route.fulfill({ json: route.request().method() === 'GET' ? { duLieu: [] } : {} }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  // T-041: nav "Nhập hàng" vào DANH SÁCH trước — "+ Nhập hàng" mới mở luồng tạo tay.
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();

  const dongPhieu = page.locator('tbody tr');
  await page.getByRole('button', { name: 'Tạo hàng mới' }).click();
  await expect(page.getByRole('dialog', { name: 'Tạo hàng hóa' })).toBeVisible();

  await page.getByLabel('Tên hàng').fill(HANG_MOI.ten);
  await page.getByLabel('Tên đơn vị cơ sở').fill('viên');
  await page.getByLabel('Giá bán', { exact: true }).fill('2000');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();

  expect(thanGuiTaoHangHoa).toMatchObject({ ten: HANG_MOI.ten, donViCoSoTen: 'viên', giaBan: 2000 });
  await expect(page.getByRole('dialog', { name: 'Tạo hàng hóa' })).toHaveCount(0);
  await expect(dongPhieu).toHaveCount(1);
  await expect(dongPhieu).toContainText('SP000999');
  await expect(dongPhieu).toContainText('viên');
  const oTim = page.getByPlaceholder('Tìm hàng hóa');
  await expect(oTim).toBeFocused();
});

test('danh sách nhập hàng: xem danh sách, mở chi tiết ngay dưới dòng, quay lại sau khi vào "+ Nhập hàng" (T-041)', async ({
  page,
  context,
}) => {
  const PHIEU_MAU = { id: 'pn-1', ma: 'PN002221', chiNhanhId: 'cn-1', trangThai: 'HOAN_THANH', thoiGian: '2026-05-17T03:58:00.000Z', tongTien: 11_898_000 };
  const DONG_MAU = { id: 'pnd-1', sanPhamId: 'sp-1', maHang: 'SP000125', ten: 'Betaloc 50mg', donViTen: 'hộp', heSo: 1, donGia: 142_000, soLuong: 2, soLo: null, hsd: null };
  await context.route('**/api/phieu-nhap**', async (route) => {
    const url = route.request().url();
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 201, json: { id: 'pn-moi', ma: 'PN000002', trangThai: 'PHIEU_TAM' } });
    } else if (url.includes('/api/phieu-nhap/pn-1')) {
      await route.fulfill({ json: { ...PHIEU_MAU, dong: [DONG_MAU] } });
    } else {
      await route.fulfill({ json: { duLieu: [PHIEU_MAU] } });
    }
  });
  await context.route('**/api/hang-hoa**', (route) => route.fulfill({ json: { duLieu: [] } }));
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();

  // Cột khớp screenshot "Danh sách nhập hàng": Mã nhập hàng, Thời gian, Tổng tiền, Trạng thái.
  const dongPhieu = page.getByRole('button', { name: /PN002221/ });
  await expect(dongPhieu).toContainText('11,898,000');
  await expect(dongPhieu).toContainText('Đã nhập hàng');

  // Bấm dòng mở chi tiết NGAY DƯỚI dòng đó; "+ Nhập hàng" mở luồng tạo tay (T-040c1), quay lại thấy lại danh sách.
  await dongPhieu.click();
  await expect(page.getByText('Betaloc 50mg')).toBeVisible();
  await expect(page.getByText('284,000')).toBeVisible(); // 142.000 × 2
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();
  await expect(page.getByPlaceholder('Tìm hàng hóa')).toBeVisible();
  await page.getByRole('button', { name: '← Danh sách nhập hàng' }).click();
  await expect(dongPhieu).toBeVisible();
});

test('danh sách nhập hàng: bộ lọc "Thời gian" — Tháng này mặc định, Tùy chỉnh gửi đúng khoảng ngày giờ Việt Nam (T-041b)', async ({
  page,
  context,
}) => {
  const urlsDaGoi: string[] = [];
  await context.route('**/api/phieu-nhap**', async (route) => {
    if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: {} });
    urlsDaGoi.push(route.request().url());
    return route.fulfill({ json: { duLieu: [] } });
  });
  await context.route('**/api/hang-hoa**', (route) => route.fulfill({ json: { duLieu: [] } }));
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();

  // Mặc định "Tháng này" đã được chọn — lần gọi đầu tiên không có nhóm nút "Tùy chỉnh" mở ra.
  await expect(page.getByRole('radio', { name: 'Tháng này' })).toBeChecked();
  await expect(page.getByLabel('Từ ngày')).toHaveCount(0);

  urlsDaGoi.length = 0;
  await page.getByRole('radio', { name: 'Tùy chỉnh' }).click();
  await page.getByLabel('Từ ngày').fill('2026-10-01');
  await page.getByLabel('Đến ngày').fill('2026-10-31');

  await expect
    .poll(() => urlsDaGoi.at(-1))
    .toContain(`tu=${encodeURIComponent('2026-09-30T17:00:00.000Z')}`);
  const urlCuoi = urlsDaGoi.at(-1) ?? '';
  expect(urlCuoi).toContain(`den=${encodeURIComponent('2026-10-31T16:59:59.999Z')}`);
});

// T-042 — In tem mã, mở ngay sau khi Hoàn thành (SPEC.md §6.2 bước 4). Giá
// trên tem phải là GIÁ BÁN của đơn vị đã chọn (260.000đ/hộp từ
// DON_VI_TINH_PANADOL), không phải đơn giá NHẬP gõ tay (16.000đ) — hai con số
// khác nhau cố tình dùng trong test để phân biệt chắc chắn. `window.print`
// được stub vì Playwright không in thật được (tiền lệ `ban-hang.spec.ts`).
test('in tem mã: mở ngay sau Hoàn thành, sửa số lượng tem, đổi khổ giấy, Enter gọi in (T-042)', async ({
  page,
  context,
}) => {
  await context.route('**/api/hang-hoa**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/api/hang-hoa/')
        ? { ...HANG_HOA_CHUNG, trangThai: 'HOAT_DONG', coTheXoaCung: true, quanLyLoGhiDe: 'KE_THUA' }
        : { duLieu: [HANG_HOA_CHUNG] },
    }),
  );
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));
  await context.route('**/api/phieu-nhap**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { duLieu: [] } });
    return route.fulfill({ status: 201, json: { id: 'pn-1', ma: 'PN000555', trangThai: 'HOAN_THANH' } });
  });
  await page.addInitScript(() => {
    (window as unknown as { __soLanIn: number }).__soLanIn = 0;
    window.print = () => {
      (window as unknown as { __soLanIn: number }).__soLanIn += 1;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();

  const oTim = page.getByPlaceholder('Tìm hàng hóa');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  const dongPhieu = page.locator('tbody tr');

  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('ArrowDown'); // sang dòng "hộp" — giá bán 260.000đ/hộp
  await page.keyboard.press('Enter');
  await dongPhieu.getByLabel(/Số lượng/).fill('2');
  await dongPhieu.getByLabel(/Đơn giá/).fill('16000'); // đơn giá NHẬP — khác giá bán trên tem

  await page.getByRole('button', { name: 'Hoàn thành' }).click();
  await expect(page.getByText('Đã hoàn thành phiếu nhập PN000555')).toBeVisible();

  const hopThoaiDanhSach = page.getByRole('dialog', { name: 'In tem mã' });
  await expect(hopThoaiDanhSach).toBeVisible();
  await expect(hopThoaiDanhSach).toContainText('SP000240');
  await expect(hopThoaiDanhSach).toContainText('Panadol Extra');
  await expect(hopThoaiDanhSach).toContainText('hộp'); // bước hỏi danh sách vẫn giữ dấu để nhận đúng hàng
  await expect(hopThoaiDanhSach.getByLabel(/Số lượng tem/)).toHaveValue('2');
  await expect(hopThoaiDanhSach).toContainText('Tổng số tem');

  // Sửa số lượng tem (độc lập với số lượng đã nhập) rồi sang bước xem trước.
  await hopThoaiDanhSach.getByLabel(/Số lượng tem/).fill('3');
  await page.getByRole('button', { name: 'In tem mã' }).click();

  const hopThoaiXemTruoc = page.getByRole('dialog', { name: 'Xem trước tem mã' });
  await expect(hopThoaiXemTruoc).toBeVisible();
  await expect(page.getByRole('radio', { name: /Cuộn 2 nhãn/ })).toBeChecked(); // mặc định
  const nutIn = page.getByRole('button', { name: 'In (Enter)' });
  await expect(nutIn).toBeFocused(); // tự focus lúc mở xem trước

  const dsTemHienThi = hopThoaiXemTruoc.locator('.in-tem-ma__tem');
  await expect(dsTemHienThi).toHaveCount(3); // đúng số lượng tem vừa sửa, không phải số lượng đã nhập
  await expect(dsTemHienThi.first()).toContainText('260,000'); // giá BÁN, không phải đơn giá nhập 16.000
  await expect(dsTemHienThi.first().locator('svg rect')).not.toHaveCount(0); // mã vạch đã render
  // Nội dung IN THẬT bỏ dấu tiếng Việt (máy in tem không in được chữ có dấu,
  // BACKLOG.md T-042) — "hộp" trên tem phải là "hop", không còn dấu nào.
  await expect(dsTemHienThi.first()).toContainText('VND/hop');
  await expect(dsTemHienThi.first()).not.toContainText('hộp');

  // Đổi khổ giấy — số lượng tem không đổi (focus rời nút In do bấm chuột vào radio).
  await page.getByRole('radio', { name: /Cuộn 1 nhãn/ }).check();
  await expect(dsTemHienThi).toHaveCount(3);

  await nutIn.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __soLanIn: number }).__soLanIn))
    .toBe(1);
});

test('in tem mã: "Bỏ qua" đóng ngay, không in; Lưu tạm không hỏi in tem (T-042)', async ({ page, context }) => {
  await context.route('**/api/hang-hoa**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/api/hang-hoa/')
        ? { ...HANG_HOA_CHUNG, trangThai: 'HOAT_DONG', coTheXoaCung: true, quanLyLoGhiDe: 'KE_THUA' }
        : { duLieu: [HANG_HOA_CHUNG] },
    }),
  );
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));
  await context.route('**/api/phieu-nhap**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { duLieu: [] } });
    const than = route.request().postDataJSON() as { hoanThanhNgay?: boolean };
    return route.fulfill({
      status: 201,
      json: { id: 'pn-1', ma: 'PN000556', trangThai: than.hoanThanhNgay ? 'HOAN_THANH' : 'PHIEU_TAM' },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();

  const oTim = page.getByPlaceholder('Tìm hàng hóa');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  const dongPhieu = page.locator('tbody tr');

  // Lưu tạm KHÔNG hỏi in tem — phiếu tạm chưa thật sự vào kho (SPEC.md §6.2).
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter');
  await expect(dongPhieu).toHaveCount(1); // đợi dòng vào phiếu (tra cứu quản lý lô bất đồng bộ) trước khi F6
  await page.keyboard.press('F6');
  await expect(page.getByText('Đã lưu tạm phiếu nhập PN000556')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'In tem mã' })).toHaveCount(0);

  // Hoàn thành thì hỏi in tem — "Bỏ qua" đóng ngay, ô tìm lấy lại được focus.
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter');
  await expect(dongPhieu).toHaveCount(1);
  await page.getByRole('button', { name: 'Hoàn thành' }).click();
  await expect(page.getByRole('dialog', { name: 'In tem mã' })).toBeVisible();

  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(page.getByRole('dialog', { name: 'In tem mã' })).toHaveCount(0);
  await expect(oTim).toBeFocused();
});
