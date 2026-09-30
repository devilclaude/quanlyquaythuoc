import { test, expect, type BrowserContext, type Page } from '@playwright/test';

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

/** Dựng ngữ cảnh: chặn tìm/chi tiết hàng hoá, cài đặt lô (tắt), `POST
 * /api/phieu-nhap` (trả `thanGui` để assert); mở sẵn màn "Nhập hàng". */
async function dungManNhapHang(
  page: Page,
  context: BrowserContext,
  quanLyLoGhiDe: 'KE_THUA' | 'BAT' | 'TAT',
  phanHoiPhieu: { ma: string; trangThai: string },
): Promise<{ thanGui: () => { hoanThanhNgay?: boolean; dong: unknown[] } | undefined }> {
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
    thanGui = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { id: 'pn-1', ...phanHoiPhieu } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  return { thanGui: () => thanGui };
}

test('nhập hàng: tìm và thêm hàng vào phiếu bằng bàn phím, Lưu tạm gọi đúng API (T-040c1)', async ({
  page,
  context,
}) => {
  const { thanGui } = await dungManNhapHang(page, context, 'KE_THUA', { ma: 'PN000001', trangThai: 'PHIEU_TAM' });

  const oTim = page.getByPlaceholder('Tìm hàng hóa');
  await expect(oTim).toBeFocused();
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');

  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('ArrowDown'); // sang dòng "hộp"
  await page.keyboard.press('Enter');

  await expect(goiYOption).toHaveCount(0);
  await expect(oTim).toHaveValue('');
  await expect(oTim).toBeFocused();

  const dongPhieu = page.locator('tbody tr');
  await expect(dongPhieu).toHaveCount(1);
  await expect(dongPhieu).toContainText('SP000240');
  await expect(dongPhieu).toContainText('hộp');
  // Tắt quản lý lô (toàn cục tắt + ghi đè "kế thừa") — KHÔNG có cột Số lô/Hạn dùng.
  await expect(page.getByText('Số lô')).toHaveCount(0);

  await dongPhieu.getByLabel(/Số lượng/).fill('5');
  await dongPhieu.getByLabel(/Đơn giá/).fill('16000');
  await expect(dongPhieu).toContainText('80,000'); // 5 × 16.000

  await page.keyboard.press('F6'); // UI-FIDELITY.md nhóm 2, cột Nhập: F6 = Lưu tạm
  await expect(page.getByText('Đã lưu tạm phiếu nhập PN000001')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);

  expect(thanGui()?.hoanThanhNgay).toBe(false);
  expect(thanGui()?.dong).toEqual([{ sanPhamId: 'sp-1', donViTen: 'hộp', heSo: 15, donGia: 16000, soLuong: 5 }]);
});

test('nhập hàng: sản phẩm bật quản lý lô hiện ô Số lô/Hạn dùng, thiếu thì bị chặn, đủ thì Hoàn thành gọi đúng API (T-040c1)', async ({
  page,
  context,
}) => {
  const { thanGui } = await dungManNhapHang(page, context, 'BAT', { ma: 'PN000002', trangThai: 'HOAN_THANH' });

  const oTim = page.getByPlaceholder('Tìm hàng hóa');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // dòng đầu (vỉ)

  const dongPhieu = page.locator('tbody tr');
  await expect(dongPhieu).toHaveCount(1);
  // Ghi đè sản phẩm "BAT" — hiện cột Số lô/Hạn dùng dù cài đặt toàn cục đang tắt.
  await expect(page.getByText('Số lô')).toBeVisible();
  await expect(page.getByText('Hạn dùng')).toBeVisible();
  await dongPhieu.getByLabel(/Đơn giá/).fill('16000');

  // Bấm Hoàn thành khi CHƯA khai lô/HSD — bị chặn ngay ở client, không gọi API.
  await page.getByRole('button', { name: 'Hoàn thành' }).click();
  await expect(page.getByText(/thiếu số lô/)).toBeVisible();
  expect(thanGui()).toBeUndefined();

  // Khai đủ lô + hạn dùng rồi Hoàn thành lại — gọi đúng API với hoanThanhNgay=true.
  await dongPhieu.getByLabel(/Số lô/).fill('L01');
  await dongPhieu.getByLabel(/Hạn dùng/).fill('2027-06-30');
  await page.getByRole('button', { name: 'Hoàn thành' }).click();

  await expect(page.getByText('Đã hoàn thành phiếu nhập PN000002')).toBeVisible();
  expect(thanGui()?.hoanThanhNgay).toBe(true);
  expect(thanGui()?.dong).toEqual([
    { sanPhamId: 'sp-1', donViTen: 'vỉ', heSo: 1, donGia: 16000, soLuong: 1, soLo: 'L01', hsd: '2027-06-30' },
  ]);
});
