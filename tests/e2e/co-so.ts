import { test as goc } from '@playwright/test';

// Từ khi app có cổng đăng nhập, mọi e2e nghiệp vụ phải qua cổng đó. Các spec cũ chỉ
// quan tâm tới màn hình của chúng, không phải đăng nhập — nên giả sẵn một phiên admin
// cho `GET /api/auth/toi` (bằng `context.route`, cùng lý do với các route khác: service
// worker tự gọi fetch nên `page.route` không chặn được). Spec đăng nhập
// (dang-nhap.spec.ts) dùng `test` gốc để tự điều khiển phản hồi này.
export const NGUOI_ADMIN = {
  id: 'u-admin',
  tenDangNhap: 'admin',
  tenHienThi: 'Admin',
  vaiTro: 'ADMIN',
} as const;

export const test = goc.extend<{ _phienAdminGia: undefined }>({
  _phienAdminGia: [
    async ({ context }, use) => {
      await context.route('**/api/auth/toi', (route) => route.fulfill({ json: NGUOI_ADMIN }));
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
