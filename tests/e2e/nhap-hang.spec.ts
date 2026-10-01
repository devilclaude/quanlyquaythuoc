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
  // `**` cuối cùng để khớp cả GET danh sách (T-041, kèm `?tim=`/`?trangThai=`…
  // từ bộ lọc) lẫn POST tạo phiếu (T-040c1) trên cùng đường dẫn.
  await context.route('**/api/phieu-nhap**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { duLieu: [] } });
      return;
    }
    soLanGoi += 1;
    thanGui = route.request().postDataJSON();
    const trangThai = thanGui?.hoanThanhNgay ? 'HOAN_THANH' : 'PHIEU_TAM';
    await route.fulfill({ status: 201, json: { id: 'pn-1', ma: 'PN000001', trangThai } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();
  // T-041: nav "Nhập hàng" vào DANH SÁCH trước — "+ Nhập hàng" mới mở luồng tạo tay.
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();

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

test('danh sách nhập hàng: xem danh sách, mở chi tiết ngay dưới dòng, quay lại danh sách sau khi vào "+ Nhập hàng" (T-041)', async ({
  page,
  context,
}) => {
  const PHIEU_MAU = {
    id: 'pn-1',
    ma: 'PN002221',
    chiNhanhId: 'cn-1',
    trangThai: 'HOAN_THANH',
    thoiGian: '2026-05-17T03:58:00.000Z',
    tongTien: 11_898_000,
  };
  await context.route('**/api/phieu-nhap**', async (route) => {
    const url = route.request().url();
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 201, json: { id: 'pn-moi', ma: 'PN000002', trangThai: 'PHIEU_TAM' } });
      return;
    }
    if (url.includes('/api/phieu-nhap/pn-1')) {
      await route.fulfill({
        json: {
          ...PHIEU_MAU,
          dong: [
            {
              id: 'pnd-1',
              sanPhamId: 'sp-1',
              maHang: 'SP000125',
              ten: 'Betaloc 50mg',
              donViTen: 'hộp',
              heSo: 1,
              donGia: 142_000,
              soLuong: 2,
              soLo: null,
              hsd: null,
            },
          ],
        },
      });
      return;
    }
    await route.fulfill({ json: { duLieu: [PHIEU_MAU] } });
  });
  await context.route('**/api/hang-hoa**', (route) => route.fulfill({ json: { duLieu: [] } }));
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Nhập hàng' }).click();

  // Cột khớp screenshot "Danh sách nhập hàng": Mã nhập hàng, Thời gian, Tổng tiền, Trạng thái.
  const dongPhieu = page.getByRole('button', { name: /PN002221/ });
  await expect(dongPhieu).toContainText('11,898,000');
  await expect(dongPhieu).toContainText('Đã nhập hàng');

  // Bấm dòng mở chi tiết NGAY DƯỚI dòng đó, khớp luồng KiotViet.
  await dongPhieu.click();
  await expect(page.getByText('Betaloc 50mg')).toBeVisible();
  await expect(page.getByText('284,000')).toBeVisible(); // 142.000 × 2

  // "+ Nhập hàng" mở luồng tạo tay (T-040c1); quay lại thấy lại đúng danh sách.
  await page.getByRole('button', { name: '+ Nhập hàng' }).click();
  await expect(page.getByPlaceholder('Tìm hàng hóa')).toBeVisible();
  await page.getByRole('button', { name: '← Danh sách nhập hàng' }).click();
  await expect(dongPhieu).toBeVisible();
});
