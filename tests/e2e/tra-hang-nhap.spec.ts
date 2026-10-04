import { test, expect } from '@playwright/test';

// T-053c1 — Danh sách + chi tiết (CHỈ ĐỌC) trả hàng nhập, cùng khuôn
// `tra-hang.spec.ts` (T-052c). `context.route` (không phải `page.route`) vì SW
// (T-030) tự fetch — cùng quy ước `nhap-hang.spec.ts`. Luồng tạo + liên kết
// ngược chiều "phiếu nhập → trả hàng nhập" thuộc T-053c2 — xem ghi chú chẻ ở
// `DanhSachTraHangNhap.tsx`.

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
