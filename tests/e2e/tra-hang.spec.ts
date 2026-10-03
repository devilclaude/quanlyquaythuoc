import { test, expect } from '@playwright/test';

// T-052c — Danh sách + chi tiết trả hàng (CHỈ ĐỌC — luồng tạo chẻ sang task
// mới, xem BACKLOG.md). `context.route` (không phải `page.route`) vì SW
// (T-030) tự fetch — cùng quy ước `nhap-hang.spec.ts`.

const DANH_SACH_TRA_HANG = [
  { id: 'th-1', ma: 'TH000001', hoaDonId: 'hd-1', hoaDonMa: 'HD000001', chiNhanhId: 'cn-1', thoiGian: '2026-05-17T05:29:00.000Z', tongTienHoan: 32_000 },
];

const TRA_HANG_CHI_TIET = {
  ...DANH_SACH_TRA_HANG[0],
  dong: [{ id: 'thd-1', hoaDonDongId: 'hdd-1', sanPhamId: 'sp-1', maHang: 'SP004085', ten: 'Long huyết btg gold', soLuong: 2, tienHoan: 32_000 }],
};

const HOA_DON_HD000001 = {
  id: 'hd-1',
  ma: 'HD000001',
  thoiGian: '2026-05-17T05:00:00.000Z',
  dong: [
    { id: 'hdd-1', sanPhamId: 'sp-1', maHang: 'SP004085', ten: 'Long huyết btg gold', donViTen: 'vỉ', heSo: 1, soLuongDaBan: 3, conLaiToiDa: 1 },
  ],
};

test('trả hàng: danh sách lọc theo mã, mở chi tiết, rồi mở lại hoá đơn gốc (liên kết ngược, T-052c)', async ({ page, context }) => {
  await context.route('**/api/tra-hang', (route) => route.fulfill({ json: { duLieu: DANH_SACH_TRA_HANG } }));
  await context.route('**/api/tra-hang/th-1', (route) => route.fulfill({ json: TRA_HANG_CHI_TIET }));
  await context.route('**/api/tra-hang/hoa-don/HD000001', (route) => route.fulfill({ json: HOA_DON_HD000001 }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Trả hàng' }).click();
  await expect(page.getByText('TH000001')).toBeVisible();

  // Lọc ngay trên dữ liệu đã tải — gõ mã không khớp thì ẩn dòng.
  await page.getByPlaceholder('Theo mã phiếu trả').fill('TH999999');
  await expect(page.getByText('Không có phiếu trả hàng nào')).toBeVisible();
  await page.getByPlaceholder('Theo mã phiếu trả').fill('TH0000');
  await expect(page.getByText('TH000001')).toBeVisible();

  await page.getByText('TH000001').click();
  await expect(page.getByText('Số lượng mặt hàng')).toBeVisible();
  await expect(page.getByText('32,000').first()).toBeVisible();

  // Liên kết ngược: bấm mã hoá đơn trong chi tiết mở lại đúng hoá đơn gốc.
  await page.getByRole('button', { name: 'HD000001', exact: true }).click();
  await expect(page.getByText('Còn trả được')).toBeVisible();
  await expect(page.getByText('SP004085')).toHaveCount(2); // dòng trong chi tiết trả hàng + dòng trong hoá đơn gốc vừa mở
});
