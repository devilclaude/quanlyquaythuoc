import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { nguoiDung, phien } from '../db/schema';

type Db = ReturnType<typeof drizzle>;

export const THOI_HAN_PHIEN_MS = 30 * 24 * 60 * 60 * 1000;
// Chỉ ghi lại hạn mới khi đã tiêu hơn 1 ngày, để không ghi DB ở mọi request.
const NGUONG_GIA_HAN_MS = 24 * 60 * 60 * 1000;

function bamMaPhien(maPhien: string): string {
  return createHash('sha256').update(maPhien).digest('hex');
}

/** `bay` = mili-giây epoch hiện tại, truyền vào để test không phụ thuộc đồng hồ. */
export function taoPhien(db: Db, nguoiDungId: string, bay: number): { maPhien: string; hetHan: string } {
  const maPhien = randomBytes(32).toString('base64url');
  const hetHan = new Date(bay + THOI_HAN_PHIEN_MS).toISOString();
  db.insert(phien).values({ idBam: bamMaPhien(maPhien), nguoiDungId, hetHan }).run();
  return { maPhien, hetHan };
}

export function docPhien(db: Db, maPhien: string, bay: number): NguoiDungHienTai | undefined {
  const idBam = bamMaPhien(maPhien);
  const hang = db
    .select({
      hetHan: phien.hetHan,
      id: nguoiDung.id,
      tenDangNhap: nguoiDung.tenDangNhap,
      tenHienThi: nguoiDung.tenHienThi,
      vaiTro: nguoiDung.vaiTro,
    })
    .from(phien)
    .innerJoin(nguoiDung, and(eq(nguoiDung.id, phien.nguoiDungId), eq(nguoiDung.hoatDong, true)))
    .where(eq(phien.idBam, idBam))
    .get();
  if (!hang) return undefined;

  const hetHanMs = Date.parse(hang.hetHan);
  if (hetHanMs <= bay) {
    db.delete(phien).where(eq(phien.idBam, idBam)).run();
    return undefined;
  }

  if (hetHanMs - bay < THOI_HAN_PHIEN_MS - NGUONG_GIA_HAN_MS) {
    db.update(phien)
      .set({ hetHan: new Date(bay + THOI_HAN_PHIEN_MS).toISOString() })
      .where(eq(phien.idBam, idBam))
      .run();
  }

  return { id: hang.id, tenDangNhap: hang.tenDangNhap, tenHienThi: hang.tenHienThi, vaiTro: hang.vaiTro };
}

export function xoaPhien(db: Db, maPhien: string): void {
  db.delete(phien).where(eq(phien.idBam, bamMaPhien(maPhien))).run();
}

export function xoaMoiPhienCua(db: Db, nguoiDungId: string): void {
  db.delete(phien).where(eq(phien.nguoiDungId, nguoiDungId)).run();
}
