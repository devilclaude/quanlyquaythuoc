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
  await context.route('**/api/phieu-nhap', async (route) => {
    soLanGoi += 1;
    thanGui = route.request().postDataJSON();
    const trangThai = thanGui?.hoanThanhNgay ? 'HOAN_THANH' : 'PHIEU_TAM';
    await route.fulfill({ status: 201, json: { id: 'pn-1', ma: 'PN000001', trangThai } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();

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
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();

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
