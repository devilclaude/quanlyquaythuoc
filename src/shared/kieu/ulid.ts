export type Ulid = string & { readonly __brand: 'Ulid' };

// Crockford base32, viết hoa, không có I/L/O/U — theo đặc tả ULID.
const DANG_ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
const BANG_CHU_CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(giaTri: string): Ulid {
  if (!DANG_ULID.test(giaTri)) {
    throw new Error(`Không phải ULID hợp lệ: ${giaTri}`);
  }
  return giaTri as Ulid;
}

function macHoaThoiGian(thoiGianMs: number): string {
  let phan = '';
  let con = thoiGianMs;
  for (let i = 0; i < 10; i++) {
    phan = BANG_CHU_CROCKFORD[con % 32] + phan;
    con = Math.floor(con / 32);
  }
  return phan;
}

function macHoaNgauNhien(): string {
  const cacByte = new Uint8Array(16);
  crypto.getRandomValues(cacByte);
  let phan = '';
  for (const b of cacByte) {
    // 256 chia hết cho 32 nên lấy dư không lệch phân bố.
    phan += BANG_CHU_CROCKFORD[b % 32];
  }
  return phan;
}

/**
 * Sinh một ULID mới (ARCHITECTURE.md §1). `thoiGianMs` mặc định `Date.now()`,
 * nhận tham số để test kiểm tra phần thời gian tăng dần mà không cần chờ đồng hồ.
 */
export function taoUlid(thoiGianMs: number = Date.now()): Ulid {
  return ulid(macHoaThoiGian(thoiGianMs) + macHoaNgauNhien());
}
