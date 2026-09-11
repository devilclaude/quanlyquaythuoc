import { describe, expect, it } from 'vitest';
import { ulid } from './ulid';

describe('ulid', () => {
  it('chấp nhận chuỗi đúng định dạng ULID', () => {
    const giaTri = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
    expect(ulid(giaTri)).toBe(giaTri);
  });

  it('từ chối chuỗi không đúng định dạng', () => {
    expect(() => ulid('khong-phai-ulid')).toThrow();
  });

  it('từ chối chuỗi rỗng', () => {
    expect(() => ulid('')).toThrow();
  });

  it('từ chối chuỗi chứa ký tự dễ nhầm lẫn (I, L, O, U)', () => {
    expect(() => ulid('01ARZ3NDEKTSV4RRFFQ69G5FAI')).toThrow();
  });
});
