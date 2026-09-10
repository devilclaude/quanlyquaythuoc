import { test, expect } from '@playwright/test';

test('trang chủ tải được', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Quầy thuốc' })).toBeVisible();
});
