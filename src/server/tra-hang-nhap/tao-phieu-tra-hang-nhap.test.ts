import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, sanPham, theKho, tonKhoLo, traHangNhap, traHangNhapDong } from '../db/schema';
import { KhongDuTonKhoError } from '../kho/fefo';
import { type DongPhieuNhapInput, taoPhieuNhap } from '../nhap-hang/tao-phieu-nhap';
import { taoPhieuXuatHuy } from '../xuat-huy/phieu-xuat-huy';
import {
  DongTraHangNhapRongError,
  PhieuNhapChuaHoanThanhError,
  PhieuNhapDongKhongThuocPhieuError,
  PhieuNhapKhongTonTaiError,
  SoLuongKhongHopLeError,
  VuotSoLuongDaNhapError,
  taoPhieuTraHangNhap,
} from './tao-phieu-tra-hang-nhap';

type DbTest = ReturnType<typeof drizzle>;

let sqlite: Database.Database;
let db: DbTest;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
});

afterEach(() => {
  sqlite.close();
});

function taoChiNhanh(id: string) {
  db.insert(chiNhanh).values({ id, ten: 'Quầy chính' }).run();
}

function taoSanPham(sanPhamId: string, maHang: string) {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
}

function loNgamDinhCua(sanPhamId: string): string {
  const [lo] = db.select().from(loHang).where(and(eq(loHang.sanPhamId, sanPhamId), eq(loHang.laLoMacDinh, true))).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function loThatCua(sanPhamId: string, soLo: string, hsd: string): string {
  const [lo] = db.select().from(loHang).where(and(eq(loHang.sanPhamId, sanPhamId), eq(loHang.soLo, soLo), eq(loHang.hsd, hsd))).all();
  if (!lo) throw new Error(`lô thật ${soLo}/${hsd} chưa được tạo`);
  return lo.id;
}

function tonDem(loId: string, chiNhanhId: string): number {
  const [row] = db.select().from(tonKhoLo).where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, chiNhanhId))).all();
  return row?.ton ?? 0;
}

/** Nhập và hoàn thành ngay một phiếu một dòng — trả về id dòng (`phieuNhapDongId`) và id phiếu. */
function nhapHoanThanh(
  chiNhanhId: string,
  dongOverrides: Partial<DongPhieuNhapInput> = {},
  phieuId = 'pn-1',
  dongId = 'pnd-1',
): { phieuId: string; dongId: string } {
  taoPhieuNhap(db, {
    id: phieuId,
    chiNhanhId,
    thoiGian: '2026-09-20T07:00:00.000Z',
    hoanThanhNgay: true,
    dong: [
      {
        id: dongId,
        sanPhamId: dongOverrides.sanPhamId ?? 'sp-1',
        donViTen: dongOverrides.donViTen ?? 'Viên',
        heSo: dongOverrides.heSo ?? 1,
        donGia: dongOverrides.donGia ?? 1_000,
        soLuong: dongOverrides.soLuong ?? 100,
        soLo: dongOverrides.soLo ?? null,
        hsd: dongOverrides.hsd ?? null,
      },
    ],
  });
  return { phieuId, dongId };
}

describe('taoPhieuTraHangNhap', () => {
  it('trả một phần một dòng: trừ đúng lô đã nhập và tính đúng tiền hoàn theo tỷ lệ', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId, dongId } = nhapHoanThanh('cn-1');
    const loId = loNgamDinhCua('sp-1');
    expect(tonDem(loId, 'cn-1')).toBe(100);

    const ketQua = taoPhieuTraHangNhap(db, {
      id: 'thn-1',
      phieuNhapId: phieuId,
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 20 }],
    });

    expect(ketQua.ma).toBe('THN000001');
    expect(ketQua.tongTienHoan).toBe(20_000);
    expect(tonDem(loId, 'cn-1')).toBe(80);

    const dong = db.select().from(traHangNhapDong).where(eq(traHangNhapDong.id, 'thnd-1')).all();
    expect(dong[0]?.soLuong).toBe(20);
    expect(dong[0]?.tienHoan).toBe(20_000);

    const dongTheKho = db.select().from(theKho).where(eq(theKho.loai, 'TRA_NCC')).all();
    expect(dongTheKho).toHaveLength(1);
    expect(dongTheKho[0]?.soLuong).toBe(-20);
    expect(dongTheKho[0]?.loId).toBe(loId);
  });

  it('trả đủ số đã nhập: hoàn lại đúng toàn bộ tiền và tồn về 0', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId, dongId } = nhapHoanThanh('cn-1');
    const loId = loNgamDinhCua('sp-1');

    const ketQua = taoPhieuTraHangNhap(db, {
      id: 'thn-1',
      phieuNhapId: phieuId,
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 100 }],
    });

    expect(ketQua.tongTienHoan).toBe(100_000);
    expect(tonDem(loId, 'cn-1')).toBe(0);
  });

  it('trả vượt số đã nhập bị từ chối, không ghi gì', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId, dongId } = nhapHoanThanh('cn-1');
    const loId = loNgamDinhCua('sp-1');

    expect(() =>
      taoPhieuTraHangNhap(db, {
        id: 'thn-1',
        phieuNhapId: phieuId,
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 101 }],
      }),
    ).toThrow(VuotSoLuongDaNhapError);

    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(db.select().from(traHangNhap).all()).toHaveLength(0);
    expect(db.select().from(traHangNhapDong).all()).toHaveLength(0);
  });

  it('trả hai lần cộng dồn vượt tổng đã nhập bị từ chối ở lần thứ hai, lần đầu vẫn giữ nguyên', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId, dongId } = nhapHoanThanh('cn-1');
    const loId = loNgamDinhCua('sp-1');

    taoPhieuTraHangNhap(db, {
      id: 'thn-1',
      phieuNhapId: phieuId,
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 60 }],
    });
    expect(tonDem(loId, 'cn-1')).toBe(40);

    expect(() =>
      taoPhieuTraHangNhap(db, {
        id: 'thn-2',
        phieuNhapId: phieuId,
        thoiGian: '2026-09-22T09:00:00.000Z',
        dong: [{ id: 'thnd-2', phieuNhapDongId: dongId, soLuong: 50 }],
      }),
    ).toThrow(VuotSoLuongDaNhapError);

    expect(tonDem(loId, 'cn-1')).toBe(40);
    expect(db.select().from(traHangNhap).where(eq(traHangNhap.id, 'thn-2')).all()).toHaveLength(0);
  });

  it('trả vượt tồn hiện có của đúng lô đó (đã bán/xuất bớt từ lúc nhập) bị từ chối, không tự lấy bù từ lô khác', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId, dongId } = nhapHoanThanh('cn-1');
    const loId = loNgamDinhCua('sp-1');

    // Xuất huỷ 90/100 — còn tồn 10, nhưng "đã nhập" vẫn là 100 nên còn trả
    // được tối đa theo SỐ LƯỢNG ĐÃ NHẬP là 100 (chưa trả lần nào).
    taoPhieuXuatHuy(db, {
      id: 'pxh-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Hết hạn sử dụng',
      nguoiThucHien: 'Dược sĩ Lan',
      thoiGian: '2026-09-21T08:00:00.000Z',
      dong: [{ id: 'pxhd-1', loId, soLuong: 90 }],
    });
    expect(tonDem(loId, 'cn-1')).toBe(10);

    expect(() =>
      taoPhieuTraHangNhap(db, {
        id: 'thn-1',
        phieuNhapId: phieuId,
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 20 }],
      }),
    ).toThrow(KhongDuTonKhoError);

    expect(tonDem(loId, 'cn-1')).toBe(10);
    expect(db.select().from(traHangNhap).all()).toHaveLength(0);
  });

  it('chạy cùng kịch bản nhập + trả ở chế độ phẳng (lô ngầm định) và có lô thật cho cùng số dư cuối (SPEC.md §9 bất biến 6)', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-phang', 'SPPHANG');
    taoSanPham('sp-lo', 'SPLO');

    const phang = nhapHoanThanh('cn-1', { sanPhamId: 'sp-phang', heSo: 12, donGia: 17_000, soLuong: 3 }, 'pn-phang', 'pnd-phang');
    const loThat = nhapHoanThanh(
      'cn-1',
      { sanPhamId: 'sp-lo', heSo: 12, donGia: 17_000, soLuong: 3, soLo: 'L001', hsd: '2027-01-01' },
      'pn-lo',
      'pnd-lo',
    );

    const loPhang = loNgamDinhCua('sp-phang');
    const loLo = loThatCua('sp-lo', 'L001', '2027-01-01');

    taoPhieuTraHangNhap(db, {
      id: 'thn-phang',
      phieuNhapId: phang.phieuId,
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thnd-phang', phieuNhapDongId: phang.dongId, soLuong: 10 }],
    });
    taoPhieuTraHangNhap(db, {
      id: 'thn-lo',
      phieuNhapId: loThat.phieuId,
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thnd-lo', phieuNhapDongId: loThat.dongId, soLuong: 10 }],
    });

    expect(tonDem(loPhang, 'cn-1')).toBe(tonDem(loLo, 'cn-1'));
    expect(tonDem(loPhang, 'cn-1')).toBe(26);
  });

  it('số lượng trả bằng 0 bị từ chối', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId, dongId } = nhapHoanThanh('cn-1');

    expect(() =>
      taoPhieuTraHangNhap(db, {
        id: 'thn-1',
        phieuNhapId: phieuId,
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 0 }],
      }),
    ).toThrow(SoLuongKhongHopLeError);
  });

  it('phiếu trả hàng nhập không có dòng nào bị từ chối', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId } = nhapHoanThanh('cn-1');

    expect(() =>
      taoPhieuTraHangNhap(db, { id: 'thn-1', phieuNhapId: phieuId, thoiGian: '2026-09-22T08:00:00.000Z', dong: [] }),
    ).toThrow(DongTraHangNhapRongError);
  });

  it('phiếu nhập gốc không tồn tại bị từ chối', () => {
    taoChiNhanh('cn-1');

    expect(() =>
      taoPhieuTraHangNhap(db, {
        id: 'thn-1',
        phieuNhapId: 'pn-khong-ton-tai',
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thnd-1', phieuNhapDongId: 'pnd-1', soLuong: 1 }],
      }),
    ).toThrow(PhieuNhapKhongTonTaiError);
  });

  it('phiếu nhập còn ở trạng thái lưu tạm (chưa hoàn thành) bị từ chối, vì chưa từng ghi kho', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    taoPhieuNhap(db, {
      id: 'pn-tam',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-20T07:00:00.000Z',
      dong: [{ id: 'pnd-tam', sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 50 }],
    });

    expect(() =>
      taoPhieuTraHangNhap(db, {
        id: 'thn-1',
        phieuNhapId: 'pn-tam',
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thnd-1', phieuNhapDongId: 'pnd-tam', soLuong: 1 }],
      }),
    ).toThrow(PhieuNhapChuaHoanThanhError);
  });

  it('dòng phiếu nhập không thuộc phiếu đã khai bị từ chối', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    taoSanPham('sp-2', 'SP002');
    const { dongId } = nhapHoanThanh('cn-1', {}, 'pn-1', 'pnd-1');
    const { phieuId: phieuId2 } = nhapHoanThanh('cn-1', { sanPhamId: 'sp-2' }, 'pn-2', 'pnd-2');

    expect(() =>
      taoPhieuTraHangNhap(db, {
        id: 'thn-1',
        phieuNhapId: phieuId2,
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 1 }],
      }),
    ).toThrow(PhieuNhapDongKhongThuocPhieuError);
  });

  it('mã trả hàng nhập tự sinh tuần tự THN000001, THN000002', () => {
    taoChiNhanh('cn-1');
    taoSanPham('sp-1', 'SP001');
    const { phieuId, dongId } = nhapHoanThanh('cn-1');

    const thn1 = taoPhieuTraHangNhap(db, {
      id: 'thn-1',
      phieuNhapId: phieuId,
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thnd-1', phieuNhapDongId: dongId, soLuong: 1 }],
    });
    const thn2 = taoPhieuTraHangNhap(db, {
      id: 'thn-2',
      phieuNhapId: phieuId,
      thoiGian: '2026-09-22T09:00:00.000Z',
      dong: [{ id: 'thnd-2', phieuNhapDongId: dongId, soLuong: 1 }],
    });

    expect(thn1.ma).toBe('THN000001');
    expect(thn2.ma).toBe('THN000002');
  });
});
