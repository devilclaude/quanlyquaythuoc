import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { VaiTro } from '../../../shared/hop-dong/auth';
import { DanhSachNguoiDungResSchema, type NguoiDungQuanLyRes } from '../../../shared/hop-dong/nguoi-dung';
import { BadgeTrangThai, Bang, Nut, TruongNhap } from '../../thanh-phan';
import { nhanVaiTro } from '../../xac-thuc/vai-tro';
import './QuanLyNguoiDung.css';

interface GiaTriForm {
  tenDangNhap: string;
  tenHienThi: string;
  matKhau: string;
  vaiTro: VaiTro;
}

const FORM_RONG: GiaTriForm = { tenDangNhap: '', tenHienThi: '', matKhau: '', vaiTro: 'NHAN_VIEN' };

async function docThongBaoLoi(res: Response, macDinh: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    return (json as { loi?: string } | undefined)?.loi ?? macDinh;
  } catch {
    return macDinh;
  }
}

interface KhoiBangProps {
  danhSach: NguoiDungQuanLyRes[];
  nguoiHienTaiId: string;
  loi: string | undefined;
  idDatLaiDangMo: string | undefined;
  matKhauMoi: string;
  dangXuLy: boolean;
  onDoiMatKhauMoi: (giaTri: string) => void;
  onKhoaHoacMo: (nguoi: NguoiDungQuanLyRes) => void;
  onMoDatLai: (id: string | undefined) => void;
  onLuuDatLai: () => void;
}

/** Phần hiển thị thuần của bảng người dùng — test bằng `renderToStaticMarkup`. */
export function KhoiBangNguoiDung(props: KhoiBangProps) {
  const { danhSach, nguoiHienTaiId, loi, idDatLaiDangMo, matKhauMoi, dangXuLy } = props;
  return (
    <section className="quan-ly-nguoi-dung">
      <h2 className="quan-ly-nguoi-dung__tieu-de">Người dùng</h2>
      {loi ? (
        <p className="quan-ly-nguoi-dung__loi" role="alert">
          {loi}
        </p>
      ) : null}
      <Bang>
        <thead>
          <tr>
            <th>Tên đăng nhập</th>
            <th>Tên hiển thị</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {danhSach.length === 0 ? (
            <tr>
              <td colSpan={5}>Chưa có người dùng</td>
            </tr>
          ) : (
            danhSach.map((nguoi) => (
              <tr key={nguoi.id}>
                <td>{nguoi.tenDangNhap}</td>
                <td>{nguoi.tenHienThi}</td>
                <td>{nhanVaiTro(nguoi.vaiTro)}</td>
                <td>
                  <BadgeTrangThai mau={nguoi.hoatDong ? 'tot' : 'nguy'}>
                    {nguoi.hoatDong ? 'Hoạt động' : 'Đã khoá'}
                  </BadgeTrangThai>
                </td>
                <td>
                  <div className="quan-ly-nguoi-dung__thao-tac">
                    {nguoi.id === nguoiHienTaiId ? null : (
                      <Nut bienThe="phu" disabled={dangXuLy} onClick={() => props.onKhoaHoacMo(nguoi)}>
                        {nguoi.hoatDong ? 'Khoá' : 'Mở khoá'}
                      </Nut>
                    )}
                    <Nut
                      bienThe="phu"
                      disabled={dangXuLy}
                      onClick={() => props.onMoDatLai(idDatLaiDangMo === nguoi.id ? undefined : nguoi.id)}
                    >
                      Đặt lại mật khẩu
                    </Nut>
                  </div>
                  {idDatLaiDangMo === nguoi.id ? (
                    <div className="quan-ly-nguoi-dung__dat-lai">
                      <TruongNhap
                        kieu="mat-khau"
                        aria-label="Mật khẩu mới"
                        placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                        autoComplete="new-password"
                        value={matKhauMoi}
                        onChange={(e) => props.onDoiMatKhauMoi(e.target.value)}
                      />
                      <Nut disabled={dangXuLy || matKhauMoi.length === 0} onClick={props.onLuuDatLai}>
                        Lưu
                      </Nut>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Bang>
    </section>
  );
}

interface KhoiThemProps {
  giaTri: GiaTriForm;
  dangXuLy: boolean;
  onDoi: <K extends keyof GiaTriForm>(truong: K, giaTri: GiaTriForm[K]) => void;
  onThem: () => void;
}

export function KhoiThemNguoiDung({ giaTri, dangXuLy, onDoi, onThem }: KhoiThemProps) {
  function gui(e: FormEvent) {
    e.preventDefault();
    onThem();
  }
  return (
    <form className="quan-ly-nguoi-dung__them" onSubmit={gui}>
      <h3 className="quan-ly-nguoi-dung__tieu-de-phu">Thêm người dùng</h3>
      <div className="quan-ly-nguoi-dung__luoi">
        <TruongNhap
          nhan="Tên đăng nhập"
          autoComplete="off"
          value={giaTri.tenDangNhap}
          onChange={(e) => onDoi('tenDangNhap', e.target.value)}
          required
        />
        <TruongNhap
          nhan="Tên hiển thị"
          autoComplete="off"
          value={giaTri.tenHienThi}
          onChange={(e) => onDoi('tenHienThi', e.target.value)}
          required
        />
        <TruongNhap
          nhan="Mật khẩu"
          kieu="mat-khau"
          autoComplete="new-password"
          value={giaTri.matKhau}
          onChange={(e) => onDoi('matKhau', e.target.value)}
          required
        />
        <div className="truong-nhap">
          <label className="truong-nhap__nhan" htmlFor="vai-tro-moi">
            Vai trò
          </label>
          <select
            id="vai-tro-moi"
            className="truong-nhap__o"
            value={giaTri.vaiTro}
            onChange={(e) => onDoi('vaiTro', e.target.value === 'ADMIN' ? 'ADMIN' : 'NHAN_VIEN')}
          >
            <option value="NHAN_VIEN">Nhân viên</option>
            <option value="ADMIN">Quản trị</option>
          </select>
        </div>
      </div>
      <Nut type="submit" disabled={dangXuLy}>
        Thêm người dùng
      </Nut>
    </form>
  );
}

/** Container: tải danh sách, thêm, khoá/mở, đặt lại mật khẩu. Quyền thật do máy chủ cưỡng chế. */
export function QuanLyNguoiDung({ nguoiHienTaiId }: { nguoiHienTaiId: string }) {
  const [danhSach, setDanhSach] = useState<NguoiDungQuanLyRes[] | undefined>(undefined);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [form, setForm] = useState<GiaTriForm>(FORM_RONG);
  const [idDatLaiDangMo, setIdDatLaiDangMo] = useState<string | undefined>(undefined);
  const [matKhauMoi, setMatKhauMoi] = useState('');

  const taiLai = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/nguoi-dung');
      if (!res.ok) throw new Error(await docThongBaoLoi(res, 'Không tải được danh sách người dùng'));
      setDanhSach(DanhSachNguoiDungResSchema.parse(await res.json()).duLieu);
    } catch (err: unknown) {
      setLoi(err instanceof Error ? err.message : 'Không tải được danh sách người dùng');
    }
  }, []);

  useEffect(() => {
    void taiLai();
  }, [taiLai]);

  /** Chạy một thao tác ghi: khoá nút trong lúc chờ, báo lỗi máy chủ, rồi tải lại danh sách. */
  async function chay(thaoTac: () => Promise<Response>, loiMacDinh: string): Promise<boolean> {
    setDangXuLy(true);
    setLoi(undefined);
    try {
      const res = await thaoTac();
      if (!res.ok) {
        setLoi(await docThongBaoLoi(res, loiMacDinh));
        return false;
      }
      await taiLai();
      return true;
    } catch {
      setLoi('Không kết nối được máy chủ');
      return false;
    } finally {
      setDangXuLy(false);
    }
  }

  const guiJson = (url: string, phuongThuc: string, body: unknown) =>
    fetch(url, { method: phuongThuc, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  async function them() {
    const thanhCong = await chay(() => guiJson('/api/nguoi-dung', 'POST', form), 'Không thêm được người dùng');
    if (thanhCong) setForm(FORM_RONG);
  }

  function khoaHoacMo(nguoi: NguoiDungQuanLyRes) {
    void chay(
      () => guiJson(`/api/nguoi-dung/${encodeURIComponent(nguoi.id)}`, 'PUT', { hoatDong: !nguoi.hoatDong }),
      'Không đổi được trạng thái',
    );
  }

  async function luuDatLai() {
    if (!idDatLaiDangMo) return;
    const thanhCong = await chay(
      () => guiJson(`/api/nguoi-dung/${encodeURIComponent(idDatLaiDangMo)}/dat-lai-mat-khau`, 'POST', { matKhau: matKhauMoi }),
      'Không đặt lại được mật khẩu',
    );
    if (thanhCong) {
      setIdDatLaiDangMo(undefined);
      setMatKhauMoi('');
    }
  }

  if (!danhSach) return loi ? <p className="quan-ly-nguoi-dung__loi">{loi}</p> : <p>Đang tải…</p>;

  return (
    <>
      <KhoiBangNguoiDung
        danhSach={danhSach}
        nguoiHienTaiId={nguoiHienTaiId}
        loi={loi}
        idDatLaiDangMo={idDatLaiDangMo}
        matKhauMoi={matKhauMoi}
        dangXuLy={dangXuLy}
        onDoiMatKhauMoi={setMatKhauMoi}
        onKhoaHoacMo={khoaHoacMo}
        onMoDatLai={(id) => {
          setIdDatLaiDangMo(id);
          setMatKhauMoi('');
        }}
        onLuuDatLai={() => void luuDatLai()}
      />
      <KhoiThemNguoiDung
        giaTri={form}
        dangXuLy={dangXuLy}
        onDoi={(truong, giaTri) => setForm((cu) => ({ ...cu, [truong]: giaTri }))}
        onThem={() => void them()}
      />
    </>
  );
}
