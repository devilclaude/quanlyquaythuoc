import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { taoUlid } from '../../shared/kieu/ulid';
import {
  csdlCucBo,
  layThaoTacChoGui,
  layTrangThaiHangDoi,
  themThaoTac,
  tinhTrangThaiTuDanhSachThaoTac,
  xoaThaoTacDaXacNhan,
  xuLyHangDoi,
  type ThaoTac,
} from './hang-doi-thao-tac';

afterEach(async () => {
  await csdlCucBo.thaoTac.clear();
});

function thaoTacGia(trangThai: ThaoTac['trangThai'], thoiGianCapNhat = Date.now()): ThaoTac {
  return {
    id: taoUlid(),
    loai: 'BAN_HANG',
    duLieu: { ma: 'HD1-000001' },
    trangThai,
    thoiGianTao: thoiGianCapNhat,
    thoiGianCapNhat,
  };
}

describe('themThaoTac', () => {
  it('thêm thao tác mới ở trạng thái chờ gửi', async () => {
    const id = taoUlid();
    const ketQua = await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001' });
    expect(ketQua).toBe('DA_THEM');

    const [thaoTac] = await layThaoTacChoGui();
    expect(thaoTac).toBeDefined();
    expect(thaoTac?.id).toBe(id);
    expect(thaoTac?.trangThai).toBe('CHO_GUI');
  });

  it('gửi lại cùng ULID hai lần không nhân đôi tồn kho — chỉ có đúng một bản ghi', async () => {
    const id = taoUlid();
    const lanMot = await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001', soLuong: 3 });
    const lanHai = await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001', soLuong: 3 });

    expect(lanMot).toBe('DA_THEM');
    expect(lanHai).toBe('DA_TON_TAI');
    expect(await csdlCucBo.thaoTac.count()).toBe(1);
  });

  it('hai thao tác khác ULID (đơn khác nhau) đều được thêm', async () => {
    await themThaoTac(taoUlid(), 'BAN_HANG', { ma: 'HD1-000001' });
    await themThaoTac(taoUlid(), 'BAN_HANG', { ma: 'HD1-000002' });
    expect(await csdlCucBo.thaoTac.count()).toBe(2);
  });
});

describe('layThaoTacChoGui', () => {
  it('chỉ trả về thao tác CHO_GUI/LOI, không trả DA_GUI/DA_XAC_NHAN', async () => {
    await csdlCucBo.thaoTac.bulkAdd([
      thaoTacGia('CHO_GUI'),
      thaoTacGia('LOI'),
      thaoTacGia('DA_GUI'),
      thaoTacGia('DA_XAC_NHAN'),
    ]);

    const ds = await layThaoTacChoGui();
    expect(ds).toHaveLength(2);
    expect(ds.every((tt) => tt.trangThai === 'CHO_GUI' || tt.trangThai === 'LOI')).toBe(true);
  });

  it('trả theo đúng thứ tự tạo (FIFO)', async () => {
    const cu = thaoTacGia('CHO_GUI', 1000);
    const moi = thaoTacGia('CHO_GUI', 2000);
    await csdlCucBo.thaoTac.bulkAdd([moi, cu]);

    const ds = await layThaoTacChoGui();
    expect(ds.map((tt) => tt.id)).toEqual([cu.id, moi.id]);
  });
});

describe('xuLyHangDoi', () => {
  it('gửi thành công thì chuyển DA_XAC_NHAN', async () => {
    const id = taoUlid();
    await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001' });

    await xuLyHangDoi(async () => {});

    const banGhi = await csdlCucBo.thaoTac.get(id);
    expect(banGhi?.trangThai).toBe('DA_XAC_NHAN');
  });

  it('gửi thất bại thì chuyển LOI, ghi lại thông báo lỗi, và KHÔNG bị xoá khỏi hàng đợi', async () => {
    const id = taoUlid();
    await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001' });

    await xuLyHangDoi(() => Promise.reject(new Error('Mất mạng giữa chừng')));

    const banGhi = await csdlCucBo.thaoTac.get(id);
    expect(banGhi?.trangThai).toBe('LOI');
    expect(banGhi?.loiCuoi).toBe('Mất mạng giữa chừng');

    const ds = await layThaoTacChoGui();
    expect(ds.map((tt) => tt.id)).toContain(id);
  });

  it('một thao tác lỗi ở lần xử lý trước vẫn được thử lại ở lần xử lý sau', async () => {
    const id = taoUlid();
    await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001' });
    await xuLyHangDoi(() => Promise.reject(new Error('lỗi lần 1')));

    await xuLyHangDoi(async () => {});

    const banGhi = await csdlCucBo.thaoTac.get(id);
    expect(banGhi?.trangThai).toBe('DA_XAC_NHAN');
  });

  it('nhiều thao tác: chỉ cái gửi lỗi ở lại hàng đợi, cái gửi thành công thì không', async () => {
    const idThanhCong = taoUlid();
    const idLoi = taoUlid();
    await themThaoTac(idThanhCong, 'BAN_HANG', { ma: 'HD1-000001' });
    await themThaoTac(idLoi, 'BAN_HANG', { ma: 'HD1-000002' });

    await xuLyHangDoi((thaoTac) =>
      thaoTac.id === idLoi ? Promise.reject(new Error('tồn không đủ')) : Promise.resolve(),
    );

    const ds = await layThaoTacChoGui();
    expect(ds.map((tt) => tt.id)).toEqual([idLoi]);
  });
});

describe('xoaThaoTacDaXacNhan', () => {
  it('xoá được khi đã DA_XAC_NHAN', async () => {
    const id = taoUlid();
    await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001' });
    await xuLyHangDoi(async () => {});

    await xoaThaoTacDaXacNhan(id);

    expect(await csdlCucBo.thaoTac.get(id)).toBeUndefined();
  });

  it('từ chối xoá khi còn CHO_GUI — không bao giờ tự xoá thao tác chưa xác nhận', async () => {
    const id = taoUlid();
    await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001' });

    await expect(xoaThaoTacDaXacNhan(id)).rejects.toThrow(/DA_XAC_NHAN/);
    expect(await csdlCucBo.thaoTac.get(id)).toBeDefined();
  });

  it('từ chối xoá khi đang LOI', async () => {
    const id = taoUlid();
    await themThaoTac(id, 'BAN_HANG', { ma: 'HD1-000001' });
    await xuLyHangDoi(() => Promise.reject(new Error('lỗi')));

    await expect(xoaThaoTacDaXacNhan(id)).rejects.toThrow();
  });

  it('không làm gì khi id không tồn tại', async () => {
    await expect(xoaThaoTacDaXacNhan(taoUlid())).resolves.toBeUndefined();
  });
});

describe('tinhTrangThaiTuDanhSachThaoTac', () => {
  it('rỗng: không có gì chờ, chưa từng đồng bộ', () => {
    expect(tinhTrangThaiTuDanhSachThaoTac([])).toEqual({ soChoDongBo: 0, dongBoGanNhat: null });
  });

  it('đếm CHO_GUI và LOI là "chờ đồng bộ", không đếm DA_GUI/DA_XAC_NHAN', () => {
    const ds = [
      thaoTacGia('CHO_GUI'),
      thaoTacGia('LOI'),
      thaoTacGia('DA_GUI'),
      thaoTacGia('DA_XAC_NHAN'),
    ];
    expect(tinhTrangThaiTuDanhSachThaoTac(ds).soChoDongBo).toBe(2);
  });

  it('mốc đồng bộ gần nhất là thoiGianCapNhat lớn nhất trong các thao tác DA_XAC_NHAN', () => {
    const ds = [thaoTacGia('DA_XAC_NHAN', 1000), thaoTacGia('DA_XAC_NHAN', 3000), thaoTacGia('DA_XAC_NHAN', 2000)];
    expect(tinhTrangThaiTuDanhSachThaoTac(ds).dongBoGanNhat).toBe(3000);
  });

  it('không có thao tác DA_XAC_NHAN nào thì mốc đồng bộ là null dù có thao tác khác', () => {
    const ds = [thaoTacGia('CHO_GUI'), thaoTacGia('LOI')];
    expect(tinhTrangThaiTuDanhSachThaoTac(ds).dongBoGanNhat).toBeNull();
  });
});

describe('layTrangThaiHangDoi', () => {
  it('đọc trực tiếp từ Dexie và suy đúng trạng thái hiển thị', async () => {
    await themThaoTac(taoUlid(), 'BAN_HANG', { ma: 'HD1-000001' });
    const idXong = taoUlid();
    await themThaoTac(idXong, 'BAN_HANG', { ma: 'HD1-000002' });
    await xuLyHangDoi((tt) => (tt.id !== idXong ? Promise.reject(new Error('chưa xử lý')) : Promise.resolve()));

    const trangThai = await layTrangThaiHangDoi();
    expect(trangThai.soChoDongBo).toBe(1);
    expect(trangThai.dongBoGanNhat).not.toBeNull();
  });
});
