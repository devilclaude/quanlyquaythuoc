import { test, expect } from './co-so';

// Màn Nhập hàng trên điện thoại (390px): trang không được tràn ngang, ô tìm và nút
// "Hoàn thành" phải nằm gọn trong màn hình; bảng dòng hàng cuộn ngang trong khung của nó.
const HANG = {
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
};

test.use({ viewport: { width: 390, height: 844 } });

test('nhập hàng trên điện thoại: giỏ nhập đủ rộng, panel xếp dưới, không tràn ngang', async ({ page, context }) => {
  await context.route('**/api/hang-hoa**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/api/hang-hoa/')
        ? { ...HANG, trangThai: 'HOAT_DONG', coTheXoaCung: true, quanLyLoGhiDe: 'BAT' }
        : { duLieu: [HANG] },
    }),
  );
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: true } }));
  await context.route('**/api/phieu-nhap**', (route) => route.fulfill({ json: { duLieu: [] } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();
  await page.getByPlaceholder('Tìm hàng hóa').pressSequentially('pana');
  await expect(page.getByRole('option')).toHaveCount(2);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('tbody tr')).toHaveCount(1);

  // Bảng dòng hàng phải đủ rộng để dùng được (không bị panel bên phải ép còn vài px)
  // và nằm TRÊN panel tổng tiền chứ không đứng cạnh nó.
  const khungBang = await page.locator('.ban-hang__gio').boundingBox();
  const panel = await page.locator('.ban-hang__panel').boundingBox();
  expect(khungBang!.width).toBeGreaterThanOrEqual(340);
  expect(panel!.y).toBeGreaterThanOrEqual(khungBang!.y + khungBang!.height - 1);
  await expect(page.locator('tbody tr')).toBeInViewport();

  const tranNgang = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(tranNgang).toBeLessThanOrEqual(0);

  for (const ten of ['Hoàn thành', 'Lưu tạm']) {
    const hop = await page.getByRole('button', { name: new RegExp(ten) }).boundingBox();
    expect(hop).not.toBeNull();
    expect(hop!.x).toBeGreaterThanOrEqual(0);
    expect(hop!.x + hop!.width).toBeLessThanOrEqual(390);
  }
  const oTim = await page.getByPlaceholder('Tìm hàng hóa').boundingBox();
  expect(oTim!.x + oTim!.width).toBeLessThanOrEqual(390);
});

test('danh sách phiếu nhập trên điện thoại: bộ lọc xếp trên danh sách, trang không tràn ngang', async ({
  page,
  context,
}) => {
  await context.route('**/api/phieu-nhap**', (route) => route.fulfill({ json: { duLieu: [] } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  await expect(page.getByRole('heading', { name: 'Nhập hàng', level: 1 })).toBeVisible();

  const tranNgang = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(tranNgang).toBeLessThanOrEqual(0);
  const boLoc = await page.locator('.danh-sach-phieu-nhap__bo-loc').boundingBox();
  const noiDung = await page.locator('.danh-sach-phieu-nhap__noi-dung').boundingBox();
  expect(noiDung!.y).toBeGreaterThanOrEqual(boLoc!.y + boLoc!.height - 1);
  expect(noiDung!.width).toBeGreaterThanOrEqual(340);
});
