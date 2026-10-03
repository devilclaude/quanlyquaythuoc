import { test, expect } from '@playwright/test';

// T-052c — Danh sách + chi tiết trả hàng. T-052d — luồng tạo (chẻ khỏi
// T-052c, xem BACKLOG.md). `context.route` (không phải `page.route`) vì SW
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

const HOA_DON_HD000002 = {
  id: 'hd-2',
  ma: 'HD000002',
  thoiGian: '2026-06-01T05:00:00.000Z',
  dong: [
    { id: 'hdd-2', sanPhamId: 'sp-2', maHang: 'SP000240', ten: 'Panadol Extra', donViTen: 'hộp', heSo: 15, soLuongDaBan: 10, conLaiToiDa: 6 },
  ],
};

const TRA_HANG_TH000002 = {
  id: 'th-2',
  ma: 'TH000002',
  hoaDonId: 'hd-2',
  hoaDonMa: 'HD000002',
  chiNhanhId: 'cn-1',
  thoiGian: '2026-06-02T05:00:00.000Z',
  tongTienHoan: 60_000,
};

const TRA_HANG_CHI_TIET_2 = {
  ...TRA_HANG_TH000002,
  dong: [{ id: 'thd-2', hoaDonDongId: 'hdd-2', sanPhamId: 'sp-2', maHang: 'SP000240', ten: 'Panadol Extra', soLuong: 30, tienHoan: 60_000 }],
};

test('trả hàng: luồng tạo — tìm hoá đơn, chặn nhập vượt "còn trả được", quy đổi đúng đơn vị, lưu xong mở sẵn chi tiết (T-052d)', async ({
  page,
  context,
}) => {
  let thanGui: { hoaDonId?: string; dong?: unknown[] } | undefined;
  let dsTraHang = [...DANH_SACH_TRA_HANG];

  await context.route('**/api/tra-hang/hoa-don/HD000002', (route) => route.fulfill({ json: HOA_DON_HD000002 }));
  await context.route('**/api/tra-hang/th-2', (route) => route.fulfill({ json: TRA_HANG_CHI_TIET_2 }));
  // `**` cuối để khớp cả GET danh sách lẫn POST tạo phiếu trên cùng đường dẫn.
  await context.route('**/api/tra-hang', async (route) => {
    if (route.request().method() === 'POST') {
      thanGui = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: TRA_HANG_TH000002 });
      dsTraHang = [...dsTraHang, TRA_HANG_TH000002];
      return;
    }
    await route.fulfill({ json: { duLieu: dsTraHang } });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Trả hàng' }).click();
  await page.getByRole('button', { name: '+ Trả hàng' }).click();

  await page.getByPlaceholder('Mã hoá đơn').fill('HD000002');
  await page.getByRole('button', { name: 'Tìm' }).click();
  await expect(page.getByText('HD000002')).toBeVisible();
  await expect(page.getByText('Panadol Extra (hộp)')).toBeVisible();

  const oSoLuongTra = page.getByLabel('Số lượng trả Panadol Extra');

  // Chưa nhập gì mà bấm Lưu thì báo lỗi, không gọi API.
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Chưa nhập số lượng trả cho dòng nào')).toBeVisible();
  expect(thanGui).toBeUndefined();

  // Nhập vượt "còn trả được tối đa" (6) bị chặn ở client — giá trị không đổi.
  await oSoLuongTra.fill('7');
  await expect(oSoLuongTra).toHaveValue('0');

  // Nhập hợp lệ (2 hộp) rồi Lưu — quy đổi đúng sang đơn vị cơ sở (2 × 15 = 30 viên).
  await oSoLuongTra.fill('2');
  await expect(oSoLuongTra).toHaveValue('2');
  await page.getByRole('button', { name: 'Lưu' }).click();

  expect(thanGui).toEqual({ hoaDonId: 'hd-2', dong: [{ hoaDonDongId: 'hdd-2', soLuong: 30 }] });

  // Lưu xong quay về danh sách, tải lại và mở sẵn chi tiết phiếu vừa tạo.
  await expect(page.getByPlaceholder('Theo mã phiếu trả')).toBeVisible();
  await expect(page.getByText('TH000002')).toBeVisible();
  await expect(page.getByText('60,000').first()).toBeVisible();
});
