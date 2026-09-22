import { test, expect } from '@playwright/test';

// T-030 — Vỏ PWA và chỉ báo trạng thái. Chuyển đổi online/offline thật (sự
// kiện trình duyệt qua `navigator.onLine`) và service worker chỉ kiểm được ở
// tầng e2e (không mock được bằng renderToStaticMarkup — xem
// src/client/offline/*.test.tsx).
//
// Chặn `/api/hang-hoa` bằng `context.route` (không phải `page.route`) —
// runtime cache của service worker (vite.config.ts) tự gọi `fetch` bên trong
// tiến trình SW, `page.route` không chặn được request đó (xem ghi chú đầu
// tests/e2e/ban-hang.spec.ts, cùng phát hiện khi T-030 thêm SW).
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
      donViTinh: [{ id: 'dvt-vi', ten: 'vỉ', heSo: 1, laCoSo: true, giaBan: 17000 }],
    },
  ],
};

test('chỉ báo trạng thái đổi ngay khi mất mạng, không popup chặn màn hình và không mất giỏ hàng đang gõ dở (T-030)', async ({
  page,
  context,
}) => {
  let coPopup = false;
  page.on('dialog', (dialog) => {
    coPopup = true;
    void dialog.dismiss();
  });

  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  await page.goto('/');

  await expect(page.getByText('Đang online')).toBeVisible();
  await expect(page.getByText('Chưa đồng bộ lần nào')).toBeVisible();

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(1);
  await page.keyboard.press('Enter');

  const dongGio = page.locator('tbody tr');
  await expect(dongGio).toHaveCount(1);

  await context.setOffline(true);
  await expect(page.getByText('Đang offline')).toBeVisible();

  // Giỏ hàng đang gõ dở không được mất khi chuyển chế độ (SPEC.md §5.5).
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText('SP000240');
  expect(coPopup).toBe(false);

  await context.setOffline(false);
  await expect(page.getByText('Đang online')).toBeVisible();
});

test('vỏ app tải được khi mất mạng nhờ service worker cache (T-030)', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quầy thuốc' })).toBeVisible();

  // Đợi service worker claim trang (workbox `clientsClaim: true` trong
  // vite.config.ts) — tránh flaky do trang chưa được cache kiểm soát trước
  // khi ngắt mạng.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Quầy thuốc' })).toBeVisible();

  await context.setOffline(false);
});
