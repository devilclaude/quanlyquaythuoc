import { expect, test } from './co-so';

// Quản lý người dùng ở Cài đặt (admin). API giả bằng `context.route` như các spec khác;
// `co-so` đã giả sẵn phiên admin (id `u-admin`).
interface NguoiGia {
  id: string;
  tenDangNhap: string;
  tenHienThi: string;
  vaiTro: 'ADMIN' | 'NHAN_VIEN';
  hoatDong: boolean;
  ngayTao: string;
}

const ADMIN: NguoiGia = { id: 'u-admin', tenDangNhap: 'admin', tenHienThi: 'Admin', vaiTro: 'ADMIN', hoatDong: true, ngayTao: '2026-10-10T00:00:00.000Z' };
const LAN: NguoiGia = { id: 'u-lan', tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN', hoatDong: true, ngayTao: '2026-10-10T00:01:00.000Z' };

interface Ghi {
  phuongThuc: string;
  url: string;
  body: unknown;
}

async function dungApi(context: import('@playwright/test').BrowserContext, nguoi: NguoiGia[]) {
  const daGhi: Ghi[] = [];
  await context.route('**/api/cai-dat/quan-ly-lo', (route) => route.fulfill({ json: { bat: false } }));
  await context.route('**/api/nguoi-dung**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'GET') return route.fulfill({ json: { duLieu: nguoi } });

    const body = req.postDataJSON() as Record<string, unknown>;
    daGhi.push({ phuongThuc: req.method(), url: url.pathname, body });

    if (req.method() === 'POST' && url.pathname === '/api/nguoi-dung') {
      const moi: NguoiGia = {
        id: `u-${String(body['tenDangNhap'])}`,
        tenDangNhap: String(body['tenDangNhap']),
        tenHienThi: String(body['tenHienThi']),
        vaiTro: body['vaiTro'] === 'ADMIN' ? 'ADMIN' : 'NHAN_VIEN',
        hoatDong: true,
        ngayTao: '2026-10-10T00:02:00.000Z',
      };
      nguoi.push(moi);
      return route.fulfill({ status: 201, json: moi });
    }
    if (req.method() === 'PUT') {
      const id = url.pathname.split('/').pop();
      const cu = nguoi.find((n) => n.id === id);
      if (cu && typeof body['hoatDong'] === 'boolean') cu.hoatDong = body['hoatDong'];
      return route.fulfill({ json: cu });
    }
    return route.fulfill({ status: 204 });
  });
  return daGhi;
}

async function moCaiDat(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Người dùng', exact: true })).toBeVisible();
}

test('admin thấy danh sách người dùng; hàng của chính mình không có nút Khoá', async ({ page, context }) => {
  await dungApi(context, [{ ...ADMIN }, { ...LAN }]);
  await moCaiDat(page);

  const hangAdmin = page.getByRole('row', { name: /admin/ }).first();
  const hangLan = page.getByRole('row', { name: /Chị Lan/ });
  await expect(hangLan).toContainText('Nhân viên');
  await expect(hangLan.getByRole('button', { name: 'Khoá', exact: true })).toBeVisible();
  await expect(hangAdmin.getByRole('button', { name: 'Khoá', exact: true })).toHaveCount(0);
  await expect(hangAdmin.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeVisible();
});

test('thêm người dùng gửi đúng POST và dòng mới xuất hiện', async ({ page, context }) => {
  const daGhi = await dungApi(context, [{ ...ADMIN }, { ...LAN }]);
  await moCaiDat(page);

  const form = page.locator('form', { hasText: 'Thêm người dùng' });
  await form.getByLabel('Tên đăng nhập').fill('minh');
  await form.getByLabel('Tên hiển thị').fill('Anh Minh');
  await form.getByLabel('Mật khẩu').fill('mat-khau-cua-minh');
  await form.getByRole('button', { name: 'Thêm người dùng' }).click();

  await expect(page.getByRole('row', { name: /Anh Minh/ })).toBeVisible();
  expect(daGhi).toContainEqual({
    phuongThuc: 'POST',
    url: '/api/nguoi-dung',
    body: { tenDangNhap: 'minh', tenHienThi: 'Anh Minh', matKhau: 'mat-khau-cua-minh', vaiTro: 'NHAN_VIEN' },
  });
  // Form được xoá sạch sau khi thêm xong (không giữ mật khẩu trong ô).
  await expect(form.getByLabel('Mật khẩu')).toHaveValue('');
});

test('khoá người dùng gửi PUT { hoatDong: false } và trạng thái chuyển thành Đã khoá, có thể Mở khoá lại', async ({ page, context }) => {
  const daGhi = await dungApi(context, [{ ...ADMIN }, { ...LAN }]);
  await moCaiDat(page);
  const hangLan = page.getByRole('row', { name: /Chị Lan/ });

  await hangLan.getByRole('button', { name: 'Khoá', exact: true }).click();

  await expect(hangLan).toContainText('Đã khoá');
  expect(daGhi).toContainEqual({ phuongThuc: 'PUT', url: '/api/nguoi-dung/u-lan', body: { hoatDong: false } });

  await hangLan.getByRole('button', { name: 'Mở khoá' }).click();
  await expect(hangLan).toContainText('Hoạt động');
});

test('đặt lại mật khẩu: mở ô nhập ngay dưới hàng, gửi POST rồi đóng ô', async ({ page, context }) => {
  const daGhi = await dungApi(context, [{ ...ADMIN }, { ...LAN }]);
  await moCaiDat(page);
  const hangLan = page.getByRole('row', { name: /Chị Lan/ });

  await hangLan.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await page.getByLabel('Mật khẩu mới').fill('mat-khau-moi-12345');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();

  await expect(page.getByLabel('Mật khẩu mới')).toHaveCount(0);
  expect(daGhi).toContainEqual({
    phuongThuc: 'POST',
    url: '/api/nguoi-dung/u-lan/dat-lai-mat-khau',
    body: { matKhau: 'mat-khau-moi-12345' },
  });
});

test('máy chủ từ chối (409): hiện câu lỗi của máy chủ trong vùng cảnh báo', async ({ page, context }) => {
  await dungApi(context, [{ ...ADMIN }, { ...LAN }]);
  await context.route('**/api/nguoi-dung/u-lan', (route) =>
    route.request().method() === 'PUT'
      ? route.fulfill({ status: 409, json: { loi: 'Phải còn ít nhất một quản trị viên đang hoạt động' } })
      : route.fallback(),
  );
  await moCaiDat(page);

  await page.getByRole('row', { name: /Chị Lan/ }).getByRole('button', { name: 'Khoá', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Phải còn ít nhất một quản trị viên đang hoạt động');
});
