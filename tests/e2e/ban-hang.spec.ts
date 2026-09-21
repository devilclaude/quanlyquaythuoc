import { test, expect } from '@playwright/test';

// T-020 — luồng bán hàng bằng bàn phím CHỈ được kiểm ở tầng e2e
// (ARCHITECTURE.md §7: "luồng bán hàng bằng bàn phím là ràng buộc không
// thương lượng ... chỉ được kiểm ở tầng e2e"). `vite preview` chỉ phục vụ
// client tĩnh, không có server API thật phía sau — chặn `/api/hang-hoa` để
// giả một kết quả tìm kiếm cố định, không cần dựng CSDL cho e2e.
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
      donViTinh: [
        { id: 'dvt-vi', ten: 'vỉ', heSo: 1, laCoSo: true, giaBan: 17000 },
        { id: 'dvt-hop', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 },
      ],
    },
  ],
};

test('bán hàng: tìm và thêm hàng vào giỏ hoàn toàn bằng bàn phím (T-020)', async ({ page }) => {
  await page.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  await expect(oTim).toBeFocused();
  // Gợi ý tìm hàng — role "option" của trình đọc màn hình cũng khớp mọi
  // <option> trong dropdown đổi đơn vị của dòng giỏ hàng (T-021), nên phải
  // khoanh vùng vào đúng listbox gợi ý, không dùng getByRole('option') trần.
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');

  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);

  // Dòng đầu (vỉ) đang chọn sẵn; ArrowDown sang dòng hộp rồi Enter để thêm —
  // không chạm chuột từ đầu tới cuối.
  await page.keyboard.press('ArrowDown');
  await expect(goiYOption.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');

  await expect(goiYOption).toHaveCount(0);
  await expect(oTim).toHaveValue('');
  await expect(oTim).toBeFocused();

  const dongGio = page.locator('tbody tr');
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText('SP000240');
  await expect(dongGio).toContainText('hộp');
  await expect(dongGio).toContainText('260,000');

  await expect(page.getByText('Khách cần trả')).toBeVisible();
  await expect(page.locator('.ban-hang__hang--can-tra .so')).toHaveText('260,000');
  // Khớp ảnh KiotViet: dòng "Tổng tiền hàng" hiện cả số món lẫn tổng tiền.
  await expect(page.getByText('Tổng tiền hàng')).toContainText('1');

  // F3 lấy lại focus ô tìm dù đang ở đâu trên trang (UI-FIDELITY.md nhóm 1).
  await oTim.blur();
  await expect(oTim).not.toBeFocused();
  await page.keyboard.press('F3');
  await expect(oTim).toBeFocused();
});

test('bán hàng: đổi đơn vị và sửa số lượng dòng giỏ hàng hoàn toàn bằng bàn phím (T-021)', async ({ page }) => {
  await page.route('**/api/hang-hoa*', (route) => route.fulfill({ json: DU_LIEU_TIM }));
  await page.goto('/');

  const oTim = page.getByPlaceholder('Tìm hàng hóa (F3)');
  const goiYOption = page.getByRole('listbox', { name: 'Gợi ý hàng hoá' }).getByRole('option');
  await oTim.pressSequentially('pana');
  await expect(goiYOption).toHaveCount(2);
  await page.keyboard.press('Enter'); // dòng đầu (vỉ) đang chọn sẵn trong gợi ý

  const dongGio = page.locator('tbody tr');
  await expect(dongGio).toHaveCount(1);
  await expect(dongGio).toContainText('vỉ');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');

  // F2: dòng vừa thêm tự động là "dòng đang chọn" — đổi sang đơn vị kế tiếp
  // (hộp), giá lấy thẳng từ đơn vị mới, không nhân hệ số.
  await page.keyboard.press('F2');
  await expect(dongGio).toContainText('hộp');
  await expect(dongGio).toContainText('260,000');
  await expect(page.locator('.ban-hang__hang--can-tra .so')).toHaveText('260,000');

  // '+' tăng số lượng dòng đang chọn.
  await page.keyboard.press('+');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('2');
  await expect(page.locator('.ban-hang__hang--can-tra .so')).toHaveText('520,000');

  // '-' giảm lại, không xuống dưới 1.
  await page.keyboard.press('-');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');
  await page.keyboard.press('-');
  await expect(dongGio.locator('input[type="number"]')).toHaveValue('1');

  // Delete xoá dòng đang chọn — giỏ về rỗng, hướng dẫn F3 hiện lại.
  await page.keyboard.press('Delete');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect(page.getByText('Chưa có hàng trong đơn.')).toBeVisible();
});
