import { expect, test, type BrowserContext } from '@playwright/test';

// Spec đăng nhập dùng `test` GỐC (không phải ./co-so) vì tự điều khiển
// `GET /api/auth/toi`. `context.route` (không phải `page.route`) vì service worker
// tự gọi fetch — cùng lý do ghi ở các spec khác.
const ADMIN = { id: 'u-admin', tenDangNhap: 'admin', tenHienThi: 'Chủ quầy', vaiTro: 'ADMIN' };
const NHAN_VIEN = { id: 'u-lan', tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN' };

interface MayChuGia {
  nguoi: typeof ADMIN | typeof NHAN_VIEN | null;
  daGoiDangXuat: number;
}

/** Máy chủ giả: `toi` theo `nguoi`, `dang-nhap` đúng khi mật khẩu là `mat-khau-dai-du`. */
async function dungMayChuGia(
  context: BrowserContext,
  nguoiSauDangNhap: typeof ADMIN | typeof NHAN_VIEN = ADMIN,
): Promise<MayChuGia> {
  const mayChu: MayChuGia = { nguoi: null, daGoiDangXuat: 0 };

  await context.route('**/api/auth/toi', (route) =>
    mayChu.nguoi ? route.fulfill({ json: mayChu.nguoi }) : route.fulfill({ status: 401, json: { loi: 'Chưa đăng nhập' } }),
  );
  await context.route('**/api/auth/dang-nhap', (route) => {
    const body = route.request().postDataJSON() as { matKhau: string };
    if (body.matKhau === 'mat-khau-dai-du') {
      mayChu.nguoi = nguoiSauDangNhap;
      return route.fulfill({ json: nguoiSauDangNhap });
    }
    return route.fulfill({ status: 401, json: { loi: 'Sai tên đăng nhập hoặc mật khẩu' } });
  });
  await context.route('**/api/auth/dang-xuat', (route) => {
    mayChu.nguoi = null;
    mayChu.daGoiDangXuat += 1;
    return route.fulfill({ status: 204 });
  });
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ json: { duLieu: [] } }));
  return mayChu;
}

test('chưa đăng nhập: thấy màn đăng nhập, không lộ menu; nhập sai báo lỗi, nhập đúng bằng Enter vào được app', async ({
  page,
  context,
}) => {
  await dungMayChuGia(context);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nhập hàng' })).toHaveCount(0);
  // Chưa từng đăng nhập thì không được hiện "Phiên đã hết hạn".
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('Tên đăng nhập').fill('admin');
  await page.getByLabel('Mật khẩu').fill('sai-sai-sai');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('alert')).toHaveText('Sai tên đăng nhập hoặc mật khẩu');
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();

  await page.getByLabel('Mật khẩu').fill('mat-khau-dai-du');
  await page.getByLabel('Mật khẩu').press('Enter');

  await expect(page.getByRole('button', { name: 'Bán hàng' })).toBeVisible();
  await expect(page.getByText('Chủ quầy · Quản trị')).toBeVisible();
});

test('admin thấy đủ 7 mục menu', async ({ page, context }) => {
  const mayChu = await dungMayChuGia(context);
  mayChu.nguoi = ADMIN;
  await page.goto('/');

  const menu = page.getByRole('navigation', { name: 'Chuyển màn hình' });
  for (const nhan of ['Bán hàng', 'Hàng hoá', 'Nhập hàng', 'Trả hàng', 'Trả hàng nhập', 'Tổng quan', 'Cài đặt']) {
    await expect(menu.getByRole('button', { name: nhan, exact: true })).toBeVisible();
  }
  await expect(menu.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
});

test('nhân viên chỉ thấy Bán hàng và Trả hàng, không có mục quản trị', async ({ page, context }) => {
  const mayChu = await dungMayChuGia(context);
  mayChu.nguoi = NHAN_VIEN;
  await page.goto('/');

  const menu = page.getByRole('navigation', { name: 'Chuyển màn hình' });
  await expect(menu.getByRole('button', { name: 'Bán hàng', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Trả hàng', exact: true })).toBeVisible();
  for (const nhan of ['Hàng hoá', 'Nhập hàng', 'Trả hàng nhập', 'Tổng quan', 'Cài đặt']) {
    await expect(menu.getByRole('button', { name: nhan, exact: true })).toHaveCount(0);
  }
  await expect(page.getByText('Chị Lan · Nhân viên')).toBeVisible();
});

test('hết phiên giữa chừng (API trả 401): tự về màn đăng nhập kèm câu báo', async ({ page, context }) => {
  const mayChu = await dungMayChuGia(context);
  mayChu.nguoi = ADMIN;
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bán hàng' })).toBeVisible();

  // Từ đây máy chủ coi phiên đã hết hạn.
  await context.route('**/api/hang-hoa*', (route) => route.fulfill({ status: 401, json: { loi: 'Chưa đăng nhập' } }));
  await page.getByPlaceholder('Tìm hàng hóa (F3)').pressSequentially('pa');

  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Phiên đã hết hạn, vui lòng đăng nhập lại');
});

test('đăng xuất: gọi API, về màn đăng nhập, xoá người đã lưu và cache tra cứu', async ({ page, context }) => {
  const mayChu = await dungMayChuGia(context);
  mayChu.nguoi = ADMIN;
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bán hàng' })).toBeVisible();
  await page.evaluate(async () => {
    const cache = await caches.open('danh-muc-tra-cuu');
    await cache.put('/api/hang-hoa?tim=x', new Response('{}'));
  });
  expect(await page.evaluate(() => localStorage.getItem('quaythuoc.nguoi-dung'))).not.toBeNull();
  expect(await page.evaluate(() => caches.has('danh-muc-tra-cuu'))).toBe(true);

  await page.getByRole('button', { name: 'Đăng xuất' }).click();

  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  expect(mayChu.daGoiDangXuat).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('quaythuoc.nguoi-dung'))).toBeNull();
  expect(await page.evaluate(() => caches.has('danh-muc-tra-cuu'))).toBe(false);
});

test('đăng nhập sai quá nhiều lần (429): báo số phút phải chờ', async ({ page, context }) => {
  await dungMayChuGia(context);
  await context.route('**/api/auth/dang-nhap', (route) =>
    route.fulfill({ status: 429, headers: { 'Retry-After': '600' }, json: { loi: 'quá nhiều' } }),
  );
  await page.goto('/');

  await page.getByLabel('Tên đăng nhập').fill('admin');
  await page.getByLabel('Mật khẩu').fill('bat-ky-gi');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page.getByRole('alert')).toHaveText('Đăng nhập sai quá nhiều lần. Thử lại sau 10 phút');
});

test('mở app khi máy chủ không với tới và chưa từng đăng nhập: báo không kết nối được', async ({ page, context }) => {
  await context.route('**/api/auth/toi', (route) => route.abort());
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Không kết nối được máy chủ');
});

test('mở app khi mất mạng nhưng đã từng đăng nhập: vào app bằng người đã lưu để bán tiếp', async ({ page, context }) => {
  const mayChu = await dungMayChuGia(context);
  mayChu.nguoi = NHAN_VIEN;
  await page.goto('/');
  await expect(page.getByText('Chị Lan · Nhân viên')).toBeVisible();

  await context.unroute('**/api/auth/toi');
  await context.route('**/api/auth/toi', (route) => route.abort());
  await page.reload();

  await expect(page.getByText('Chị Lan · Nhân viên')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nhập hàng' })).toHaveCount(0);
});

test('máy chủ trả 401 cho người đã lưu: KHÔNG dùng người đã lưu, bắt đăng nhập lại', async ({ page, context }) => {
  const mayChu = await dungMayChuGia(context);
  mayChu.nguoi = ADMIN;
  await page.goto('/');
  await expect(page.getByText('Chủ quầy · Quản trị')).toBeVisible();

  mayChu.nguoi = null;
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nhập hàng' })).toHaveCount(0);
});
