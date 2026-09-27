import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { taoUlid } from '../../shared/kieu/ulid';
import {
  capSoHoaDonTiepTheo,
  csdlSoHoaDon,
  dinhDangSoHoaDon,
  layMaMayHienTai,
  traCuuSoHoaDonCucBo,
} from './so-hoa-don-client';

afterEach(async () => {
  await csdlSoHoaDon.thietBi.clear();
  await csdlSoHoaDon.soHoaDonDaCap.clear();
});

describe('dinhDangSoHoaDon', () => {
  it('đúng dạng HD<mã máy>-<số tăng dần> 6 chữ số, đệm 0 (SPEC.md §5.3)', () => {
    expect(dinhDangSoHoaDon('AB12CD', 1)).toBe('HDAB12CD-000001');
    expect(dinhDangSoHoaDon('AB12CD', 42)).toBe('HDAB12CD-000042');
  });

  it('mã máy khác nhau ở cùng số thứ tự không bao giờ ra cùng một số hoá đơn', () => {
    expect(dinhDangSoHoaDon('MAYA01', 42)).not.toBe(dinhDangSoHoaDon('MAYB02', 42));
  });
});

describe('layMaMayHienTai', () => {
  it('sinh mã máy lần đầu rồi giữ nguyên ở các lần gọi sau (không đổi/không sinh lại)', async () => {
    const lanMot = await layMaMayHienTai();
    const lanHai = await layMaMayHienTai();
    expect(lanHai).toBe(lanMot);
    expect(lanMot.length).toBeGreaterThan(0);
  });
});

describe('capSoHoaDonTiepTheo', () => {
  it('cấp số đầu tiên là 000001, số tiếp theo tăng dần', async () => {
    const soMot = await capSoHoaDonTiepTheo(taoUlid());
    const soHai = await capSoHoaDonTiepTheo(taoUlid());

    const maMay = await layMaMayHienTai();
    expect(soMot).toBe(dinhDangSoHoaDon(maMay, 1));
    expect(soHai).toBe(dinhDangSoHoaDon(maMay, 2));
  });

  it('bất biến: gọi lại nhiều lần với cùng idThaoTac trả về đúng số đã cấp lần đầu, không tăng bộ đếm thêm', async () => {
    const idThaoTac = taoUlid();
    const lanMot = await capSoHoaDonTiepTheo(idThaoTac);
    const lanHai = await capSoHoaDonTiepTheo(idThaoTac);
    const lanBa = await capSoHoaDonTiepTheo(idThaoTac);

    expect(lanHai).toBe(lanMot);
    expect(lanBa).toBe(lanMot);

    // Thao tác kế tiếp (ULID khác) phải lấy đúng số #2 — chứng minh idempotent
    // không "ăn" mất một số trong dãy tăng dần.
    const tiepTheo = await capSoHoaDonTiepTheo(taoUlid());
    const maMay = await layMaMayHienTai();
    expect(tiepTheo).toBe(dinhDangSoHoaDon(maMay, 2));
  });

  it('hai thao tác cấp số cùng lúc trên cùng một thiết bị không bao giờ va số', async () => {
    const [soA, soB] = await Promise.all([capSoHoaDonTiepTheo(taoUlid()), capSoHoaDonTiepTheo(taoUlid())]);

    expect(soA).not.toBe(soB);
    const maMay = await layMaMayHienTai();
    expect([soA, soB].sort()).toEqual([dinhDangSoHoaDon(maMay, 1), dinhDangSoHoaDon(maMay, 2)].sort());
  });

  it('số lượng lớn cấp liên tiếp không trùng lặp (kiểm tra bộ đếm không lặp lại)', async () => {
    const soLuong = 50;
    const cacSo = await Promise.all(Array.from({ length: soLuong }, () => capSoHoaDonTiepTheo(taoUlid())));
    expect(new Set(cacSo).size).toBe(soLuong);
  });
});

describe('traCuuSoHoaDonCucBo', () => {
  it('tra cứu được số đã cấp — số đã in luôn tra cứu được (T-032 "Xong khi")', async () => {
    const idThaoTac = taoUlid();
    const soHoaDon = await capSoHoaDonTiepTheo(idThaoTac);

    const banGhi = await traCuuSoHoaDonCucBo(soHoaDon);

    expect(banGhi).toBeDefined();
    expect(banGhi?.idThaoTac).toBe(idThaoTac);
  });

  it('trả về undefined cho số hoá đơn chưa từng cấp', async () => {
    expect(await traCuuSoHoaDonCucBo('HDKHONGTONTAI-999999')).toBeUndefined();
  });
});
