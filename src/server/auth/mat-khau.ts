import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Tham số scrypt lưu cùng chuỗi băm để sau này nâng độ khó mà không làm hỏng
// mật khẩu cũ. N=16384, r=8 dùng ~16MB bộ nhớ, dưới giới hạn mặc định 32MB.
const N = 16384;
const R = 8;
const P = 1;
const DO_DAI_KHOA = 64;

/** Định dạng: `scrypt$N$r$p$muoiHex$khoaHex`. */
export function bamMatKhau(matKhau: string): string {
  const muoi = randomBytes(16);
  const khoa = scryptSync(matKhau, muoi, DO_DAI_KHOA, { N, r: R, p: P });
  return ['scrypt', N, R, P, muoi.toString('hex'), khoa.toString('hex')].join('$');
}

export function kiemTraMatKhau(matKhau: string, chuoiBam: string): boolean {
  const phan = chuoiBam.split('$');
  if (phan.length !== 6 || phan[0] !== 'scrypt') return false;

  const n = Number(phan[1]);
  const r = Number(phan[2]);
  const p = Number(phan[3]);
  const muoiHex = phan[4];
  const khoaHex = phan[5];
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (!muoiHex || !khoaHex || !/^[0-9a-f]+$/.test(muoiHex) || !/^[0-9a-f]+$/.test(khoaHex)) return false;

  const khoaMong = Buffer.from(khoaHex, 'hex');
  try {
    const khoa = scryptSync(matKhau, Buffer.from(muoiHex, 'hex'), khoaMong.length, { N: n, r, p });
    return khoa.length === khoaMong.length && timingSafeEqual(khoa, khoaMong);
  } catch {
    return false;
  }
}

/**
 * Băm dùng khi tên đăng nhập không tồn tại: vẫn phải chạy một lần scrypt để thời
 * gian trả lời không tiết lộ tên nào có thật.
 */
export const BAM_GIA = bamMatKhau('mat-khau-gia-khong-ai-biet');
