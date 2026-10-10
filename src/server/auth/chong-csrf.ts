import type { MiddlewareHandler } from 'hono';

const PHUONG_THUC_AN_TOAN = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Lớp phòng thủ CSRF thứ hai bên cạnh cookie `SameSite=Lax`: request ghi từ trình
 * duyệt luôn mang `Origin`; nếu nó không cùng host với app và không nằm trong danh
 * sách cho phép thì từ chối. Request không có `Origin` (curl, máy chủ khác) không
 * phải CSRF — kẻ tấn công qua trình duyệt nạn nhân không bỏ được header này.
 */
export function chongCsrf(originChoPhep: readonly string[]): MiddlewareHandler {
  return async (c, next) => {
    if (PHUONG_THUC_AN_TOAN.has(c.req.method)) return next();

    const origin = c.req.header('Origin');
    if (origin === undefined) return next();
    if (originChoPhep.includes(origin)) return next();

    // Qua nhiều proxy thì X-Forwarded-Host là danh sách "gốc, proxy1, ..." — host của
    // trình duyệt luôn là phần tử đầu.
    const hostApp = c.req.header('X-Forwarded-Host')?.split(',')[0]?.trim() || c.req.header('Host');
    let hostOrigin: string | undefined;
    try {
      hostOrigin = new URL(origin).host;
    } catch {
      hostOrigin = undefined;
    }
    if (hostOrigin !== undefined && hostApp !== undefined && hostOrigin === hostApp) return next();

    return c.json({ loi: 'Nguồn gốc request không hợp lệ' }, 403);
  };
}
