import { describe, expect, it } from 'vitest';
import { taoUlid, ulid } from './ulid';

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

describe('taoUlid', () => {
  it('sinh chuỗi đúng định dạng ULID — dùng lại được với hàm dựng ulid()', () => {
    expect(() => ulid(taoUlid())).not.toThrow();
  });

  it('hai lần gọi liên tiếp không trùng nhau', () => {
    expect(taoUlid()).not.toBe(taoUlid());
  });

  it('phần thời gian tăng dần theo mốc thời gian truyền vào, để id sắp xếp được theo thời gian tạo', () => {
    const som = taoUlid(1_000_000);
    const muon = taoUlid(2_000_000);
    expect(som.slice(0, 10) < muon.slice(0, 10)).toBe(true);
  });

  it('cùng một mốc thời gian vẫn ra phần thời gian giống hệt nhau', () => {
    expect(taoUlid(1_726_000_000_000).slice(0, 10)).toBe(taoUlid(1_726_000_000_000).slice(0, 10));
  });
});
