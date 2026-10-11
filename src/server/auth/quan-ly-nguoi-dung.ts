import { and, asc, eq, ne } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { VaiTro } from '../../shared/hop-dong/auth';
import { nguoiDung } from '../db/schema';
import { bamMatKhau } from './mat-khau';
import { MAT_KHAU_TOI_THIEU, MatKhauQuaNganError } from './nguoi-dung';
import { type DbHoacTx, xoaMoiPhienCua } from './phien';

type Db = ReturnType<typeof drizzle>;

export interface NguoiDungQuanLy {
  id: string;
  tenDangNhap: string;
  tenHienThi: string;
  vaiTro: VaiTro;
  hoatDong: boolean;
  ngayTao: string;
}

export class NguoiDungKhongTonTaiError extends Error {
  constructor(public readonly id: string) {
    super(`Không tìm thấy người dùng ${id}`);
    this.name = 'NguoiDungKhongTonTaiError';
  }
}

export class KhongTuThayDoiMinhError extends Error {
  constructor() {
    super('Không thể tự khoá hoặc tự đổi vai trò của chính mình');
    this.name = 'KhongTuThayDoiMinhError';
  }
}

export class PhaiConAdminError extends Error {
  constructor() {
    super('Phải còn ít nhất một quản trị viên đang hoạt động');
    this.name = 'PhaiConAdminError';
  }
}

const COT_QUAN_LY = {
  id: nguoiDung.id,
  tenDangNhap: nguoiDung.tenDangNhap,
  tenHienThi: nguoiDung.tenHienThi,
  vaiTro: nguoiDung.vaiTro,
  hoatDong: nguoiDung.hoatDong,
  ngayTao: nguoiDung.ngayTao,
};

/** Chọn tường minh các cột: `mat_khau_bam` không bao giờ đi ra khỏi lớp này. */
export function layDanhSachNguoiDung(db: Db): NguoiDungQuanLy[] {
  return db.select(COT_QUAN_LY).from(nguoiDung).orderBy(asc(nguoiDung.ngayTao), asc(nguoiDung.tenDangNhap)).all();
}

function timTheoId(db: DbHoacTx, id: string): NguoiDungQuanLy | undefined {
  return db.select(COT_QUAN_LY).from(nguoiDung).where(eq(nguoiDung.id, id)).get();
}

export function capNhatNguoiDung(
  db: Db,
  nguoiThucHienId: string,
  id: string,
  thayDoi: { tenHienThi?: string; vaiTro?: VaiTro; hoatDong?: boolean },
): NguoiDungQuanLy {
  return db.transaction((tx) => {
    const hienTai = timTheoId(tx, id);
    if (!hienTai) throw new NguoiDungKhongTonTaiError(id);

    const vaiTroMoi = thayDoi.vaiTro ?? hienTai.vaiTro;
    const hoatDongMoi = thayDoi.hoatDong ?? hienTai.hoatDong;
    const doiQuyenHoacTrangThai = vaiTroMoi !== hienTai.vaiTro || hoatDongMoi !== hienTai.hoatDong;

    if (id === nguoiThucHienId && doiQuyenHoacTrangThai) throw new KhongTuThayDoiMinhError();

    const dangLaAdminHoatDong = hienTai.vaiTro === 'ADMIN' && hienTai.hoatDong;
    const seConLaAdminHoatDong = vaiTroMoi === 'ADMIN' && hoatDongMoi;
    if (dangLaAdminHoatDong && !seConLaAdminHoatDong) {
      const conLai = tx
        .select({ id: nguoiDung.id })
        .from(nguoiDung)
        .where(and(eq(nguoiDung.vaiTro, 'ADMIN'), eq(nguoiDung.hoatDong, true), ne(nguoiDung.id, id)))
        .all();
      if (conLai.length === 0) throw new PhaiConAdminError();
    }

    tx.update(nguoiDung)
      .set({
        tenHienThi: thayDoi.tenHienThi !== undefined ? thayDoi.tenHienThi.trim() || hienTai.tenHienThi : hienTai.tenHienThi,
        vaiTro: vaiTroMoi,
        hoatDong: hoatDongMoi,
      })
      .where(eq(nguoiDung.id, id))
      .run();

    // Quyền/trạng thái đổi thì phiên cũ không còn đúng: huỷ để buộc đăng nhập lại.
    if (doiQuyenHoacTrangThai) xoaMoiPhienCua(tx, id);

    const moi = timTheoId(tx, id);
    if (!moi) throw new NguoiDungKhongTonTaiError(id);
    return moi;
  });
}

export function datLaiMatKhau(db: Db, id: string, matKhauMoi: string): void {
  if (!timTheoId(db, id)) throw new NguoiDungKhongTonTaiError(id);
  if (matKhauMoi.length < MAT_KHAU_TOI_THIEU) throw new MatKhauQuaNganError();

  db.transaction((tx) => {
    tx.update(nguoiDung).set({ matKhauBam: bamMatKhau(matKhauMoi) }).where(eq(nguoiDung.id, id)).run();
    xoaMoiPhienCua(tx, id);
  });
}
