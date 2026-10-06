import { test, expect } from '@playwright/test';

// T-053c1 — Danh sách + chi tiết (CHỈ ĐỌC) trả hàng nhập, cùng khuôn
// `tra-hang.spec.ts` (T-052c). `context.route` (không phải `page.route`) vì SW
// (T-030) tự fetch — cùng quy ước `nhap-hang.spec.ts`. T-053c2 — luồng tạo
// ("+ Trả hàng nhập") và liên kết ngược chiều "phiếu nhập → trả hàng nhập"
// (nút "Trả hàng nhập" ở chân `ChiTietPhieuNhap`) thêm ở hai test dưới cùng.

const DANH_SACH_TRA_HANG_NHAP = [
  { id: 'thn-1', ma: 'THN000001', phieuNhapId: 'pn-1', phieuNhapMa: 'PN000001', chiNhanhId: 'cn-1', thoiGian: '2026-05-18T11:41:00.000Z', tongTienHoan: 960_000 },
];

const TRA_HANG_NHAP_CHI_TIET = {
  ...DANH_SACH_TRA_HANG_NHAP[0],
  dong: [{ id: 'thnd-1', phieuNhapDongId: 'pnd-1', sanPhamId: 'sp-1', maHang: 'SP004007', ten: 'mama dha plus nhất nguyên', soLuong: 10, tienHoan: 960_000 }],
};

const PHIEU_NHAP_PN000001 = {
  id: 'pn-1',
  ma: 'PN000001',
  chiNhanhId: 'cn-1',
  trangThai: 'HOAN_THANH',
  thoiGian: '2026-05-18T10:00:00.000Z',
  tongTien: 960_000,
  dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', maHang: 'SP004007', ten: 'mama dha plus nhất nguyên', donViTen: 'hộp', heSo: 1, donGia: 96_000, soLuong: 10, soLo: null, hsd: null }],
};

test('trả hàng nhập: danh sách lọc theo mã, mở chi tiết, rồi mở lại phiếu nhập gốc (liên kết ngược, T-053c1)', async ({ page, context }) => {
  await context.route('**/api/tra-hang-nhap', (route) => route.fulfill({ json: { duLieu: DANH_SACH_TRA_HANG_NHAP } }));
  await context.route('**/api/tra-hang-nhap/thn-1', (route) => route.fulfill({ json: TRA_HANG_NHAP_CHI_TIET }));
  await context.route('**/api/phieu-nhap/pn-1', (route) => route.fulfill({ json: PHIEU_NHAP_PN000001 }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Trả hàng nhập' }).click();
  await expect(page.getByText('THN000001')).toBeVisible();

  // Lọc ngay trên dữ liệu đã tải — gõ mã không khớp thì ẩn dòng.
  await page.getByPlaceholder('Theo mã phiếu trả').fill('THN999999');
  await expect(page.getByText('Không có phiếu trả hàng nhập nào')).toBeVisible();
  await page.getByPlaceholder('Theo mã phiếu trả').fill('THN0000');
  await expect(page.getByText('THN000001')).toBeVisible();

  await page.getByText('THN000001').click();
  await expect(page.getByText('Số lượng mặt hàng')).toBeVisible();
  await expect(page.getByText('960,000').first()).toBeVisible();

  // Liên kết ngược: bấm mã phiếu nhập trong chi tiết mở lại đúng phiếu nhập gốc.
  await page.getByRole('button', { name: 'PN000001', exact: true }).click();
  await expect(page.getByText('Tổng tiền hàng')).toBeVisible();
  await expect(page.getByText('SP004007')).toHaveCount(2); // dòng trong chi tiết trả hàng nhập + dòng trong phiếu nhập gốc vừa mở
});

const PHIEU_NHAP_PN000002 = {
  id: 'pn-2',
  ma: 'PN000002',
  chiNhanhId: 'cn-1',
  trangThai: 'HOAN_THANH',
  thoiGian: '2026-06-01T05:00:00.000Z',
  tongTien: 1_500_000,
  dong: [{ id: 'pnd-2', sanPhamId: 'sp-2', maHang: 'SP000240', ten: 'Panadol Extra', donViTen: 'hộp', heSo: 15, donGia: 100_000, soLuong: 10, soLo: null, hsd: null }],
};

const PHIEU_NHAP_DE_TRA_PN000002 = {
  id: 'pn-2',
  ma: 'PN000002',
  thoiGian: '2026-06-01T05:00:00.000Z',
  dong: [{ id: 'pnd-2', sanPhamId: 'sp-2', maHang: 'SP000240', ten: 'Panadol Extra', donViTen: 'hộp', heSo: 15, soLuongDaNhap: 10, conLaiToiDa: 6 }],
};

const TRA_HANG_NHAP_THN000002 = {
  id: 'thn-2',
  ma: 'THN000002',
  phieuNhapId: 'pn-2',
  phieuNhapMa: 'PN000002',
  chiNhanhId: 'cn-1',
  thoiGian: '2026-06-02T05:00:00.000Z',
  tongTienHoan: 200_000,
};

const TRA_HANG_NHAP_CHI_TIET_2 = {
  ...TRA_HANG_NHAP_THN000002,
  dong: [{ id: 'thnd-2', phieuNhapDongId: 'pnd-2', sanPhamId: 'sp-2', maHang: 'SP000240', ten: 'Panadol Extra', soLuong: 30, tienHoan: 200_000 }],
};

test('trả hàng nhập: luồng tạo — tìm phiếu nhập, chặn nhập vượt "còn trả được", quy đổi đúng đơn vị, lưu xong mở sẵn chi tiết (T-053c2)', async ({
  page,
  context,
}) => {
  let thanGui: { phieuNhapId?: string; dong?: unknown[] } | undefined;
  let dsTraHangNhap: unknown[] = [];

  await context.route('**/api/tra-hang-nhap/phieu-nhap/PN000002', (route) => route.fulfill({ json: PHIEU_NHAP_DE_TRA_PN000002 }));
  await context.route('**/api/tra-hang-nhap/thn-2', (route) => route.fulfill({ json: TRA_HANG_NHAP_CHI_TIET_2 }));
  // `**` cuối để khớp cả GET danh sách lẫn POST tạo phiếu trên cùng đường dẫn.
  await context.route('**/api/tra-hang-nhap', async (route) => {
    if (route.request().method() === 'POST') {
      thanGui = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: TRA_HANG_NHAP_THN000002 });
      dsTraHangNhap = [...dsTraHangNhap, TRA_HANG_NHAP_THN000002];
      return;
    }
    await route.fulfill({ json: { duLieu: dsTraHangNhap } });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Trả hàng nhập' }).click();
  await page.getByRole('button', { name: '+ Trả hàng nhập' }).click();

  await page.getByPlaceholder('Mã phiếu nhập').fill('PN000002');
  await page.getByRole('button', { name: 'Tìm' }).click();
  await expect(page.getByText('PN000002')).toBeVisible();
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

  expect(thanGui).toEqual({ phieuNhapId: 'pn-2', dong: [{ phieuNhapDongId: 'pnd-2', soLuong: 30 }] });

  // Lưu xong quay về danh sách, tải lại và mở sẵn chi tiết phiếu vừa tạo.
  await expect(page.getByPlaceholder('Theo mã phiếu trả')).toBeVisible();
  await expect(page.getByRole('button', { name: /THN000002/ })).toBeVisible(); // dòng trong danh sách
  await expect(page.getByRole('heading', { name: 'THN000002' })).toBeVisible(); // chi tiết đã mở sẵn
  await expect(page.getByText('200,000').first()).toBeVisible();
});

test('trả hàng nhập: liên kết ngược chiều từ chi tiết phiếu nhập — nút "Trả hàng nhập" nhảy sang màn trả hàng nhập, điền sẵn mã và tự tra cứu (T-053c2)', async ({
  page,
  context,
}) => {
  await context.route('**/api/phieu-nhap**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/phieu-nhap/pn-2')) {
      await route.fulfill({ json: PHIEU_NHAP_PN000002 });
    } else {
      await route.fulfill({ json: { duLieu: [PHIEU_NHAP_PN000002] } });
    }
  });
  await context.route('**/api/tra-hang-nhap/phieu-nhap/PN000002', (route) => route.fulfill({ json: PHIEU_NHAP_DE_TRA_PN000002 }));
  await context.route('**/api/tra-hang-nhap', (route) => route.fulfill({ json: { duLieu: [] } }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  await page.getByRole('button', { name: /PN000002/ }).click();
  await expect(page.getByText('Panadol Extra (hộp)')).toBeVisible();

  // Nút ở chân chi tiết — tên trùng nav tab "Trả hàng nhập" nên khoanh vùng theo khung chi tiết.
  await page.locator('.thong-tin-phieu-nhap').getByRole('button', { name: 'Trả hàng nhập' }).click();

  // Nhảy sang màn Trả hàng nhập, luồng tạo mở sẵn, mã đã điền và TỰ tra cứu — không cần bấm Tìm.
  await expect(page.getByPlaceholder('Mã phiếu nhập')).toHaveValue('PN000002');
  await expect(page.getByLabel('Số lượng trả Panadol Extra')).toBeVisible();
});
