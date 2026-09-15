import { describe, expect, it } from 'vitest';
import { apDungGiaVon } from './gia-von';

describe('apDungGiaVon', () => {
  it('nhập vào lô chưa có gì thì tồn và giá trị tồn bằng đúng dòng nhập, không qua phép chia', () => {
    const ketQua = apDungGiaVon(undefined, 900, 4_500_000);

    expect(ketQua).toEqual({ ton: 900, giaTriTon: 4_500_000 });
  });

  it('nhập thêm vào lô đã có tồn thì cộng dồn thẳng cả hai vế, không qua phép chia', () => {
    const ketQua = apDungGiaVon({ ton: 900, giaTriTon: 4_500_000 }, 100, 600_000);

    expect(ketQua).toEqual({ ton: 1000, giaTriTon: 5_100_000 });
  });

  it('bán một phần tính COGS theo bình quân gia quyền, làm tròn nửa lên', () => {
    // đơn giá vốn 5.100đ/viên (5.100.000 / 1000), bán 3 viên → cogs tròn 15.300đ
    const ketQua = apDungGiaVon({ ton: 1000, giaTriTon: 5_100_000 }, -3, undefined);

    expect(ketQua).toEqual({ ton: 997, giaTriTon: 5_084_700 });
  });

  it('bán một phần với tỉ lệ không chia hết làm tròn nửa lên đúng luật SPEC.md §3.4', () => {
    // 70.000.000 * 1 / 60.000 = 1166.666... → tròn 1167 (khớp ca test chiaLamTronNuaLen)
    const ketQua = apDungGiaVon({ ton: 60_000, giaTriTon: 70_000_000 }, -1, undefined);

    expect(ketQua).toEqual({ ton: 59_999, giaTriTon: 70_000_000 - 1_167 });
  });

  it('bán hết sạch (sl == ton) thì giá trị tồn về đúng 0 — không tích luỹ sai số làm tròn', () => {
    const ketQua = apDungGiaVon({ ton: 3, giaTriTon: 10 }, -3, undefined);

    expect(ketQua).toEqual({ ton: 0, giaTriTon: 0 });
  });

  it('bán vượt tồn ghi sổ (dữ liệu bất thường) không làm giá trị tồn âm — giá trị về 0', () => {
    const ketQua = apDungGiaVon({ ton: 2, giaTriTon: 10 }, -5, undefined);

    expect(ketQua).toEqual({ ton: -3, giaTriTon: 0 });
  });

  it('dòng ra khi chưa từng có tồn (chưa nhập gì) giữ nguyên giá trị tồn, không chia cho 0', () => {
    const ketQua = apDungGiaVon(undefined, -5, undefined);

    expect(ketQua).toEqual({ ton: -5, giaTriTon: 0 });
  });

  it('dòng số lượng 0 không đổi trạng thái', () => {
    const ketQua = apDungGiaVon({ ton: 10, giaTriTon: 50_000 }, 0, undefined);

    expect(ketQua).toEqual({ ton: 10, giaTriTon: 50_000 });
  });

  it('dòng vào không khai giá trị tường minh thì cộng 0 vào giá trị tồn (không tự bịa giá)', () => {
    const ketQua = apDungGiaVon({ ton: 10, giaTriTon: 50_000 }, 5, undefined);

    expect(ketQua).toEqual({ ton: 15, giaTriTon: 50_000 });
  });
});
