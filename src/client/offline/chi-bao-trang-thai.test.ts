import { describe, expect, it } from 'vitest';
import { tinhNoiDungChiBao } from './chi-bao-trang-thai';

describe('tinhNoiDungChiBao', () => {
  it('online, không có gì chờ, chưa từng đồng bộ', () => {
    const noiDung = tinhNoiDungChiBao({ online: true, soChoDongBo: 0, dongBoGanNhat: null });
    expect(noiDung.nhanKetNoi).toBe('Đang online');
    expect(noiDung.mauKetNoi).toBe('tot');
    expect(noiDung.nhanCho).toBeNull();
    expect(noiDung.nhanDongBo).toBe('Chưa đồng bộ lần nào');
  });

  it('offline đổi cả nhãn lẫn màu badge', () => {
    const noiDung = tinhNoiDungChiBao({ online: false, soChoDongBo: 0, dongBoGanNhat: null });
    expect(noiDung.nhanKetNoi).toBe('Đang offline');
    expect(noiDung.mauKetNoi).toBe('nguy');
  });

  it('có thao tác chờ đồng bộ thì hiện đúng số lượng', () => {
    const noiDung = tinhNoiDungChiBao({ online: false, soChoDongBo: 3, dongBoGanNhat: null });
    expect(noiDung.nhanCho).toBe('3 thao tác chờ đồng bộ');
  });

  it('không có gì chờ thì không hiện nhãn chờ đồng bộ ("nếu có" — UI-FIDELITY.md)', () => {
    const noiDung = tinhNoiDungChiBao({ online: true, soChoDongBo: 0, dongBoGanNhat: null });
    expect(noiDung.nhanCho).toBeNull();
  });

  it('có mốc đồng bộ gần nhất thì hiện giờ:phút', () => {
    const noiDung = tinhNoiDungChiBao({
      online: true,
      soChoDongBo: 0,
      dongBoGanNhat: Date.UTC(2026, 8, 22, 8, 5),
    });
    expect(noiDung.nhanDongBo).toMatch(/^Đồng bộ gần nhất: \d{2}:\d{2}$/);
  });
});
