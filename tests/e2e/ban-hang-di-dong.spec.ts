import { test, expect } from './co-so';

// Màn Bán hàng trên điện thoại (390px): giỏ không bị panel Thanh toán ép mất, panel
// xếp dưới giỏ, thanh trên không làm trang tràn ngang.
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

test('bán hàng trên điện thoại: giỏ đủ rộng, panel thanh toán xếp dưới, không tràn ngang', async ({
  page,
  context,
}) => {
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: { duLieu: [HANG] } }));
  await page.goto('/');
  await page.getByPlaceholder('Tìm hàng hóa (F3)').pressSequentially('pana');
  await expect(page.getByRole('option')).toHaveCount(2);
  await page.keyboard.press('Enter');
  await expect(page.locator('tbody tr')).toHaveCount(1);

  const khungGio = await page.locator('.ban-hang__gio').boundingBox();
  const panel = await page.locator('.ban-hang__panel').boundingBox();
  expect(khungGio!.width).toBeGreaterThanOrEqual(340);
  expect(panel!.y).toBeGreaterThanOrEqual(khungGio!.y + khungGio!.height - 1);

  const tranNgang = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(tranNgang).toBeLessThanOrEqual(0);
  const nutThanhToan = await page.getByRole('button', { name: /Thanh toán/ }).boundingBox();
  expect(nutThanhToan!.x + nutThanhToan!.width).toBeLessThanOrEqual(390);
});

test('hàng hoá trên điện thoại: chi tiết hàng nằm gọn trong màn hình, không bị cắt phải', async ({ page, context }) => {
  await context.route('**/api/hang-hoa**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/api/hang-hoa/')
        ? { ...HANG, trangThai: 'HOAT_DONG', coTheXoaCung: true, quanLyLoGhiDe: 'KE_THUA' }
        : { duLieu: [HANG] },
    }),
  );
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Hàng hoá', exact: true }).click();
  await page.getByText('SP000240').click();
  const tieuDe = page.getByRole('heading', { name: HANG.ten });
  await expect(tieuDe).toBeVisible();
  const hop = await tieuDe.boundingBox();
  expect(hop!.x + hop!.width).toBeLessThanOrEqual(390);
  const bangDonVi = await page.locator('.thong-tin-hang-hoa table').first().boundingBox();
  expect(bangDonVi!.x + bangDonVi!.width).toBeLessThanOrEqual(390);
});

test('menu trên điện thoại: thu gọn sau nút Menu, chọn màn xong tự đóng', async ({ page, context }) => {
  await context.route('**/api/hang-hoa**', (route) => route.fulfill({ json: { duLieu: [] } }));
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: 'Chuyển màn hình' });
  const nutMenu = menu.getByRole('button', { name: 'Menu' });
  const muc = menu.getByRole('button', { name: 'Hàng hoá', exact: true });

  await expect(muc).toBeHidden();
  await expect(nutMenu).toHaveAttribute('aria-expanded', 'false');
  expect((await menu.boundingBox())!.height).toBeLessThan(80);

  await nutMenu.click();
  await expect(nutMenu).toHaveAttribute('aria-expanded', 'true');
  await expect(muc).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();

  await muc.click();
  await expect(muc).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Hàng hóa', level: 1 })).toBeVisible();
  await expect(menu.locator('.app__man-hien-tai')).toHaveText('Hàng hoá');
});
