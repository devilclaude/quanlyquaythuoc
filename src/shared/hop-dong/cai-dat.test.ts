import { describe, expect, it } from 'vitest';
import {
  CaiDatToanCucResSchema,
  DoiCaiDatToanCucReqSchema,
  DoiGhiDeSanPhamReqSchema,
  GhiDeQuanLyLoSchema,
} from './cai-dat';

describe('GhiDeQuanLyLoSchema', () => {
  it('chấp nhận ba giá trị hợp lệ', () => {
    expect(GhiDeQuanLyLoSchema.parse('KE_THUA')).toBe('KE_THUA');
    expect(GhiDeQuanLyLoSchema.parse('BAT')).toBe('BAT');
    expect(GhiDeQuanLyLoSchema.parse('TAT')).toBe('TAT');
  });

  it('từ chối giá trị ngoài ba trạng thái', () => {
    expect(() => GhiDeQuanLyLoSchema.parse('KHONG_HOP_LE')).toThrow();
  });
});

describe('CaiDatToanCucResSchema', () => {
  it('chấp nhận { bat: boolean }', () => {
    expect(() => CaiDatToanCucResSchema.parse({ bat: true })).not.toThrow();
  });

  it('từ chối thiếu trường bat', () => {
    expect(() => CaiDatToanCucResSchema.parse({})).toThrow();
  });
});

describe('DoiCaiDatToanCucReqSchema', () => {
  it('chấp nhận { bat: boolean }', () => {
    expect(() => DoiCaiDatToanCucReqSchema.parse({ bat: false })).not.toThrow();
  });

  it('từ chối bat không phải boolean', () => {
    expect(() => DoiCaiDatToanCucReqSchema.parse({ bat: 'true' })).toThrow();
  });
});

describe('DoiGhiDeSanPhamReqSchema', () => {
  it('chấp nhận { ghiDe: GhiDeQuanLyLo hợp lệ }', () => {
    expect(() => DoiGhiDeSanPhamReqSchema.parse({ ghiDe: 'TAT' })).not.toThrow();
  });

  it('từ chối ghiDe ngoài ba trạng thái', () => {
    expect(() => DoiGhiDeSanPhamReqSchema.parse({ ghiDe: 'khac' })).toThrow();
  });
});
