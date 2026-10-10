export interface GioiHanDangNhap {
  kiemTra(khoa: string, bay: number): { duocPhep: true } | { duocPhep: false; thuLaiSauGiay: number };
  ghiThatBai(khoa: string, bay: number): void;
  xoa(khoa: string): void;
}

/**
 * Chặn dò mật khẩu: quá `toiDa` lần sai trong `cuaSoMs` thì từ chối cho tới khi lần
 * sai sớm nhất rời khỏi cửa sổ. Khoá là "tenDangNhap|ip" — khoá theo riêng tên sẽ cho
 * kẻ lạ khoá người thật. Lưu trong bộ nhớ: khởi động lại thì đặt lại, chấp nhận được.
 */
export function taoGioiHanDangNhap(tuyChon: { toiDa?: number; cuaSoMs?: number } = {}): GioiHanDangNhap {
  const toiDa = tuyChon.toiDa ?? 5;
  const cuaSoMs = tuyChon.cuaSoMs ?? 15 * 60 * 1000;
  const thatBai = new Map<string, number[]>();

  function conTrongCuaSo(khoa: string, bay: number): number[] {
    const con = (thatBai.get(khoa) ?? []).filter((t) => bay - t < cuaSoMs);
    if (con.length === 0) thatBai.delete(khoa);
    else thatBai.set(khoa, con);
    return con;
  }

  return {
    kiemTra(khoa, bay) {
      const con = conTrongCuaSo(khoa, bay);
      if (con.length < toiDa) return { duocPhep: true };
      const somNhat = con[0] ?? bay;
      return { duocPhep: false, thuLaiSauGiay: Math.ceil((somNhat + cuaSoMs - bay) / 1000) };
    },
    ghiThatBai(khoa, bay) {
      const con = conTrongCuaSo(khoa, bay);
      con.push(bay);
      thatBai.set(khoa, con);
    },
    xoa(khoa) {
      thatBai.delete(khoa);
    },
  };
}
