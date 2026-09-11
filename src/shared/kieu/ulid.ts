export type Ulid = string & { readonly __brand: 'Ulid' };

// Crockford base32, viết hoa, không có I/L/O/U — theo đặc tả ULID.
const DANG_ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

export function ulid(giaTri: string): Ulid {
  if (!DANG_ULID.test(giaTri)) {
    throw new Error(`Không phải ULID hợp lệ: ${giaTri}`);
  }
  return giaTri as Ulid;
}
